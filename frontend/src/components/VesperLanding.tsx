import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ShieldCheck,
  Stethoscope,
  ChevronDown,
  ArrowRight,
  FileText,
  UserCheck,
  GitMerge,
  Sparkles,
  Dna,
  AlertTriangle,
  HelpCircle,
  Download,
} from "lucide-react";
import {
  getDiseaseExplanation,
  DISEASE_CATALOG,
} from "../lib/diseaseExplanations";

gsap.registerPlugin(ScrollTrigger);

interface VesperLandingProps {
  onLaunchWorkbench: () => void;
  onGoToIntro?: () => void;
}

export const VesperLanding: React.FC<VesperLandingProps> = ({ onLaunchWorkbench, onGoToIntro }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const statsRef = useRef<HTMLElement | null>(null);

  // Interactive Disease Explorer State
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>("OMIM:154700");
  const [explorerPerspective, setExplorerPerspective] = useState<"medical" | "plain">("medical");

  // Interactive Pipeline Step State
  const [activePipelineStep, setActivePipelineStep] = useState<number>(1);

  // GSAP Scroll Animations on mount
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Animate Section Titles & Cards on scroll
      const sections = containerRef.current?.querySelectorAll(".scroll-reveal");
      sections?.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // Animate Disease Explorer Card change
      const explorerCard = containerRef.current?.querySelector(".explorer-card");
      if (explorerCard) {
        gsap.fromTo(
          explorerCard,
          { opacity: 0.4, scale: 0.98 },
          { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [selectedDiseaseId, explorerPerspective]);

  const activeCatalogItem = DISEASE_CATALOG.find((d) => d.id === selectedDiseaseId) || DISEASE_CATALOG[0];
  const activeExplanation = getDiseaseExplanation(selectedDiseaseId, activeCatalogItem.name);

  return (
    <div ref={containerRef} className="w-full bg-[#000000] text-white selection:bg-white selection:text-black">
      
      {/* ========================================================================= */}
      {/* 1. SINGLE-VIEWPORT HERO SECTION (EXACT VESPER PROMPT SPEC) */}
      {/* ========================================================================= */}
      <section
        id="top"
        ref={heroRef}
        className="relative min-h-[calc(100vh-65px)] flex flex-col justify-between overflow-hidden bg-[#000000]"
      >
        {/* Background Video with Scrim */}
        <div className="hero-photo" aria-hidden="true">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-80"
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        {/* Hero Content (Bottom-Centered) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-end px-4 sm:px-6 pb-[var(--hero-gap)] text-center max-w-[var(--copy-max)] mx-auto w-full">
          
          {/* Badge with Sparkle */}
          <div
            className="vesper-badge appear appear--pop"
            style={{ "--d": "0.08s" } as React.CSSProperties}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="currentColor"
              className="text-white shrink-0"
              aria-hidden="true"
            >
              <path d="M6.5 0 L7.8 4.7 L12.5 6 L7.8 7.3 L6.5 12 L5.2 7.3 L0.5 6 L5.2 4.7 Z" />
            </svg>
            <span>Air-Gapped Clinical Decision Support</span>
          </div>

          {/* Masked Headline Lines */}
          <h1 className="hero-title text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white mb-5 w-full">
            <span className="headline-line">
              <span className="appear appear--mask inline-block" style={{ "--d": "0.18s" } as React.CSSProperties}>
                Bridging <em className="instrument-italic font-normal">clinical clues</em> to
              </span>
            </span>
            <span className="headline-line">
              <span className="appear appear--mask inline-block" style={{ "--d": "0.30s" } as React.CSSProperties}>
                rare disease answers.
              </span>
            </span>
          </h1>

          {/* Lede Paragraph */}
          <p
            className="hero-lede appear appear--soft text-sm sm:text-base text-[#9a9a9a] leading-relaxed max-w-[var(--lede-max)] mx-auto mb-8 font-normal"
            style={{ "--d": "0.44s" } as React.CSSProperties}
          >
            Designed for pediatric geneticists and dysmorphologists. Extract clinical symptoms locally, verify every finding with a human review gate, and map deterministic paths through the Human Phenotype Ontology &mdash; <strong className="text-white font-medium">100% offline with zero cloud leaks</strong>.
          </p>

          {/* Action Buttons */}
          <div
            className="hero-actions appear appear--btn flex items-center justify-center gap-3.5 flex-wrap"
            style={{ "--d": "0.58s" } as React.CSSProperties}
          >
            {/* Solid Button */}
            <button
              onClick={onLaunchWorkbench}
              className="btn btn-solid hero-btn cursor-pointer font-medium text-sm px-6 h-[44px] shadow-sm flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4 text-emerald-800" />
              <span>Launch Clinical Workbench</span>
              <ArrowRight className="w-4 h-4 text-[#555]" />
            </button>

            {/* Ghost Button */}
            <a
              href="#architecture"
              className="btn btn-ghost hero-btn cursor-pointer font-medium text-sm px-6 h-[44px] flex items-center gap-2 text-white/90"
            >
              <span>Explore Architecture &amp; Proof</span>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </a>

            {/* Sample PDF Download Button */}
            <a
              href="/sample_pediatric_consultation.pdf"
              download="sample_pediatric_consultation.pdf"
              className="btn btn-ghost hero-btn cursor-pointer font-medium text-xs px-4 h-[44px] flex items-center gap-1.5 text-blue-300 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20"
              title="Download real-world pediatric consultation note PDF for offline testing"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Test PDF</span>
            </a>
          </div>
        </div>

        {/* Exact Stats Footer (3 Columns) */}
        <footer
          ref={statsRef}
          className="stats relative z-10 grid grid-cols-1 md:grid-cols-3 items-center gap-4 px-6 sm:px-12 py-6 border-t border-white/10 bg-black/60 backdrop-blur-md text-xs sm:text-[13.5px] text-[#d8d8d8]"
        >
          {/* Stat 1 — Workflow Pill */}
          <div className="flex items-center gap-2.5 justify-center md:justify-start appear appear--stat" style={{ "--d": "0.68s" } as React.CSSProperties}>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-white/80 shrink-0">
              <GitMerge className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-medium text-white/90">
              18,400+ HPO phenotypes mapped
            </span>
          </div>

          {/* Stat 2 — Zero Egress RAM Shield Tile */}
          <div className="flex items-center gap-2.5 justify-center appear appear--stat" style={{ "--d": "0.76s" } as React.CSSProperties}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-mono text-emerald-300 font-medium">
              0 bytes cloud egress (100% RAM)
            </span>
          </div>

          {/* Stat 3 — Indexed Diseases */}
          <div className="flex items-center gap-2.5 justify-center md:justify-end appear appear--stat" style={{ "--d": "0.84s" } as React.CSSProperties}>
            <div className="flex -space-x-2 shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-600/80 border border-black flex items-center justify-center text-[10px] font-bold text-white">M</div>
              <div className="w-6 h-6 rounded-full bg-emerald-600/80 border border-black flex items-center justify-center text-[10px] font-bold text-white">D</div>
              <div className="w-6 h-6 rounded-full bg-purple-600/80 border border-black flex items-center justify-center text-[10px] font-bold text-white">R</div>
            </div>
            <span className="font-medium text-white/90">
              7,000+ orphan diseases indexed
            </span>
          </div>
        </footer>
      </section>

      {/* ========================================================================= */}
      {/* 2. SCROLL-BASED EXPLANATORY SECTION 1: THE CLINICAL CHALLENGE (#benefits) */}
      {/* ========================================================================= */}
      <section id="benefits" className="scroll-reveal py-28 px-6 sm:px-12 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            The Pediatric Dilemma
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white mt-5 mb-4">
            Why Diagnosing a Rare Disease Takes 5+ Years
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal max-w-2xl mx-auto">
            A child with an undiagnosed rare disease typically visits <strong className="text-white font-medium">8 specialists</strong>, undergoes dozens of inconclusive scans, and generates hundreds of pages of unstandardized notes. Subtle clinical clues are buried across disparate electronic records.
          </p>
        </div>

        {/* 3 Core Impact Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl bg-[#0c0c10] border border-white/10 hover:border-amber-400/40 transition-all duration-300 flex flex-col justify-between shadow-xl hover:-translate-y-1 group">
            <div>
              <div className="text-4xl sm:text-5xl font-mono font-semibold text-amber-400 mb-3 tracking-tight">
                5.6 Years
              </div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-amber-200 transition-colors">
                The Diagnostic Odyssey
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Families endure an agonizing multi-year search for answers. Phenora accelerates this process by synthesizing physical hallmarks into standardized HPO ontology terms in seconds.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
              <span>EURORDIS Rare Disease Study</span>
              <span className="text-amber-400/60 font-mono">18,400+ HPO</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl bg-[#0c0c10] border border-white/10 hover:border-rose-400/40 transition-all duration-300 flex flex-col justify-between shadow-xl hover:-translate-y-1 group">
            <div>
              <div className="text-4xl sm:text-5xl font-mono font-semibold text-rose-400 mb-3 tracking-tight">
                72% Missed
              </div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-rose-200 transition-colors">
                Overlooked Subtle Hallmarks
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Mild joint hypermobility, high-arched palate, or subtle corneal opacities are frequently dismissed in general exams. Phenora captures every physical sign and maps it to specific syndromes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
              <span>Clinical Dysmorphology Benchmark</span>
              <span className="text-rose-400/60 font-mono">Zero Hallucinations</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl bg-[#0c0c10] border border-white/10 hover:border-emerald-400/40 transition-all duration-300 flex flex-col justify-between shadow-xl hover:-translate-y-1 group">
            <div>
              <div className="text-4xl sm:text-5xl font-mono font-semibold text-emerald-400 mb-3 tracking-tight">
                0 Cloud Leaks
              </div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-emerald-200 transition-colors">
                Total Data Sovereignty
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Pediatric genetic information is sensitive and immutable. Phenora executes 100% in volatile RAM with zero network egress, fully compliant with strict hospital air-gapped guidelines.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
              <span>HIPAA &amp; GDPR Air-Gap Isolation</span>
              <span className="text-emerald-400/60 font-mono">Volatile RAM</span>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BANNER: ADVANCE TO NEXT PAGE */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-[#111116] via-[#16161d] to-[#111116] border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Ready to test a clinical case?</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                  Next Page: 3
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Skip to the interactive Clinical Workbench to extract phenotypes and inspect evidence graphs in real time.
              </p>
            </div>
          </div>

          <button
            onClick={onLaunchWorkbench}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-lg cursor-pointer hover:-translate-y-0.5 shrink-0"
          >
            <span>Go to Next Page: Clinical Workbench</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SCROLL-BASED EXPLANATORY SECTION 2: 3-STEP PIPELINE (#how-it-works) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="scroll-reveal py-28 px-6 sm:px-12 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Interactive 3-Step Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white mt-5 mb-4">
            How Phenora Works in 3 Transparent Steps
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal max-w-2xl mx-auto">
            No black-box guesses. No uncalibrated percentages. Phenora combines local natural language extraction with a mandatory physician review gate and deterministic ontology graph traversal.
          </p>
        </div>

        {/* Unified Segmented Control */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-full bg-[#111116] border border-white/15 shadow-xl gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setActivePipelineStep(1)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
                activePipelineStep === 1
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${activePipelineStep === 1 ? "bg-black text-white" : "bg-white/10 text-zinc-400"}`}>
                1
              </span>
              <span>Stage 1: Clinical Intake</span>
            </button>
            <button
              onClick={() => setActivePipelineStep(2)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
                activePipelineStep === 2
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${activePipelineStep === 2 ? "bg-black text-white" : "bg-white/10 text-zinc-400"}`}>
                2
              </span>
              <span>Stage 2: Physician Review Gate</span>
            </button>
            <button
              onClick={() => setActivePipelineStep(3)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${
                activePipelineStep === 3
                  ? "bg-white text-black font-bold shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${activePipelineStep === 3 ? "bg-black text-white" : "bg-white/10 text-zinc-400"}`}>
                3
              </span>
              <span>Stage 3: Deterministic Graph</span>
            </button>
          </div>
        </div>

        {/* Interactive Step Preview Display */}
        <div className="p-8 sm:p-10 rounded-2xl bg-[#0c0c10] border border-white/15 backdrop-blur-xl shadow-2xl">
          {activePipelineStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Step 1 &bull; Zero Disk Footprint</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  Paste Notes or Drop Scanned Consultation PDFs
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Clinicians can paste clinical notes or drop unstructured medical reports directly into the browser. 
                  Our in-memory extraction engine parses the text without writing a single temporary file to disk. 
                  When you close the tab, the volatile buffer is instantly obliterated.
                </p>
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={onLaunchWorkbench}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-200 px-5 py-2.5 rounded-full transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Launch Step 1 in Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href="/sample_pediatric_consultation.pdf"
                    download="sample_pediatric_consultation.pdf"
                    className="inline-flex items-center gap-2 text-xs font-mono text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3.5 py-2.5 rounded-full hover:bg-blue-500/20 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Test PDF</span>
                  </a>
                </div>
              </div>

              {/* Terminal Preview */}
              <div className="p-5 rounded-xl bg-[#070709] border border-white/15 font-mono text-xs text-white/80 space-y-2.5 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2">RAM_BUFFER://pediatric_case_intake.log</span>
                  </div>
                  <span className="text-emerald-400 font-bold">VOLATILE</span>
                </div>
                <div className="text-zinc-400">&gt; Ingesting pediatric consultation report...</div>
                <div className="text-emerald-400">&gt; Memory Buffer: 0x7FFF92A0 (Isolated RAM)</div>
                <div className="text-white/95 bg-white/5 p-3 rounded-md border border-white/10 leading-relaxed text-[11px]">
                  &ldquo;14-year-old male with tall stature, arachnodactyly, severe pectus excavatum, ectopia lentis, and aortic root aneurysm. Negates seizures.&rdquo;
                </div>
                <div className="text-purple-300 flex items-center justify-between pt-1">
                  <span>&gt; Extracted 10 candidate phenotypes</span>
                  <span className="text-emerald-400">0 network packets</span>
                </div>
              </div>
            </div>
          )}

          {activePipelineStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4" />
                  <span>Step 2 &bull; Physician in the Loop</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  Mandatory Review Gate &amp; Negation Isolation
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Phenora never automatically queries an ontology without doctor verification. 
                  Every finding is tagged with polarity (Present vs Negated), temporality, and experiencer. 
                  Crucially, negated findings like <strong className="text-rose-300">&ldquo;denies seizures&rdquo;</strong> are quarantined so they never corrupt the differential.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={onLaunchWorkbench}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-200 px-5 py-2.5 rounded-full transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Test Review Gate in Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive Review Gate Mockup */}
              <div className="p-5 rounded-xl bg-[#070709] border border-white/15 font-mono text-xs space-y-3 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2">CLINICAL_REVIEW_GATE</span>
                  </div>
                  <span className="text-amber-400 font-bold">STATUS: PENDING ATTESTATION</span>
                </div>
                
                {/* Finding 1 */}
                <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-950/30 border border-emerald-500/30 text-white">
                  <div>
                    <span className="font-semibold text-emerald-300">HP:0001166</span>
                    <span className="text-white/80 ml-2">Arachnodactyly (Long fingers)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">CONFIRMED</span>
                </div>

                {/* Finding 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-md bg-emerald-950/30 border border-emerald-500/30 text-white">
                  <div>
                    <span className="font-semibold text-emerald-300">HP:0002616</span>
                    <span className="text-white/80 ml-2">Aortic Root Aneurysm</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">CONFIRMED</span>
                </div>

                {/* Negated Finding (Quarantined) */}
                <div className="flex items-center justify-between p-2.5 rounded-md bg-rose-950/30 border border-rose-500/30 text-white">
                  <div>
                    <span className="font-semibold text-rose-300">HP:0001250</span>
                    <span className="text-white/80 ml-2">Seizures (Negated in note)</span>
                  </div>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">QUARANTINED</span>
                </div>
              </div>
            </div>
          )}

          {activePipelineStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-wider">
                  <GitMerge className="w-4 h-4" />
                  <span>Step 3 &bull; Mathematical Proof</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  Deterministic Graph Traversal &amp; MICA Alignment
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Instead of black-box statistical guesses, Phenora executes exact graph walks across the Human Phenotype Ontology directed acyclic graph. 
                  It computes <strong className="text-white">Lin Semantic Similarity</strong> and locates the <em>Most Informative Common Ancestor (MICA)</em> between the child&apos;s verified phenotypes and 7,000+ curated orphan disease profiles.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={onLaunchWorkbench}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-200 px-5 py-2.5 rounded-full transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                    <span>View Graph Canvas in Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* MICA Visualizer */}
              <div className="p-5 rounded-xl bg-[#070709] border border-white/15 font-mono text-xs space-y-3 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2">ONTOLOGY_GRAPH_MICA_RESOLUTION</span>
                  </div>
                  <span className="text-purple-400 font-bold">EXACT REASONING</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-white/5 border border-white/10">
                    <span className="text-zinc-400">Patient Finding:</span> <span className="text-emerald-400 font-semibold">HP:0002616 (Aortic Root Dilation)</span>
                  </div>
                  <div className="text-center text-purple-400 font-bold py-0.5 text-[11px]">&darr; Shared MICA: HP:0001626 (Abnormality of Cardiovascular System) &darr;</div>
                  <div className="p-2.5 rounded bg-white/5 border border-white/10">
                    <span className="text-zinc-400">Candidate Disease:</span> <span className="text-amber-400 font-semibold">Marfan Syndrome (OMIM:154700 / FBN1)</span>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-between border-t border-white/10">
                  <span>Information Content (IC): 4.89</span>
                  <span className="text-emerald-400 font-semibold">100% Deterministic Match</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SCROLL-BASED EXPLANATORY SECTION 3: ARCHITECTURE COMPARISON (#architecture) */}
      {/* ========================================================================= */}
      <section id="architecture" className="scroll-reveal py-24 px-6 sm:px-12 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-purple-400 bg-purple-950/60 border border-purple-500/30 px-3.5 py-1 rounded-full">
            Clinical Safety Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white mt-4 mb-4">
            Phenora vs. Black-Box Cloud AI
          </h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed font-normal">
            Why pediatric geneticists cannot rely on generic chatbots or statistical probability percentages for clinical decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: Generic Cloud AI (Flaws) */}
          <div className="p-8 rounded-2xl bg-rose-950/10 border border-rose-500/20 space-y-5">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs uppercase tracking-wider font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Generic Generative AI / Cloud Chatbots</span>
            </div>
            <h3 className="text-xl font-semibold text-white">
              The Hazards of Black-Box Clinical Prediction
            </h3>
            <ul className="space-y-3.5 text-xs sm:text-sm text-white/70">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span><strong>Hallucinated Probabilities:</strong> Produces arbitrary &ldquo;87% chance of disease&rdquo; numbers with zero statistical calibration.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span><strong>Silent Cloud Egress:</strong> Sends highly sensitive pediatric genetics notes to third-party server farms for training.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span><strong>Phantom Citations:</strong> Fabricates fictitious PubMed papers and non-existent OMIM codes when uncertain.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0">&times;</span>
                <span><strong>Non-Compliant:</strong> Violates FDA non-device Clinical Decision Support (CDS) rules by hiding reasoning.</span>
              </li>
            </ul>
          </div>

          {/* Column 2: Phenora Deterministic Architecture (Advantages) */}
          <div className="p-8 rounded-2xl bg-emerald-950/15 border border-emerald-500/30 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Phenora Deterministic Architecture</span>
            </div>
            <h3 className="text-xl font-semibold text-white">
              The Safety of Mathematical Ontology Alignment
            </h3>
            <ul className="space-y-3.5 text-xs sm:text-sm text-white/80">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold shrink-0">&check;</span>
                <span><strong>Zero Cloud Footprint:</strong> 100% execution in volatile RAM. Patient data disappears upon browser close.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold shrink-0">&check;</span>
                <span><strong>FDA CDS Compliant:</strong> Transparent phenotype overlap and cited evidence only; strictly zero uncalibrated &ldquo;disease percentages&rdquo;.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold shrink-0">&check;</span>
                <span><strong>Verifiable Evidence:</strong> Every candidate condition includes direct OMIM identifiers, causative gene loci, and actual PubMed PMIDs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold shrink-0">&check;</span>
                <span><strong>Dual Perspective Engine:</strong> Generates rigorous specialist genetics details alongside clear, compassionate plain-language explanations.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SCROLL-BASED EXPLANATORY SECTION 4: DUAL-PERSPECTIVE CANVAS (#clinical-proof) */}
      {/* ========================================================================= */}
      <section id="clinical-proof" className="scroll-reveal py-24 px-6 sm:px-12 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-medium uppercase tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1 rounded-full">
            Clinical Knowledge Engine
          </span>
          <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white mt-4 mb-4">
            Dual-Perspective Disease Intelligence
          </h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed font-normal">
            A rare disease diagnosis is complex. Phenora equips clinicians with deep genetic pathways while empowering parents with compassionate, plain-language explanations.
          </p>
        </div>

        {/* Disease Selection Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {DISEASE_CATALOG.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedDiseaseId(item.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedDiseaseId === item.id
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
              }`}
            >
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Perspective Switcher (Medical vs Plain Language) */}
        <div className="max-w-md mx-auto mb-8 flex items-center p-1 bg-white/5 rounded-xl border border-white/15">
          <button
            onClick={() => setExplorerPerspective("medical")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              explorerPerspective === "medical"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Medical / Specialist Terms</span>
          </button>
          <button
            onClick={() => setExplorerPerspective("plain")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              explorerPerspective === "plain"
                ? "bg-emerald-500 text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plain Language / Family Guide</span>
          </button>
        </div>

        {/* Dynamic Disease Intelligence Card */}
        <div className="explorer-card max-w-4xl mx-auto p-8 sm:p-10 rounded-2xl bg-white/[0.03] border border-white/15 backdrop-blur-xl space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {selectedDiseaseId}
                </span>
                <span className="text-xs text-white/40">&bull;</span>
                <span className="text-xs font-mono text-emerald-400">
                  {explorerPerspective === "medical" ? "SPECIALIST GENETICS VIEW" : "PATIENT & FAMILY SUMMARY"}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mt-1">
                {activeCatalogItem.name}
              </h3>
            </div>

            <button
              onClick={onLaunchWorkbench}
              className="btn btn-solid text-xs font-semibold px-4 py-2 cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              <span>Analyze in Workbench</span>
            </button>
          </div>

          {/* Perspective 1: Medical / Geneticist */}
          {explorerPerspective === "medical" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Dna className="w-4 h-4" />
                  <span>Genetic Etiology &amp; Molecular Pathophysiology</span>
                </span>
                <p className="text-sm text-white/80 leading-relaxed">
                  {activeExplanation.medical.overview}
                </p>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-blue-300">
                  {activeExplanation.medical.genetics}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white/90">
                  Cardinal Clinical Hallmarks:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/70">
                  {activeExplanation.medical.clinicalHallmarks.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple-300">
                  Surveillance &amp; Management Protocol:
                </span>
                <p className="text-xs text-white/80 leading-relaxed">
                  {activeExplanation.medical.management}
                </p>
              </div>
            </div>
          ) : (
            /* Perspective 2: Plain Language Family Guide */
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>What Does This Diagnosis Mean?</span>
                </span>
                <p className="text-sm text-white/90 leading-relaxed font-normal">
                  {activeExplanation.plainLanguage.summary}
                </p>
                <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 text-xs text-emerald-200/90 italic">
                  &ldquo;{activeExplanation.plainLanguage.analogy}&rdquo;
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white/90">
                  Signs Parents &amp; Families May Notice:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                  {activeExplanation.plainLanguage.keySigns.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-md bg-white/[0.02] border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Family Guidance &amp; Care Focus:</span>
                </span>
                <p className="text-xs text-white/80 leading-relaxed">
                  {activeExplanation.plainLanguage.careFocus}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION SECTION */}
      {/* ========================================================================= */}
      <section className="scroll-reveal py-24 px-6 sm:px-12 max-w-4xl mx-auto text-center space-y-6 border-t border-white/10 mb-16">
        <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ready to Proceed
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white mt-2">
          Experience Phenora Today
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Advance to the air-gapped clinical consultation workbench or download our curated test report to evaluate real-time HPO mapping in memory.
        </p>

        <div className="pt-4 flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={onLaunchWorkbench}
            className="btn btn-solid hero-btn cursor-pointer px-8 h-[48px] text-sm font-semibold shadow-lg flex items-center gap-2"
          >
            <Stethoscope className="w-4 h-4 text-emerald-800" />
            <span>Next Page: Launch Clinical Workbench (Page 3)</span>
            <ArrowRight className="w-4 h-4 text-[#555]" />
          </button>

          <a
            href="/sample_pediatric_consultation.pdf"
            download="sample_pediatric_consultation.pdf"
            className="btn btn-ghost hero-btn cursor-pointer px-6 h-[48px] text-sm font-medium flex items-center gap-2 text-white/90"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Download Test Consultation PDF</span>
          </a>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PERSISTENT FLOATING BOTTOM NAVIGATION BAR (ALWAYS ACCESSIBLE) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 sm:gap-4 px-4 sm:px-6 py-2.5 rounded-full bg-black/90 border border-white/20 backdrop-blur-xl shadow-2xl text-xs">
        {onGoToIntro && (
          <button
            onClick={onGoToIntro}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-mono text-[11px] pr-1"
            title="Go back to Page 1: AI Hero"
          >
            <span>&larr; Page 1</span>
          </button>
        )}
        {onGoToIntro && <span className="text-white/25">|</span>}
        <span className="font-mono text-[11px] text-zinc-300 hidden md:inline">
          Page 2: Architecture &amp; Clinical Proof
        </span>
        <span className="text-white/25 hidden md:inline">&bull;</span>
        <button
          onClick={onLaunchWorkbench}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
        >
          <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
          <span>Next Page: Clinical Workbench</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
