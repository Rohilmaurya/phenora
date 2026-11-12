import React, { useState, useRef } from "react";
import {
  GitCommit,
  AlertOctagon,
  Stethoscope,
  MessageCircle,
  Dna,
  BookOpen,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Candidate, ExcludedObservation } from "../types/api";
import { getDiseaseExplanation } from "../lib/diseaseExplanations";
import { MOTION_EASE, prefersReducedMotion } from "../lib/motion";

gsap.registerPlugin(useGSAP);

interface EvidenceInspectorProps {
  selectedCandidate: Candidate | null;
  excludedObservations: ExcludedObservation[];
  isPinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  selectedCandidate,
  excludedObservations,
  isPinned = false,
  onTogglePin,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"medical" | "plain" | "evidence">("medical");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !tabContentRef.current || !selectedCandidate) return;
      gsap.fromTo(
        tabContentRef.current,
        { opacity: 0.35, y: 5 },
        {
          opacity: 1,
          y: 0,
          duration: 0.18,
          ease: MOTION_EASE.uiOut,
          clearProps: "transform,opacity",
        }
      );
    },
    { scope: cardRef, dependencies: [activeTab, selectedCandidate?.disease_id] }
  );

  const explanation = selectedCandidate
    ? getDiseaseExplanation(selectedCandidate.disease_id, selectedCandidate.disease_label)
    : null;

  if (!selectedCandidate) {
    return (
      <div className="p-5 rounded-2xl bg-white/95 dark:bg-[#151513]/95 backdrop-blur-md border border-[#e5e5e0] dark:border-[#2e2e2a] shadow-xl text-center text-xs text-[#66665f] dark:text-[#a1a196]">
        <BookOpen className="w-6 h-6 text-[#8d8d86] dark:text-[#787872] mx-auto mb-2" />
        <p className="font-semibold text-sm text-[#111] dark:text-[#f3f3ee] mb-1">No candidate selected</p>
        <p>Select a candidate condition to inspect evidence.</p>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${selectedCandidate.disease_label} evidence inspector`}
      className="disease-hover-card-enter flex flex-col max-h-full bg-white dark:bg-[#161614] ring-1 ring-black/[0.08] dark:ring-white/[0.1] rounded-2xl shadow-[0_24px_60px_-14px_rgba(15,23,42,0.24),0_6px_20px_-6px_rgba(15,23,42,0.09)] dark:shadow-[0_28px_64px_-12px_rgba(0,0,0,0.88)] overflow-hidden"
    >
      {/* Top Document Accent Strip — distinguishes the floating card from graph nodes */}
      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-400 shrink-0"
      />

      {/* Card Header: Disease Identity + Pin & Close */}
      <div className="px-5 pt-4 pb-3.5 border-b border-[#ecece6] dark:border-[#262622] shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 tabular-nums">
              Rank #{selectedCandidate.rank}
            </span>
            {selectedCandidate.icd11_code && (
              <span
                title={selectedCandidate.icd11_title || "WHO ICD-11 classification"}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
              >
                WHO ICD-11: {selectedCandidate.icd11_code}
              </span>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f4f4f0] text-[#55554f] dark:bg-[#22221e] dark:text-[#b2b2a7]">
              {selectedCandidate.disease_id}
            </span>
            {selectedCandidate.orpha_code && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f4f4f0] text-[#66665f] dark:bg-[#22221e] dark:text-[#9c9c92]">
                {selectedCandidate.orpha_code}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onTogglePin && (
              <button
                type="button"
                onClick={onTogglePin}
                title={isPinned ? "Unpin card" : "Pin card open"}
                aria-pressed={isPinned}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono transition-colors cursor-pointer ${
                  isPinned
                    ? "bg-teal-700 text-white dark:bg-teal-500 dark:text-[#042f2e] font-semibold"
                    : "bg-[#f4f4f0] text-[#55554f] hover:text-[#111] hover:bg-[#e8e8e2] dark:bg-[#22221e] dark:text-[#b2b2a7] dark:hover:text-[#f3f3ee]"
                }`}
              >
                {isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                <span>{isPinned ? "Pinned" : "Pin"}</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close disease evidence card"
                className="w-6 h-6 inline-flex items-center justify-center rounded-full text-[#66665f] hover:text-[#111] hover:bg-[#f0f0ec] dark:text-[#a1a196] dark:hover:text-[#f3f3ee] dark:hover:bg-[#262622] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base sm:text-[17px] font-bold text-[#111] dark:text-[#f3f3ee] tracking-tight leading-snug m-0">
          {selectedCandidate.disease_label}
        </h3>
        <div className="text-[11px] font-mono text-[#66665f] dark:text-[#a1a196] mt-0.5 tabular-nums">
          Lin similarity{" "}
          <strong className="text-teal-800 dark:text-teal-300 font-semibold">
            {typeof selectedCandidate.similarity_score === "number"
              ? selectedCandidate.similarity_score.toFixed(4)
              : "Curated match"}
          </strong>
        </div>

        <div
          role="tablist"
          aria-label="Disease explanation views"
          className="mt-3 flex items-center p-1 bg-[#f4f4f0] dark:bg-[#1e1e1b] rounded-lg gap-1 text-[11px] font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "medical"}
            onClick={() => setActiveTab("medical")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              activeTab === "medical"
                ? "bg-white text-[#111] font-semibold shadow-2xs dark:bg-[#2a2a26] dark:text-[#f3f3ee]"
                : "text-[#55554f] hover:text-[#111] dark:text-[#a1a196] dark:hover:text-[#f3f3ee]"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
            <span>Medical</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "plain"}
            onClick={() => setActiveTab("plain")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              activeTab === "plain"
                ? "bg-white text-[#111] font-semibold shadow-2xs dark:bg-[#2a2a26] dark:text-[#f3f3ee]"
                : "text-[#55554f] hover:text-[#111] dark:text-[#a1a196] dark:hover:text-[#f3f3ee]"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>Plain language</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "evidence"}
            onClick={() => setActiveTab("evidence")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md whitespace-nowrap transition-colors duration-150 cursor-pointer tabular-nums ${
              activeTab === "evidence"
                ? "bg-white text-[#111] font-semibold shadow-2xs dark:bg-[#2a2a26] dark:text-[#f3f3ee]"
                : "text-[#55554f] hover:text-[#111] dark:text-[#a1a196] dark:hover:text-[#f3f3ee]"
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
            <span>Evidence ({selectedCandidate.supporting_observations.length})</span>
          </button>
        </div>
      </div>

      {/* Borderless Editorial Inspector Body */}
      <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto space-y-4">
        <div ref={tabContentRef}>
          {activeTab === "medical" && explanation && (
            <div className="divide-y divide-[#ecece6] dark:divide-[#262622]">
              <section className="pb-3.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  <Dna className="w-3.5 h-3.5 shrink-0" />
                  <span>Etiology &amp; overview</span>
                </div>
                <p className="text-[#33332f] dark:text-[#d8d8d0] leading-relaxed m-0">
                  {explanation.medical.overview}
                </p>
                <div className="pt-1 text-[10px] font-mono text-teal-700 dark:text-teal-300/90 font-medium">
                  {explanation.medical.genetics}
                </div>
              </section>

              <section className="py-3.5 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono font-semibold text-[#66665f] dark:text-[#a1a196] uppercase tracking-wider block">
                  Clinical hallmarks
                </span>
                <ul className="space-y-1 text-[#3a3a35] dark:text-[#c7c7be] list-disc list-inside m-0">
                  {explanation.medical.clinicalHallmarks.map((h, idx) => (
                    <li key={idx} className="leading-snug">
                      {h}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="pt-3.5 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono font-semibold text-[#66665f] dark:text-[#a1a196] uppercase tracking-wider block">
                  Surveillance &amp; workup
                </span>
                <p className="text-[#3a3a35] dark:text-[#c7c7be] leading-relaxed text-[11.5px] m-0">
                  {explanation.medical.management}
                </p>
              </section>
            </div>
          )}

          {activeTab === "plain" && explanation && (
            <div className="divide-y divide-[#ecece6] dark:divide-[#262622]">
              <section className="pb-3.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Family summary</span>
                </div>
                <p className="text-[#222] dark:text-[#e5e5dd] leading-relaxed m-0">
                  {explanation.plainLanguage.summary}
                </p>
              </section>

              <section className="py-3.5 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono font-semibold text-[#66665f] dark:text-[#a1a196] uppercase tracking-wider block">
                  Everyday comparison
                </span>
                <p className="text-[#3a3a35] dark:text-[#c7c7be] leading-relaxed italic m-0">
                  &ldquo;{explanation.plainLanguage.analogy}&rdquo;
                </p>
              </section>

              <section className="py-3.5 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono font-semibold text-[#66665f] dark:text-[#a1a196] uppercase tracking-wider block">
                  What families notice
                </span>
                <ul className="space-y-1 text-[#3a3a35] dark:text-[#c7c7be] list-disc list-inside m-0">
                  {explanation.plainLanguage.keySigns.map((s, idx) => (
                    <li key={idx} className="leading-snug">
                      {s}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="pt-3.5 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  Questions for genetics specialist
                </span>
                <p className="text-[#3a3a35] dark:text-[#c7c7be] leading-relaxed text-[11.5px] m-0">
                  {explanation.plainLanguage.careFocus}
                </p>
              </section>
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="divide-y divide-[#ecece6] dark:divide-[#262622]">
              {selectedCandidate.supporting_observations.map((obs, idx) => (
                <div
                  key={obs.observation_id || idx}
                  className="py-3 first:pt-0 last:pb-0 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#111] dark:text-[#f3f3ee] font-mono">
                      {obs.case_hpo_id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 capitalize">
                      {obs.relation.replace("_", " ")}
                    </span>
                  </div>

                  {obs.ontology_paths && obs.ontology_paths.length > 0 && (
                    <div className="text-[11px] font-mono text-[#55554f] dark:text-[#b2b2a7]">
                      <span className="text-[#88887f]">Path: </span>
                      {obs.ontology_paths[0]?.join(" -> ") || "Direct match"}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#787872] dark:text-[#9c9c92]">
                    <span>{obs.annotation.source}</span>
                    <span className="truncate max-w-[175px]">{obs.annotation.reference}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {excludedObservations.length > 0 && (
          <div className="pt-3.5 border-t border-[#e5e5e0] dark:border-[#2a2a26]">
            <h4 className="text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 tabular-nums">
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              Excluded context ({excludedObservations.length})
            </h4>
            <div className="divide-y divide-[#f0f0ec] dark:divide-[#262622]">
              {excludedObservations.map((ex) => (
                <div
                  key={ex.observation_id}
                  className="py-1.5 text-[11px] font-mono text-[#55554f] dark:text-[#b2b2a7] flex items-center justify-between"
                >
                  <span>ID: {ex.observation_id.slice(0, 8)}</span>
                  <span className="capitalize text-amber-800 dark:text-amber-300">
                    {ex.reason.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
