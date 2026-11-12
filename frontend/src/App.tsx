import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { Header } from "./components/Header";
import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { DotMatrixHandsCanvas } from "./components/DotMatrixHandsCanvas";
import { ExplanatorySection } from "./components/ExplanatorySection";
import { GoldVignettes } from "./components/GoldVignettes";
import { DocumentDropzone } from "./components/DocumentDropzone";
import { NoteEditor } from "./components/NoteEditor";
import { MentionReviewer } from "./components/MentionReviewer";
import { CandidateList } from "./components/CandidateList";
import { EvidenceGraphView } from "./components/EvidenceGraphView";
import BlurText from "./components/reactbits/BlurText/BlurText";
import { initSmoothScroll } from "./lib/motion";
import { runPaintSplashThemeTransition } from "./lib/paintSplats";
import { fetchHealth, extractPhenotypes, rankMatches } from "./lib/api";
import { GOLD_CASES, type GoldCase } from "./data/goldCases";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type {
  HealthResponse,
  PhenotypeMention,
  ReviewedObservation,
  MatchResponse,
  TermSearchResult,
  Candidate,
} from "./types/api";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Stethoscope,
} from "lucide-react";

function createRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function App() {
  const [currentView, setCurrentView] = useState<"landing" | "workbench">("landing");
  const [workbenchStep, setWorkbenchStep] = useState<"intake" | "review" | "evidence">("intake");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      return window.localStorage.getItem("phenora-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("phenora-theme", theme);
    } catch {
      // Ignore storage errors in sandboxed/private contexts
    }
  }, [theme]);

  const handleToggleTheme = useCallback(
    (e?: MouseEvent<HTMLButtonElement>) => {
      const nextTheme: "light" | "dark" = theme === "dark" ? "light" : "dark";
      let origin: { x: number; y: number } | undefined;
      if (e && e.clientX > 0 && e.clientY > 0) {
        origin = { x: e.clientX, y: e.clientY };
      } else if (e?.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        origin = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      runPaintSplashThemeTransition(() => {
        document.documentElement.setAttribute("data-theme", nextTheme);
        setTheme(nextTheme);
      }, origin);
    },
    [theme]
  );

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [activeCaseId, setActiveCaseId] = useState<string | null>("SYN-PED-002");
  const [noteText, setNoteText] = useState<string>(GOLD_CASES[1].noteText);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [mentions, setMentions] = useState<PhenotypeMention[]>([]);
  const [reviewedObservations, setReviewedObservations] = useState<Map<string, ReviewedObservation>>(new Map());

  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const checkHealth = async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setHealthError(null);
    } catch (err: any) {
      setHealthError(err.message || "Failed to reach backend");
      setHealth(null);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSwitchView = (view: typeof currentView) => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (view === "landing" && currentView === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentView(view);
  };

  // Mount Lenis smooth scroll + GSAP ticker only on the editorial landing view
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    if (currentView !== "landing") return;

    const destroy = initSmoothScroll();
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const rafId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    });
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pageshow", handlePageShow);
      destroy();
    };
  }, [currentView]);

  // Reset scroll to the top whenever advancing or returning between workbench steps
  useEffect(() => {
    if (currentView !== "workbench") return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [currentView, workbenchStep]);

  const handleSelectCase = (c: GoldCase) => {
    setActiveCaseId(c.id);
    setNoteText(c.noteText);
    setMentions([]);
    setReviewedObservations(new Map());
    setMatchResponse(null);
    setSelectedCandidateId(null);
    setWorkbenchStep("intake");
    showToast("info", `Loaded ${c.name} into editor`);
  };

  const handleTextExtracted = (text: string, filename: string) => {
    setActiveCaseId(null);
    setNoteText(text);
    setMentions([]);
    setReviewedObservations(new Map());
    setMatchResponse(null);
    setSelectedCandidateId(null);
    setWorkbenchStep("intake");
    showToast("success", `Extracted text from ${filename} in RAM`);
  };

  const handleRunFullAnalysis = async (customText?: string) => {
    const textToAnalyze = (customText !== undefined ? customText : noteText).trim();
    if (!textToAnalyze) return;

    setIsExtracting(true);
    setIsMatching(true);
    setWorkbenchStep("evidence");

    try {
      const response = await extractPhenotypes(textToAnalyze);
      setMentions(response.mentions);

      const obsMap = new Map<string, ReviewedObservation>();
      const confirmedList: ReviewedObservation[] = [];

      response.mentions.forEach((m) => {
        const topHpo = m.hpo_candidates[0]?.hpo_id || "HP:0000001";
        const isPresent = m.polarity === "present" && m.experiencer === "patient";
        const status = isPresent ? "confirmed" : "rejected";

        const obs: ReviewedObservation = {
          observation_id: createRandomId(),
          hpo_id: topHpo,
          polarity: m.polarity,
          temporality: m.temporality,
          experiencer: m.experiencer,
          onset_age_group: m.onset_age_group,
          review_status: status,
          source_mention_ids: [m.mention_id],
        };
        obsMap.set(m.mention_id, obs);
        if (status === "confirmed") {
          confirmedList.push(obs);
        }
      });

      setReviewedObservations(obsMap);
      setIsExtracting(false);

      if (confirmedList.length > 0) {
        const matchResult = await rankMatches(confirmedList, 10);
        setMatchResponse(matchResult);
        if (matchResult.candidates.length > 0) {
          setSelectedCandidateId(matchResult.candidates[0].disease_id);
        }
        setWorkbenchStep("evidence");
        showToast("success", `Ordered ${matchResult.candidates.length} candidate conditions`);
      }
    } catch (err: any) {
      showToast("error", err.message || "Analysis failed");
    } finally {
      setIsExtracting(false);
      setIsMatching(false);
    }
  };

  const handleExtract = async () => {
    if (!noteText.trim()) return;

    setIsExtracting(true);
    setMatchResponse(null);
    setSelectedCandidateId(null);

    try {
      const response = await extractPhenotypes(noteText.trim());
      setMentions(response.mentions);

      const initialMap = new Map<string, ReviewedObservation>();
      response.mentions.forEach((m) => {
        const topHpo = m.hpo_candidates[0]?.hpo_id || "HP:0000001";
        initialMap.set(m.mention_id, {
          observation_id: createRandomId(),
          hpo_id: topHpo,
          polarity: m.polarity,
          temporality: m.temporality,
          experiencer: m.experiencer,
          onset_age_group: m.onset_age_group,
          review_status: m.polarity === "present" ? "confirmed" : "rejected",
          source_mention_ids: [m.mention_id],
        });
      });

      setReviewedObservations(initialMap);
      setWorkbenchStep("review");
      showToast("success", `Extracted ${response.mentions.length} phenotype mentions`);
    } catch (err: any) {
      showToast("error", err.message || "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleConfirm = (mentionId: string) => {
    setReviewedObservations((prev) => {
      const next = new Map(prev);
      const curr = next.get(mentionId);
      if (curr) {
        next.set(mentionId, {
          ...curr,
          review_status: curr.review_status === "confirmed" ? "rejected" : "confirmed",
        });
      }
      return next;
    });
  };

  const handleUpdateObservation = (mentionId: string, update: Partial<ReviewedObservation>) => {
    setReviewedObservations((prev) => {
      const next = new Map(prev);
      const curr = next.get(mentionId);
      if (curr) {
        next.set(mentionId, { ...curr, ...update });
      }
      return next;
    });
  };

  const handleAddManualFinding = (term: TermSearchResult) => {
    const manualId = `manual_${createRandomId()}`;
    const newMention: PhenotypeMention = {
      mention_id: manualId,
      source_span: { quote: term.label, start: 0, end: term.label.length },
      polarity: "present",
      temporality: "current",
      experiencer: "patient",
      onset_age_group: "unknown",
      resolver_status: "exact",
      hpo_candidates: [term],
    };

    setMentions((prev) => [newMention, ...prev]);
    setReviewedObservations((prev) => {
      const next = new Map(prev);
      next.set(manualId, {
        observation_id: createRandomId(),
        hpo_id: term.hpo_id,
        polarity: "present",
        temporality: "current",
        experiencer: "patient",
        onset_age_group: "unknown",
        review_status: "confirmed",
        source_mention_ids: [manualId],
      });
      return next;
    });
    showToast("info", `Added ${term.label} (${term.hpo_id}) to findings`);
  };

  const handleAttestAndMatch = async () => {
    const confirmedList: ReviewedObservation[] = [];
    reviewedObservations.forEach((obs) => {
      if (obs.review_status === "confirmed") {
        confirmedList.push(obs);
      }
    });

    if (confirmedList.length === 0) {
      showToast("error", "Please confirm at least one observation before matching.");
      return;
    }

    setIsMatching(true);
    try {
      const result = await rankMatches(confirmedList, 10);
      setMatchResponse(result);
      if (result.candidates.length > 0) {
        setSelectedCandidateId(result.candidates[0].disease_id);
      }
      setWorkbenchStep("evidence");
      showToast("success", `Ordered ${result.candidates.length} candidates by phenotype evidence`);
    } catch (err: any) {
      showToast("error", err.message || "Matching failed");
    } finally {
      setIsMatching(false);
    }
  };

  const handleResetSession = () => {
    setActiveCaseId(null);
    setNoteText("");
    setMentions([]);
    setReviewedObservations(new Map());
    setMatchResponse(null);
    setSelectedCandidateId(null);
    setWorkbenchStep("intake");
    showToast("info", "Session buffer wiped cleanly from RAM");
  };

  const selectedCandidate: Candidate | null =
    matchResponse?.candidates.find((c) => c.disease_id === selectedCandidateId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f5] text-[#111] dark:bg-[#0c0c0b] dark:text-[#f3f3ee] font-sans selection:bg-[#111] selection:text-[#f7f7f5] dark:selection:bg-[#f3f3ee] dark:selection:text-[#111] transition-colors duration-200">
      <Header
        health={health}
        healthError={healthError}
        onRefreshHealth={checkHealth}
        onResetSession={handleResetSession}
        currentView={currentView}
        onSwitchView={handleSwitchView}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <ErrorBoundary>
      {currentView === "landing" ? (
        <div className="flex flex-col flex-1">
          {/* Hero Section with Live Dot-Matrix Hands Canvas */}
          <section className="relative min-h-[580px] sm:h-[calc(100vh-64px)] sm:max-h-[840px] flex flex-col justify-between overflow-hidden border-b border-[#e5e5e0] dark:border-[#2a2a26]">
            {/* Soft clinical radial atmosphere behind dot-matrix hands (zero neon slop) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  theme === "dark"
                    ? "radial-gradient(62% 52% at 50% 34%, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.06) 52%, transparent 80%)"
                    : "radial-gradient(64% 54% at 50% 32%, rgba(13, 148, 136, 0.10), rgba(37, 99, 235, 0.05) 54%, transparent 82%)",
              }}
            />

            <DotMatrixHandsCanvas
              theme={theme}
              className="absolute inset-0 w-full h-full pointer-events-none z-1"
            />

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:pb-24 max-w-4xl mx-auto pointer-events-auto">
              <div role="heading" aria-level={1} className="mb-3.5">
                <span className="block text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.025em] leading-[1.1] text-[#6d6d65] dark:text-[#a1a196]">
                  Clinical notes traced to
                </span>
                <BlurText
                  text="rare disease evidence."
                  trigger="load"
                  delay={35}
                  stepDuration={0.26}
                  blur={5}
                  distance={12}
                  animationFrom={{ filter: "blur(5px)", opacity: 0.35, y: 10 }}
                  className="justify-center text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.06] text-teal-800 dark:text-teal-300 mt-1"
                />
              </div>

              <p className="max-w-md mx-auto text-sm sm:text-base text-[#55554f] dark:text-[#c7c7be] leading-relaxed mb-6">
                Phenora extracts patient findings in volatile RAM and traces deterministic HPO ancestry offline.
              </p>

              <div className="flex items-center gap-3.5 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView("workbench");
                    if (!matchResponse && !isExtracting) {
                      handleRunFullAnalysis();
                    }
                  }}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-[#042f2e] text-sm font-semibold shadow-sm btn-press hover-lift cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-teal-100 dark:text-[#042f2e]" />
                  <span>Open clinical workbench</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("why-phenora");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-lg bg-white hover:bg-[#efefeb] text-[#111] border border-[#e5e5e0] dark:bg-[#1a1a18] dark:hover:bg-[#242420] dark:text-[#f3f3ee] dark:border-[#2e2e2a] text-sm font-medium btn-press hover-lift cursor-pointer"
                >
                  <span>Read methodology</span>
                  <ChevronDown className="w-4 h-4 text-[#66665f] dark:text-[#a1a196]" />
                </button>
              </div>
            </div>

            <div className="relative z-10 w-full pb-4 px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] sm:text-[11px] text-[#66665f] dark:text-[#a1a196] font-mono">
              <span className="inline-flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-medium whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400" aria-hidden="true" />
                <span>Air-gapped HPO Evidence Engine</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">In-memory Python engine</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">HPO 2026-02-01</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">Zero network egress</span>
            </div>
          </section>

          <ExplanatorySection
            onLaunchWorkbench={() => {
              setCurrentView("workbench");
              if (!matchResponse && !isExtracting) {
                handleRunFullAnalysis();
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-[#f7f7f5] dark:bg-[#0c0c0b] min-w-0">
          <main className="max-w-7xl w-full min-w-0 mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-8 flex flex-col gap-6 sm:gap-7">
            {/* Calm horizontal 3-step progression nav (progressive disclosure) */}
            <nav
              aria-label="Clinical workflow steps"
              className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 pb-5 border-b border-[#e5e5e0] dark:border-[#2a2a26]"
            >
              {[
                {
                  id: "intake" as const,
                  num: "01",
                  label: "Clinical Note",
                  count: null as number | null,
                  enabled: true,
                },
                {
                  id: "review" as const,
                  num: "02",
                  label: "Review Findings",
                  count: mentions.length > 0 ? mentions.length : null,
                  enabled: mentions.length > 0 || reviewedObservations.size > 0,
                },
                {
                  id: "evidence" as const,
                  num: "03",
                  label: "Evidence Graph",
                  count: matchResponse ? matchResponse.candidates.length : null,
                  enabled: matchResponse !== null || isMatching,
                },
              ].map((step) => {
                const isActive = workbenchStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!step.enabled}
                    onClick={() => step.enabled && setWorkbenchStep(step.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                      isActive
                        ? "bg-teal-700 text-white border-teal-700 dark:bg-teal-500 dark:text-[#0c0c0b] dark:border-teal-500 shadow-xs"
                        : step.enabled
                        ? "bg-white dark:bg-[#161614] border-[#deded8] dark:border-[#2e2e2a] text-[#333] dark:text-[#d4d4cc] hover:border-teal-600/50 dark:hover:border-teal-500/50 hover:text-teal-800 dark:hover:text-teal-300"
                        : "bg-transparent border-transparent text-[#9c9c92] dark:text-[#55554e] cursor-not-allowed opacity-70"
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] ${
                        isActive ? "opacity-90" : "opacity-65"
                      }`}
                    >
                      {step.num}
                    </span>
                    <span>{step.label}</span>
                    {step.count !== null && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                          isActive
                            ? "bg-white/20 text-white dark:bg-[#0c0c0b]/20 dark:text-[#0c0c0b]"
                            : "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300"
                        }`}
                      >
                        {step.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {workbenchStep === "intake" && (
              <div className="max-w-3xl mx-auto w-full flex flex-col gap-5">
                <GoldVignettes
                  activeCaseId={activeCaseId}
                  onSelectCase={handleSelectCase}
                />

                <DocumentDropzone onTextExtracted={handleTextExtracted} theme={theme} />

                <NoteEditor
                  noteText={noteText}
                  onChangeText={setNoteText}
                  onExtract={handleExtract}
                  isExtracting={isExtracting}
                  mentions={mentions}
                  onClear={() => setNoteText("")}
                  theme={theme}
                />
              </div>
            )}

            {workbenchStep === "review" && (
              <div className="max-w-6xl mx-auto w-full min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
                <aside className="lg:col-span-4 min-w-0 surface-card p-4 sm:p-5 flex flex-col gap-4 lg:sticky lg:top-20">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#e5e5e0] dark:border-[#2a2a26]">
                    <div>
                      <span className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#77776f] dark:text-[#9c9c92]">
                        Reference text
                      </span>
                      <h2 className="text-sm font-semibold tracking-tight text-[#111] dark:text-[#f3f3ee] mt-0.5">
                        {GOLD_CASES.find((c) => c.id === activeCaseId)?.name || "Clinical note"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkbenchStep("intake")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#deded8] dark:border-[#2e2e2a] text-xs font-medium text-[#444] dark:text-[#ccc] hover:border-teal-600/50 dark:hover:border-teal-500/50 hover:text-teal-800 dark:hover:text-teal-300 transition-colors active:scale-[0.97]"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit note</span>
                    </button>
                  </div>

                  <p className="text-[13px] leading-relaxed text-[#44443e] dark:text-[#c7c7be] whitespace-pre-wrap max-h-[380px] overflow-y-auto pr-1 m-0">
                    {noteText}
                  </p>
                </aside>

                <div className="lg:col-span-8 min-w-0">
                  <MentionReviewer
                    mentions={mentions}
                    reviewedObservations={reviewedObservations}
                    onToggleConfirm={handleToggleConfirm}
                    onUpdateObservation={handleUpdateObservation}
                    onAddManualFinding={handleAddManualFinding}
                    onAttestAndMatch={handleAttestAndMatch}
                    isMatching={isMatching}
                    theme={theme}
                  />
                </div>
              </div>
            )}

            {workbenchStep === "evidence" && (
              <div className="w-full flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#111] dark:text-[#f3f3ee] m-0">
                      Candidate syndromes &amp; HPO evidence graph
                    </h2>
                    <p className="text-xs text-[#55554f] dark:text-[#b2b2a7] mt-1 m-0">
                      Semantic similarity computed through Most Informative Common Ancestors (MICA) across Human Phenotype Ontology terms.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWorkbenchStep("review")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#deded8] dark:border-[#2e2e2a] bg-white dark:bg-[#161614] text-xs font-medium text-[#333] dark:text-[#d4d4cc] hover:border-teal-600/50 dark:hover:border-teal-500/50 hover:text-teal-800 dark:hover:text-teal-300 transition-colors active:scale-[0.97]"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Review findings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkbenchStep("intake")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#deded8] dark:border-[#2e2e2a] bg-white dark:bg-[#161614] text-xs font-medium text-[#555] dark:text-[#b2b2a7] hover:text-[#111] dark:hover:text-[#f3f3ee] transition-colors active:scale-[0.97]"
                    >
                      <span>Edit note</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-stretch">
                  <div className="lg:col-span-4 min-w-0">
                    <CandidateList
                      candidates={matchResponse?.candidates || []}
                      selectedCandidateId={selectedCandidateId}
                      onSelectCandidate={setSelectedCandidateId}
                    />
                  </div>

                  <div className="lg:col-span-8 min-w-0 min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]">
                    <EvidenceGraphView
                      graph={matchResponse?.graph || { nodes: [], edges: [] }}
                      selectedCandidate={selectedCandidate}
                      selectedCandidateId={selectedCandidateId}
                      excludedObservations={matchResponse?.excluded_observations || []}
                      isMatching={isMatching}
                      theme={theme}
                      onNodeClick={(nodeId) => {
                        const diseaseNode = matchResponse?.graph.nodes.find(
                          (n) => n.id === nodeId && n.disease_id
                        );
                        if (diseaseNode?.disease_id) {
                          setSelectedCandidateId(diseaseNode.disease_id);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
      </ErrorBoundary>

      <footer className="mt-auto">
        <DisclaimerBanner />
      </footer>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="modal-enter fixed bottom-3 inset-x-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-sm z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-lg backdrop-blur-md text-xs font-mono bg-[#111] text-white border-[#2e2e2a] dark:bg-[#1e1e1b] dark:text-[#f3f3ee] dark:border-[#3c3c34]"
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
