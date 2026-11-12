import React, { useEffect, useRef } from "react";
import { Award, Layers, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { MOTION_DURATION, MOTION_EASE, prefersReducedMotion } from "../lib/motion";
import type { Candidate } from "../types/api";

interface CandidateListProps {
  candidates: Candidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (diseaseId: string) => void;
}

export const CandidateList: React.FC<CandidateListProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !listContainerRef.current || candidates.length === 0) return;

    const cards = listContainerRef.current.querySelectorAll(".candidate-card");
    if (cards.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0.25, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_DURATION.ui,
          stagger: MOTION_DURATION.cardStagger,
          ease: MOTION_EASE.uiOut,
          clearProps: "transform,opacity",
        }
      );
    }, listContainerRef);

    return () => ctx.revert();
  }, [candidates]);

  return (
    <div className="surface-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111] dark:text-[#f3f3ee] m-0">
            Candidate conditions
          </h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#f0f0ec] dark:bg-[#242420] text-[#55554f] dark:text-[#b2b2a7] tabular-nums">
          {candidates.length} ranked
        </span>
      </div>

      <p className="text-[11px] text-[#66665f] dark:text-[#a1a196] mb-3">
        Ordered by Lin semantic similarity across HPO ancestry.
      </p>

      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px]"
      >
        {candidates.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#66665f] dark:text-[#a1a196]">
            No candidates ranked yet.
          </div>
        ) : (
          candidates.map((c) => {
            const isSelected = selectedCandidateId === c.disease_id;
            const scoreVal = typeof c.similarity_score === "number" ? c.similarity_score : 0;
            const barPct = Math.round(Math.min(1, Math.max(0.08, scoreVal)) * 100);
            const rankBadgeClass =
              c.rank === 1
                ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800"
                : c.rank === 2
                ? "bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800"
                : c.rank === 3
                ? "bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800"
                : "bg-[#f0f0ec] text-[#55554f] border border-[#e0e0da] dark:bg-[#262622] dark:text-[#b8b8ad] dark:border-[#363631]";

            return (
              <button
                key={c.disease_id}
                type="button"
                onClick={() => onSelectCandidate(c.disease_id)}
                className={`candidate-card w-full text-left p-3 rounded-xl border btn-press cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-teal-50/90 border-teal-600 shadow-xs dark:bg-teal-950/45 dark:border-teal-400"
                    : "bg-[#fcfcfb] border-[#e5e5e0] hover:bg-white hover:border-teal-600/60 dark:bg-[#1a1a18] dark:border-[#2e2e2a] dark:hover:bg-[#22221f] dark:hover:border-teal-400/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold tabular-nums shrink-0 ${rankBadgeClass}`}
                    >
                      #{c.rank}
                    </span>
                    <span className="text-xs font-semibold truncate text-[#111] dark:text-[#f3f3ee]">
                      {c.disease_label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.icd11_code && (
                      <span
                        title={c.icd11_title ? `WHO ICD-11: ${c.icd11_title}` : "WHO ICD-11 classification"}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
                      >
                        ICD-11 {c.icd11_code}
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                      {c.disease_id}
                    </span>
                  </div>
                </div>

                {/* Similarity bar */}
                <div className="w-full h-1.5 rounded-full bg-[#e8e8e2] dark:bg-[#262622] overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      isSelected
                        ? "bg-teal-600 dark:bg-teal-400"
                        : c.rank === 1
                        ? "bg-amber-500/85"
                        : "bg-blue-500/75"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#66665f] dark:text-[#a1a196]">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>{c.supporting_observations.length} shared</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={isSelected ? "text-teal-800 dark:text-teal-300 font-semibold" : ""}>
                      {typeof c.similarity_score === "number"
                        ? c.similarity_score.toFixed(3)
                        : "Match"}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-teal-700 dark:text-teal-300" : "text-[#787872] dark:text-[#8f8f85]"
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
