import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FileText,
  UserCheck,
  GitMerge,
  Layers,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface PipelineSectionProps {
  onScrollToWorkbench: () => void;
}

export const PipelineSection: React.FC<PipelineSectionProps> = ({ onScrollToWorkbench }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll(".pipeline-card");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="pipeline"
      ref={sectionRef}
      className="relative z-10 py-28 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 scroll-mt-20"
    >
      {/* Section Header */}
      <div className="max-w-3xl mb-14 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 text-xs font-mono font-medium text-sky-300 uppercase tracking-widest">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>System Architecture</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
          Deterministic 3-Stage Pipeline
        </h2>

        <p className="text-base text-zinc-300/90 leading-relaxed max-w-2xl font-normal">
          Zero black-box hallucinations. Zero uncalibrated disease probabilities. Phenora processes patient records entirely in local volatile memory through a verified clinician gate and mathematical ontology graph traversal.
        </p>
      </div>

      {/* 3 Architecture Pillar Cards */}
      <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Stage 1 Card */}
        <div className="pipeline-card rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-7 shadow-2xl flex flex-col justify-between hover:border-white/20 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-sky-400 uppercase tracking-wider">
                Stage 01
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-sky-400" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                In-Memory Clinical Ingestion
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Zero disk writes &bull; Volatile buffer
              </p>
            </div>

            <p className="text-sm text-zinc-300/80 leading-relaxed">
              Parses unstructured consultation notes and clinical PDFs directly in volatile memory. 
              Isolates negation boundaries (e.g. distinguishing &ldquo;negates seizures&rdquo; from positive findings) 
              and maps terms to candidate HPO IDs without saving bytes to disk.
            </p>

            {/* Technical Highlights */}
            <div className="pt-2 space-y-2 border-t border-white/10 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Token character span grounding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Negation &amp; experiencer boundaries</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Instant volatile buffer purge on reset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 2 Card */}
        <div className="pipeline-card rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-7 shadow-2xl flex flex-col justify-between hover:border-white/20 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-400 uppercase tracking-wider">
                Stage 02
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Physician Review Gate
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Mandatory clinician-in-the-loop attestation
              </p>
            </div>

            <p className="text-sm text-zinc-300/80 leading-relaxed">
              Enforces strict human governance and FDA CDS non-device compliance. Clinicians verify polarity 
              (present vs negated), experiencer (patient vs family), and temporality. Negated symptoms are 
              quarantined so only attested findings enter the matching graph.
            </p>

            {/* Technical Highlights */}
            <div className="pt-2 space-y-2 border-t border-white/10 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Explicit clinician attestation gate</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Family &amp; negated clue quarantine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Manual HPO search &amp; term replacement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 3 Card */}
        <div className="pipeline-card rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-7 shadow-2xl flex flex-col justify-between hover:border-white/20 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-purple-400 uppercase tracking-wider">
                Stage 03
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <GitMerge className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Deterministic Graph Traversal
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Lin Semantic MICA &bull; 18,400+ HPO nodes
              </p>
            </div>

            <p className="text-sm text-zinc-300/80 leading-relaxed">
              Traverses the Human Phenotype Ontology DAG. Computes semantic similarity via 
              Most Informative Common Ancestor (MICA) Information Content. Yields fully explainable, 
              mathematically reproducible disease alignments without synthetic black-box risk scores.
            </p>

            {/* Technical Highlights */}
            <div className="pt-2 space-y-2 border-t border-white/10 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Mathematical Lin semantic scoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Visual MICA common ancestor evidence tree</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dual perspective: Medical + Plain language</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smooth Transition Callout to Workbench */}
      <div className="mt-14 text-center">
        <button
          type="button"
          onClick={onScrollToWorkbench}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-lg hover:-translate-y-0.5"
        >
          <span>Experience the live pipeline in the Clinical Decision-Support Workbench below</span>
          <ArrowDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
        </button>
      </div>
    </section>
  );
};
