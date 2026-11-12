import { useState } from "react";
import {
  CheckSquare,
  Square,
  Search,
  PlusCircle,
  HelpCircle,
  ArrowRight,
  User,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import type {
  PhenotypeMention,
  Polarity,
  ReviewedObservation,
  Temporality,
  TermSearchResult,
} from "../types/api";
import { HpoSearchModal } from "./HpoSearchModal";

interface MentionReviewerProps {
  mentions: PhenotypeMention[];
  reviewedObservations: Map<string, ReviewedObservation>;
  onToggleConfirm: (mentionId: string) => void;
  onUpdateObservation: (mentionId: string, update: Partial<ReviewedObservation>) => void;
  onAddManualFinding: (term: TermSearchResult) => void;
  onAttestAndMatch: () => void;
  isMatching: boolean;
  theme?: "light" | "dark";
}

export const MentionReviewer: React.FC<MentionReviewerProps> = ({
  mentions,
  reviewedObservations,
  onToggleConfirm,
  onUpdateObservation,
  onAddManualFinding,
  onAttestAndMatch,
  isMatching,
  theme = "light",
}) => {
  const [editingMentionId, setEditingMentionId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  let confirmedPositiveCount = 0;
  let excludedCount = 0;

  reviewedObservations.forEach((obs) => {
    if (obs.review_status === "confirmed") {
      if (obs.polarity === "present" && obs.experiencer === "patient" && obs.temporality !== "historical") {
        confirmedPositiveCount++;
      } else {
        excludedCount++;
      }
    }
  });

  const canMatch = confirmedPositiveCount > 0 && !isMatching;

  return (
    <div className="surface-card p-5 sm:p-6 flex flex-col">
      <div className="flex items-start justify-between pb-4 border-b border-[#ecece6] dark:border-[#262622] gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111] dark:text-[#f3f3ee] m-0">
              Clinician review gate
            </h2>
          </div>
          <p className="text-xs text-[#66665f] dark:text-[#a1a196] mt-1">
            Confirm or adjust extracted findings, polarity, and family context before ranking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsManualModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50/90 hover:bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800 btn-press cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add HPO term</span>
        </button>
      </div>

      <div className="divide-y divide-[#ecece6] dark:divide-[#262622] my-1">
        {mentions.length === 0 ? (
          <div className="text-center py-14 px-4">
            <HelpCircle className="w-6 h-6 text-[#8d8d86] dark:text-[#787872] mx-auto mb-2" />
            <p className="text-xs text-[#55554f] dark:text-[#c7c7be] font-medium">No phenotype mentions extracted yet.</p>
            <p className="text-[11px] text-[#66665f] dark:text-[#a1a196] font-mono mt-1">
              Extract a note on Step 1 or add an HPO term manually above.
            </p>
          </div>
        ) : (
          mentions.map((m) => {
            const obs = reviewedObservations.get(m.mention_id);
            const isConfirmed = obs?.review_status === "confirmed";
            const polarity = obs?.polarity || m.polarity;
            const experiencer = obs?.experiencer || m.experiencer;
            const temporality = obs?.temporality || m.temporality;
            const hpoId = obs?.hpo_id || m.hpo_candidates[0]?.hpo_id || "unmapped";
            const hpoLabel = m.hpo_candidates.find((c) => c.hpo_id === hpoId)?.label || hpoId;

            const statusDotClass = !isConfirmed
              ? "bg-[#cfcfc8] dark:bg-[#44443e]"
              : polarity === "negated"
              ? "bg-rose-500"
              : polarity === "uncertain" || experiencer === "family_member" || temporality === "historical"
              ? "bg-amber-500"
              : "bg-emerald-500";

            const nextTemporality: Temporality =
              temporality === "current" ? "onset" : temporality === "onset" ? "historical" : "current";

            return (
              <div
                key={m.mention_id}
                className={`py-4 first:pt-3.5 last:pb-3.5 transition-opacity duration-150 ${
                  isConfirmed ? "opacity-100" : "opacity-55"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleConfirm(m.mention_id)}
                      className="mt-0.5 text-[#111] dark:text-[#f3f3ee] btn-press cursor-pointer shrink-0"
                      aria-label={isConfirmed ? `Exclude ${m.source_span.quote}` : `Confirm ${m.source_span.quote}`}
                      title={isConfirmed ? "Confirmed finding (click to exclude)" : "Excluded finding (click to include)"}
                    >
                      {isConfirmed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#7b7b72] dark:text-[#8f8f85]" />
                      )}
                    </button>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotClass}`} aria-hidden="true" />
                      <span
                        className={`text-sm font-medium ${
                          polarity === "negated"
                            ? "line-through text-[#66665f] dark:text-[#8f8f85]"
                            : "text-[#111] dark:text-[#f3f3ee]"
                        }`}
                      >
                        &ldquo;{m.source_span.quote}&rdquo;
                      </span>
                      <span className="text-[11px] font-mono text-[#787872] dark:text-[#8c8c84] tabular-nums">
                        [{m.source_span.start}:{m.source_span.end}]
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingMentionId(m.mention_id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/90 hover:bg-blue-100 text-blue-800 border border-blue-200/80 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800 text-[11px] font-mono shrink-0 btn-press cursor-pointer"
                    title="Click to remap HPO term"
                    aria-label={`Change HPO term for ${m.source_span.quote}`}
                  >
                    <span className="font-medium truncate max-w-[140px] sm:max-w-[220px]">{hpoLabel}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">{hpoId}</span>
                    <Search className="w-2.5 h-2.5 opacity-70" />
                  </button>
                </div>

                {/* Airy inline controls with >= 8px touch gap */}
                <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono pl-0 sm:pl-6.5">
                  {(["present", "negated", "uncertain"] as Polarity[]).map((p) => {
                    const selected = polarity === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onUpdateObservation(m.mention_id, { polarity: p })}
                        className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                          selected
                            ? p === "present"
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200 font-semibold"
                              : p === "negated"
                              ? "bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200 font-semibold"
                              : "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 font-semibold"
                            : "text-[#66665f] hover:text-[#111] hover:bg-[#efefeb] dark:text-[#a1a196] dark:hover:text-[#f3f3ee] dark:hover:bg-[#262622]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <span className="text-[#d6d6ce] dark:text-[#3a3a32]" aria-hidden="true">|</span>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObservation(m.mention_id, {
                        experiencer: experiencer === "patient" ? "family_member" : "patient",
                      })
                    }
                    title="Click to switch between Patient and Family history"
                    className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      experiencer === "family_member"
                        ? "bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 font-semibold"
                        : "bg-[#f3f3ef] text-[#44443f] hover:bg-[#e8e8e2] dark:bg-[#22221f] dark:text-[#d4d4cc] dark:hover:bg-[#2d2d29]"
                    }`}
                  >
                    {experiencer === "patient" ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    <span>{experiencer === "patient" ? "Patient" : "Family"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateObservation(m.mention_id, { temporality: nextTemporality })}
                    title="Click to cycle timing: Current -> Onset -> Historical"
                    className={`px-2.5 py-1 rounded-md capitalize inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      temporality === "historical"
                        ? "bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 font-semibold"
                        : "bg-[#f3f3ef] text-[#44443f] hover:bg-[#e8e8e2] dark:bg-[#22221f] dark:text-[#d4d4cc] dark:hover:bg-[#2d2d29]"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{temporality}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 mt-1 border-t border-[#ecece6] dark:border-[#262622] flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs">
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="text-teal-800 dark:text-teal-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{confirmedPositiveCount} active for matching</span>
            </span>
            {excludedCount > 0 && (
              <span className="text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{excludedCount} excluded context</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#66665f] dark:text-[#a1a196] mt-0.5">
            Lin semantic similarity scores confirmed positive patient observations only.
          </p>
        </div>

        <button
          type="button"
          onClick={onAttestAndMatch}
          disabled={!canMatch}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold btn-press ${
            isMatching
              ? "bg-[#f0f0ec] text-[#111] border border-[#cfcfc8] dark:bg-[#262622] dark:text-[#f3f3ee] dark:border-[#363631] cursor-wait"
              : canMatch
              ? "bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-[#042f2e] shadow-xs hover-lift cursor-pointer"
              : "bg-[#e5e5e0] text-[#787872] dark:bg-[#242420] dark:text-[#66665f] cursor-not-allowed"
          }`}
        >
          {isMatching ? (
            <>
              <ThinkingOrb state="solving" size={20} theme={theme} aria-hidden="true" />
              <span role="status" aria-live="polite">Traversing HPO DAG…</span>
            </>
          ) : (
            <>
              <span>Attest findings &amp; match</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {isManualModalOpen && (
        <HpoSearchModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSelectTerm={(term) => {
            onAddManualFinding(term);
            setIsManualModalOpen(false);
          }}
          theme={theme}
        />
      )}

      {editingMentionId && (
        <HpoSearchModal
          isOpen={!!editingMentionId}
          onClose={() => setEditingMentionId(null)}
          onSelectTerm={(term) => {
            onUpdateObservation(editingMentionId, {
              hpo_id: term.hpo_id,
            });
            setEditingMentionId(null);
          }}
          theme={theme}
        />
      )}
    </div>
  );
};
