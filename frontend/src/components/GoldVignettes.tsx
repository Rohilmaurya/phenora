import React from "react";
import { GOLD_CASES, type GoldCase } from "../data/goldCases";
import { Dna, ShieldCheck } from "lucide-react";

interface GoldVignettesProps {
  activeCaseId: string | null;
  onSelectCase: (c: GoldCase) => void;
}

const CASE_DOT_COLORS: Record<string, string> = {
  "SYN-PED-001": "bg-blue-500",
  "SYN-PED-002": "bg-teal-500",
  "SYN-PED-003": "bg-amber-500",
  "SYN-PED-004": "bg-indigo-500",
};

export const GoldVignettes: React.FC<GoldVignettesProps> = ({
  activeCaseId,
  onSelectCase,
}) => {
  const activeCase = GOLD_CASES.find((c) => c.id === activeCaseId) || null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#66665f] dark:text-[#a1a196] mr-1">
          Sample cases
        </span>
        {GOLD_CASES.map((c) => {
          const isActive = activeCaseId === c.id;
          const dotClass = CASE_DOT_COLORS[c.id] || "bg-teal-500";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCase(c)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer btn-press ${
                isActive
                  ? "bg-teal-700 border-teal-700 text-white shadow-2xs dark:bg-teal-500 dark:border-teal-500 dark:text-[#042f2e] font-semibold"
                  : "bg-white/90 border-[#e0e0da] text-[#33332f] hover:border-teal-600/60 hover:text-[#111] dark:bg-[#181816] dark:border-[#2e2e2a] dark:text-[#d4d4cc] dark:hover:border-teal-400/60 dark:hover:text-[#f3f3ee]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? "bg-white dark:bg-[#042f2e]" : dotClass
                }`}
              />
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {activeCase && (
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#66665f] dark:text-[#a1a196] pl-0.5">
          <span>{activeCase.description}</span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-50/90 text-teal-800 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 shrink-0">
            {activeCase.omimId === "N/A" ? (
              <ShieldCheck className="w-3 h-3 shrink-0" />
            ) : (
              <Dna className="w-3 h-3 shrink-0" />
            )}
            <span>{activeCase.geneOrCategory}</span>
          </span>
        </div>
      )}
    </div>
  );
};
