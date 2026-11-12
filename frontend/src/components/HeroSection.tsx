import React from "react";
import { motion } from "framer-motion";
import { Stethoscope, ArrowDown, FileText, Cpu, GitMerge, ShieldCheck } from "lucide-react";

interface HeroSectionProps {
  onScrollToWorkbench: () => void;
  onScrollToArchitecture: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToWorkbench,
  onScrollToArchitecture,
}) => {
  // Staggered headline words for cinematic scroll arrival
  const words = ["PRECISION", "PHENOTYPE", "EVIDENCE", "FOR", "RARE", "DISEASE."];

  return (
    <section
      id="hero"
      className="relative z-10 min-h-screen flex flex-col justify-center px-6 sm:px-12 max-w-7xl mx-auto w-full pt-28 pb-20"
    >
      <div className="max-w-3xl space-y-7">
        {/* Clinical Authority Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-zinc-300 uppercase tracking-widest">
            Phenora &bull; Air-Gapped Phenotypic Intelligence
          </span>
        </motion.div>

        {/* Cinematic Headline: Words with staggered fade-up animation */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white uppercase leading-[1.08] m-0">
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.65,
                  delay: 0.12 + i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`inline-block ${
                  word === "PRECISION"
                    ? "text-white"
                    : word === "PHENOTYPE"
                    ? "text-zinc-100"
                    : word === "RARE" || word === "DISEASE."
                    ? "text-emerald-400"
                    : "text-zinc-200"
                }`}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Subtext: Clear, Authentic Scientific Mission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3 max-w-2xl"
        >
          <p className="text-base sm:text-lg text-zinc-300/90 leading-relaxed font-normal">
            Synthesizing unstructured pediatric consultation notes and dysmorphology hallmarks into deterministic paths through the Human Phenotype Ontology —{" "}
            <span className="text-white font-medium">executed 100% in volatile RAM with zero cloud egress</span>.
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono">
            Mandatory human-in-the-loop clinician review gate &bull; Zero black-box diagnostic hallucinations
          </p>
        </motion.div>

        {/* High-Craft Action Row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3.5 flex-wrap pt-2"
        >
          {/* Primary Action Button (Quiet Off-White) */}
          <button
            type="button"
            onClick={onScrollToWorkbench}
            className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-xl hover:bg-white transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <Stethoscope className="w-4 h-4 text-emerald-700" />
            <span>Launch Clinical Workbench</span>
            <ArrowDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {/* Secondary Outline Glass Button */}
          <button
            type="button"
            onClick={onScrollToArchitecture}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 backdrop-blur-md px-5 py-3 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
          >
            <span>System Architecture</span>
            <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {/* Download Test Note Button */}
          <a
            href="/sample_pediatric_consultation.pdf"
            download="sample_pediatric_consultation.pdf"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Download authentic pediatric consultation note PDF for offline testing"
          >
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>Sample PDF</span>
          </a>
        </motion.div>

        {/* Quiet Trust Metrics Strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.05 }}
          className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-zinc-400 font-mono"
        >
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Volatile RAM &bull; 0 Disk Writes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <GitMerge className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Lin Semantic MICA &bull; Deterministic</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>FDA CDS Non-Device Compliance</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
