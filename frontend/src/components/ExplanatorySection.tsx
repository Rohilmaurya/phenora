import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check } from "lucide-react";
import CountUp from "./reactbits/CountUp/CountUp";
import { MOTION_DURATION, MOTION_EASE, prefersReducedMotion } from "../lib/motion";

gsap.registerPlugin(ScrollTrigger);

interface ExplanatorySectionProps {
  onLaunchWorkbench: () => void;
}

const BENCHMARKS = [
  {
    num: 5.6,
    decimals: 1,
    suffix: " yrs",
    numClass: "text-amber-700 dark:text-amber-400",
    dotClass: "bg-amber-500",
    title: "Average rare disease odyssey",
    detail:
      "Delayed recognition keeps children cycling through specialists before a connective-tissue or metabolic pattern is unified.",
    source: "EURORDIS Rare Disease Study",
  },
  {
    num: 72,
    decimals: 0,
    suffix: "%",
    numClass: "text-blue-700 dark:text-blue-400",
    dotClass: "bg-blue-500",
    title: "Subtle signs missed in general notes",
    detail:
      "Arachnodactyly, high-arched palate, and mild aortic changes frequently sit buried inside unstructured narrative text.",
    source: "Clinical Dysmorphology Benchmark",
  },
  {
    num: 0,
    decimals: 0,
    suffix: " bytes",
    numClass: "text-teal-700 dark:text-teal-400",
    dotClass: "bg-teal-500",
    title: "Written to disk or external servers",
    detail:
      "Clinical notes stay inside volatile local RAM. Wiping the session clears the note buffer cleanly without cloud egress.",
    source: "Air-Gapped Local Runtime",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    tag: "Volatile Memory Intake",
    name: "Local RAM intake",
    accentBar: "from-teal-500 via-emerald-500 to-teal-400",
    badgeClass:
      "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800",
    tabActiveClass:
      "bg-teal-700 text-white border-teal-700 dark:bg-teal-500 dark:text-[#042f2e] dark:border-teal-500",
    checkClass: "text-teal-600 dark:text-teal-400",
    summary:
      "Drop a pediatric consultation PDF, scanned clinical letter, or pasted exam summary directly into volatile local memory.",
    highlights: [
      "Extracts narrative text and scanned clinical reports inside RAM only",
      "Leaves zero temporary files or browser history caches behind",
      "Prepares candidate mentions in seconds for clinician inspection",
    ],
  },
  {
    step: "02",
    tag: "Physician Checkpoint",
    name: "Clinician attestation gate",
    accentBar: "from-blue-500 via-sky-500 to-cyan-400",
    badgeClass:
      "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800",
    tabActiveClass:
      "bg-blue-700 text-white border-blue-700 dark:bg-blue-500 dark:text-slate-950 dark:border-blue-500",
    checkClass: "text-blue-600 dark:text-blue-400",
    summary:
      "Every extracted sign pauses at a mandatory physician gate so you verify polarity, onset, and family context before ranking.",
    highlights: [
      "Toggle confirmed versus negated exam findings with one click",
      "Separate patient observations cleanly from unaffected family history",
      "Swap or refine ontology mappings before ancestry traversal begins",
    ],
  },
  {
    step: "03",
    tag: "Auditable HPO Ancestry",
    name: "Deterministic ontology ranking",
    accentBar: "from-indigo-500 via-blue-600 to-teal-500",
    badgeClass:
      "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800",
    tabActiveClass:
      "bg-indigo-700 text-white border-indigo-700 dark:bg-indigo-400 dark:text-slate-950 dark:border-indigo-400",
    checkClass: "text-indigo-600 dark:text-indigo-400",
    summary:
      "Traverse shared Human Phenotype Ontology ancestry with Lin similarity and inspect curated evidence alongside plain family guidance.",
    highlights: [
      "Ranks candidate syndromes exclusively from shared clinical overlap",
      "Visualizes patient finding paths across common ancestral terms",
      "Pairs technical genetics notes with plain-language summaries for families",
    ],
  },
];

// Continuous orbital parameters (no discrete boolean snap jump):
// - |delta| <= CENTER_LOCK_D sits dead-center with zero tilt/offset
// - [CENTER_LOCK_D .. EXIT_D] glides cleanly through a C2-smooth ~15% deceleration zone
//   before accelerating swiftly offscreen along the upper arc of a large hidden circle
const CENTER_LOCK_D = 0.12;
const EXIT_D = 0.88;
const MAX_ORBIT_ANGLE_RAD = (72 * Math.PI) / 180;

function smoothOrbitAngleRad(absD: number): number {
  if (absD <= CENTER_LOCK_D) return 0;
  if (absD >= EXIT_D) return MAX_ORBIT_ANGLE_RAD;
  const s = (absD - CENTER_LOCK_D) / (EXIT_D - CENTER_LOCK_D);
  // Blend a gentle near-center linear arrival (zero jarring kick, slows softly near center)
  // with a fast outer orbital sweep so outgoing/incoming cards cross cleanly at mid-scroll
  const shaped = 0.14 * s + 0.86 * Math.pow(s, 2.6);
  return shaped * MAX_ORBIT_ANGLE_RAD;
}

export const ExplanatorySection: React.FC<ExplanatorySectionProps> = ({
  onLaunchWorkbench,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const whySectionRef = useRef<HTMLElement | null>(null);
  const whyRailRef = useRef<HTMLDivElement | null>(null);
  const orbitSectionRef = useRef<HTMLElement | null>(null);
  const orbitStageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const orbitTriggerRef = useRef<ScrollTrigger | null>(null);
  const currentURef = useRef(0);
  const renderOrbitRef = useRef<((u: number) => void) | null>(null);
  const tabTweenRef = useRef<gsap.core.Tween | null>(null);

  const [activeStage, setActiveStage] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const scrollToStage = useCallback((stageIndex: number) => {
    const st = orbitTriggerRef.current;
    if (st) {
      const progress = stageIndex / (WORKFLOW_STEPS.length - 1);
      const targetY = st.start + (st.end - st.start) * progress;
      window.scrollTo({ top: targetY, behavior: "smooth" });
      return;
    }

    setActiveStage(stageIndex);
    const render = renderOrbitRef.current;
    if (!render) return;

    tabTweenRef.current?.kill();
    const proxy = { u: currentURef.current };
    tabTweenRef.current = gsap.to(proxy, {
      u: stageIndex,
      duration: 0.42,
      ease: "power2.out",
      onUpdate: () => {
        currentURef.current = proxy.u;
        render(proxy.u);
      },
      onComplete: () => {
        currentURef.current = stageIndex;
        render(stageIndex);
      },
    });
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const renderOrbit = (u: number) => {
      const stageEl = orbitStageRef.current;
      if (!stageEl) return;

      const vw = window.innerWidth || stageEl.clientWidth || 1200;
      const cardEl0 = cardRefs.current[0];
      const cardW = cardEl0 ? cardEl0.offsetWidth : vw < 640 ? 300 : 470;
      // Wide invisible wheel on desktop so adjacent cards sweep smoothly across the stage
      const minOffscreenRadius = vw * 0.56 + cardW * 0.62 + (vw < 640 ? 48 : 90);
      const radius = Math.round(
        vw < 640
          ? Math.max(320, vw * 0.92, minOffscreenRadius)
          : Math.max(460, vw * 0.82, minOffscreenRadius)
      );
      const arcDrop = Math.min(vw < 640 ? 52 : 92, Math.max(32, radius * 0.075));

      WORKFLOW_STEPS.forEach((_, idx) => {
        const cardEl = cardRefs.current[idx];
        if (!cardEl) return;

        const delta = idx - u;
        const absD = Math.abs(delta);
        const thetaRad = (delta >= 0 ? 1 : -1) * smoothOrbitAngleRad(absD);
        const thetaDeg = (thetaRad * 180) / Math.PI;
        const cosT = Math.cos(thetaRad);
        const sinT = Math.sin(thetaRad);

        const x = radius * sinT;
        // Positive y traces the top convex rim of a large wheel below the viewport (moves downward toward horizon)
        const y = arcDrop * (1 - cosT);
        const scale = 0.84 + 0.16 * Math.max(0, cosT);
        const rotateZ = thetaDeg * 0.18;
        const rotateY = -thetaDeg * 0.14;
        const opacity =
          absD >= EXIT_D ? 0 : Math.min(1, Math.max(0, (cosT - 0.32) / 0.34));
        const zIndex = Math.round(40 + cosT * 50);

        gsap.set(cardEl, {
          x,
          y,
          scale,
          rotateZ,
          rotateY,
          opacity,
          zIndex,
          visibility: opacity < 0.02 ? "hidden" : "visible",
          pointerEvents: absD <= 0.2 ? "auto" : "none",
        });
      });
    };

    renderOrbitRef.current = renderOrbit;

    const ctx = gsap.context(() => {
      // Section 1: scrubbed progress rail + scroll-linked metric focus rows
      if (whySectionRef.current && whyRailRef.current) {
        gsap.fromTo(
          whyRailRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top center",
            scrollTrigger: {
              trigger: whySectionRef.current,
              start: "top 70%",
              end: "bottom 55%",
              scrub: 0.35,
            },
          }
        );
      }

      const benchRows = gsap.utils.toArray<HTMLElement>("[data-bench-row]");
      benchRows.forEach((row) => {
        gsap.fromTo(
          row,
          { opacity: 0.28, x: 12 },
          {
            opacity: 1,
            x: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: row,
              start: "top 88%",
              end: "top 52%",
              scrub: 0.35,
            },
          }
        );
      });

      const blocks = gsap.utils.toArray<HTMLElement>("[data-scroll-block]");
      blocks.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0.25, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: MOTION_DURATION.scrollReveal,
            ease: MOTION_EASE.uiOut,
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: el,
              start: "top 84%",
              once: true,
            },
          }
        );
      });
    }, root);

    // Section 2: Orbital Scroll-Driven Workflow Card Stage
    // Pin on tablet/desktop (regardless of viewport height); scrub without pinning on mobile
    renderOrbit(currentURef.current);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      if (!orbitSectionRef.current) return;
      renderOrbit(currentURef.current);
      orbitTriggerRef.current = ScrollTrigger.create({
        trigger: orbitSectionRef.current,
        start: () => {
          const secEl = orbitSectionRef.current;
          const stageEl = orbitStageRef.current;
          if (!secEl || !stageEl) return "top 72px";
          const secRect = secEl.getBoundingClientRect();
          const stageRect = stageEl.getBoundingClientRect();
          const stageCenterOffset =
            stageRect.top - secRect.top + stageRect.height / 2;
          const idealTop = Math.round(window.innerHeight / 2 - stageCenterOffset);
          // Guarantee heading, centered card, and stage name tabs fit inside the viewport together
          const maxTopToFit = Math.max(
            16,
            Math.floor(window.innerHeight - secRect.height - 20)
          );
          const minTopBelowNavbar = Math.min(72, maxTopToFit);
          const targetSecTop = Math.max(
            minTopBelowNavbar,
            Math.min(idealTop, maxTopToFit)
          );
          return `top ${targetSecTop}px`;
        },
        end: "+=1350",
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        scrub: 0.14,
        onRefresh: () => renderOrbit(currentURef.current),
        onUpdate: (self) => {
          const u = self.progress * (WORKFLOW_STEPS.length - 1);
          currentURef.current = u;
          const nearest = Math.round(u);
          setActiveStage((prev) => (prev !== nearest ? nearest : prev));
          renderOrbit(u);
        },
      });
      return () => {
        orbitTriggerRef.current = null;
      };
    });

    mm.add("(max-width: 767px)", () => {
      if (!orbitSectionRef.current) return;
      renderOrbit(currentURef.current);
      orbitTriggerRef.current = ScrollTrigger.create({
        trigger: orbitSectionRef.current,
        start: "top 68%",
        end: "bottom 28%",
        pin: false,
        invalidateOnRefresh: true,
        scrub: 0.2,
        onRefresh: () => renderOrbit(currentURef.current),
        onUpdate: (self) => {
          const u = self.progress * (WORKFLOW_STEPS.length - 1);
          currentURef.current = u;
          const nearest = Math.round(u);
          setActiveStage((prev) => (prev !== nearest ? nearest : prev));
          renderOrbit(u);
        },
      });
      return () => {
        orbitTriggerRef.current = null;
      };
    });

    const refreshRaf = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(refreshRaf);
      tabTweenRef.current?.kill();
      renderOrbitRef.current = null;
      orbitTriggerRef.current = null;
      mm.revert();
      ctx.revert();
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16 sm:space-y-24 overflow-x-clip">
      {/* SECTION 1: THE DIAGNOSTIC GAP (Scroll-scrubbed depth & rail) */}
      <section
        id="why-phenora"
        ref={whySectionRef}
        className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start"
      >
        <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-4 relative pl-4">
          <div
            aria-hidden="true"
            className="hidden lg:block absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[#e5e5e0] dark:bg-[#2a2a26]"
          >
            <div
              ref={whyRailRef}
              className="w-full h-full rounded-full bg-gradient-to-b from-teal-500 via-blue-500 to-indigo-500 origin-top"
            />
          </div>
          <div data-scroll-block className="space-y-4">
            <span className="inline-block text-[11px] font-mono font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Diagnostic Bottleneck
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#111] dark:text-[#f3f3ee] leading-[1.12] text-balance">
              Why rare genetic diagnoses take years
            </h2>
            <p className="text-sm sm:text-base text-[#55554f] dark:text-[#a8a89f] leading-relaxed">
              A child with an undiagnosed genetic condition often sees eight specialists across unrelated clinics. Key physical clues stay locked inside plain narrative notes instead of mapped into structured ontology terms.
            </p>
            <p className="text-sm text-[#55554f] dark:text-[#a8a89f] leading-relaxed">
              Phenora keeps raw patient notes offline, turns clinical descriptions into verifiable Human Phenotype Ontology concepts, and shows the exact ancestry behind every candidate match.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 border-b border-[#e5e5e0] dark:border-[#262622]">
          {BENCHMARKS.map((item) => (
            <div
              key={item.title}
              data-bench-row
              className="border-t border-[#e5e5e0] dark:border-[#262622] py-7 grid grid-cols-1 sm:grid-cols-12 gap-4 items-baseline"
            >
              <div className={`sm:col-span-4 text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums ${item.numClass}`}>
                <CountUp
                  to={item.num}
                  decimals={item.decimals}
                  suffix={item.suffix}
                  duration={1.1}
                  easing="easeOut"
                />
              </div>
              <div className="sm:col-span-8 space-y-1.5">
                <h3 className="text-sm font-semibold text-[#111] dark:text-[#f3f3ee] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.dotClass} shrink-0`} />
                  <span>{item.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#55554f] dark:text-[#a8a89f] leading-relaxed">
                  {item.detail}
                </p>
                <p className="text-[11px] font-mono text-[#66665f] dark:text-[#8c8c84] pt-0.5">
                  {item.source}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: THREE VERIFIABLE WORKFLOW STAGES (Orbital Scroll Stage) */}
      <section
        id="how-it-works"
        ref={orbitSectionRef}
        className="scroll-mt-16 flex flex-col justify-center py-2 space-y-3"
      >
        <div className="flex flex-col items-center text-center">
          <div data-scroll-block className="max-w-2xl space-y-1">
            <span className="inline-block text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Clinician-in-the-Loop Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-[#111] dark:text-[#f3f3ee] leading-[1.12]">
              How Phenora builds traceable evidence
            </h2>
            <p className="text-xs sm:text-sm text-[#55554f] dark:text-[#a8a89f] leading-relaxed max-w-xl mx-auto">
              Scroll through the three checkpoints before deterministic graph ranking computes similarity scores.
            </p>
          </div>
        </div>

        {reducedMotion ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((item) => (
              <article
                key={item.step}
                className="surface-card overflow-hidden flex flex-col justify-between"
              >
                <div className={`h-1 w-full bg-gradient-to-r ${item.accentBar}`} />
                <div className="p-5 flex flex-col justify-between gap-4 flex-1">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className={`px-2 py-0.5 rounded border font-semibold ${item.badgeClass}`}>
                        Stage {item.step}
                      </span>
                      <span className="text-[#66665f] dark:text-[#8c8c84]">{item.tag}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#111] dark:text-[#f3f3ee]">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#55554f] dark:text-[#a8a89f] leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                  <ul className="space-y-1.5 border-t border-[#ecece6] dark:border-[#2a2a26] pt-3.5 text-xs text-[#33332f] dark:text-[#c7c7be]">
                    {item.highlights.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${item.checkClass}`} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div
              ref={orbitStageRef}
              className="relative min-h-[348px] sm:h-[296px] sm:min-h-[296px] w-full flex items-center justify-center overflow-visible py-3 sm:py-0 [perspective:1200px]"
            >
              {WORKFLOW_STEPS.map((item, idx) => {
                const isCentered = activeStage === idx;
                return (
                  <article
                    key={item.step}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    data-orbit-card={item.step}
                    className={`surface-card overflow-hidden absolute w-[min(470px,calc(100%-1.5rem))] flex flex-col justify-between will-change-transform transition-[box-shadow,border-color] duration-200 ${
                      isCentered
                        ? "border-teal-600/35 dark:border-teal-400/35 shadow-[0_24px_56px_-18px_rgba(13,148,136,0.22)] dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)]"
                        : "shadow-md"
                    }`}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${item.accentBar}`} />
                    <div className="p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-3.5 flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className={`px-2 py-0.5 rounded border font-semibold ${item.badgeClass}`}>
                            Stage {item.step}
                          </span>
                          <span className="text-[#66665f] dark:text-[#8c8c84]">{item.tag}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-[#111] dark:text-[#f3f3ee] tracking-tight">
                          {item.name}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-[#55554f] dark:text-[#b2b2a7] leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      <ul className="space-y-1.5 border-t border-[#ecece6] dark:border-[#2a2a26] pt-3 text-xs text-[#33332f] dark:text-[#d4d4cc]">
                        {item.highlights.map((pt) => (
                          <li key={pt} className="flex items-start gap-2">
                            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${item.checkClass}`} />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-2 pt-0.5"
              role="tablist"
              aria-label="Workflow stages"
            >
              {WORKFLOW_STEPS.map((item, idx) => {
                const isActive = activeStage === idx;
                return (
                  <button
                    key={item.step}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => scrollToStage(idx)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? `${item.tabActiveClass} font-semibold shadow-2xs`
                        : "bg-white text-[#55554f] border-[#e5e5e0] hover:border-[#111] hover:text-[#111] dark:bg-[#151513] dark:text-[#a1a196] dark:border-[#2a2a26] dark:hover:border-[#f3f3ee] dark:hover:text-[#f3f3ee]"
                    }`}
                  >
                    {item.step} · {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: CLINICIAN ERGONOMICS & SAFETY */}
      <section
        id="clinician-safety"
        data-scroll-block
        className="scroll-mt-24 bg-gradient-to-br from-teal-50/80 via-[#f2f5f3] to-blue-50/75 dark:from-teal-950/35 dark:via-[#141716] dark:to-blue-950/30 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl p-5 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center"
      >
        <div className="lg:col-span-7 space-y-4">
          <span className="inline-block text-[11px] font-mono font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Clinical Safety &amp; Interpretability
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-[#111] dark:text-[#f3f3ee] leading-[1.15]">
            Built for clinical clarity and family explanations
          </h2>
          <p className="text-sm sm:text-base text-[#55554f] dark:text-[#a8a89f] leading-relaxed">
            Every matched condition provides both a geneticist synopsis with OMIM or Orpha identifiers and a plain-language summary you can share during family consultations. High-contrast controls and clear typography keep long sessions readable without nested menus.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-xs font-mono text-[#33332f] dark:text-[#cfcfc8]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
              Air-gapped execution
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              Lin DAG similarity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
              FDA non-device CDS posture
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-3">
          <button
            type="button"
            onClick={onLaunchWorkbench}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-teal-700 hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-[#042f2e] text-sm font-semibold shadow-sm btn-press hover-lift cursor-pointer"
          >
            <span>Open clinical workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
