import React from "react";
import { FileText, Cpu, Eraser } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import type { PhenotypeMention } from "../types/api";

interface NoteEditorProps {
  noteText: string;
  onChangeText: (text: string) => void;
  onExtract: () => void;
  isExtracting: boolean;
  mentions: PhenotypeMention[];
  onClear: () => void;
  theme?: "light" | "dark";
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteText,
  onChangeText,
  onExtract,
  isExtracting,
  mentions,
  onClear,
  theme = "light",
}) => {
  const charCount = noteText.length;
  const isOverLimit = charCount > 50000;
  const canExtract = noteText.trim().length > 10 && !isOverLimit && !isExtracting;

  return (
    <div className="surface-card p-5 sm:p-6 flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between mb-3.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111] dark:text-[#f3f3ee] m-0 whitespace-nowrap">
            Clinical note
          </h2>
          {mentions.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 tabular-nums whitespace-nowrap shrink-0">
              {mentions.length} extracted
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-xs font-mono tabular-nums whitespace-nowrap ${
              isOverLimit ? "text-rose-700 dark:text-rose-400 font-semibold" : "text-[#66665f] dark:text-[#a1a196]"
            }`}
          >
            {charCount.toLocaleString()} / 50,000
          </span>

          {noteText && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-[#66665f] hover:text-[#111] dark:text-[#a1a196] dark:hover:text-[#f3f3ee] flex items-center gap-1 whitespace-nowrap btn-press cursor-pointer"
              title="Clear note text"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative mb-4">
        <textarea
          value={noteText}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Paste clinical note, dysmorphology findings, or family history..."
          rows={9}
          className="w-full h-full min-h-[220px] bg-[#fafaf8] dark:bg-[#1a1a18] border border-[#e5e5e0] dark:border-[#2e2e2a] rounded-xl p-4 text-[13px] text-[#111] dark:text-[#f3f3ee] font-sans leading-relaxed resize-y focus:outline-none focus:border-teal-600 focus:bg-white dark:focus:border-teal-400 dark:focus:bg-[#20201d] transition-[border-color,background-color] duration-150"
        />
      </div>

      <div className="flex items-center justify-between pt-2 gap-3 flex-wrap border-t border-[#f0f0ec] dark:border-[#262622]">
        <div className="text-[11px] text-[#66665f] dark:text-[#a1a196] font-mono">
          Local NER: <span className="text-teal-800 dark:text-teal-300 font-medium">llama3.2:3b</span> · Air-gapped RAM
        </div>

        <button
          type="button"
          onClick={onExtract}
          disabled={!canExtract}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold btn-press ${
            isExtracting
              ? "bg-[#f0f0ec] text-[#111] border border-[#cfcfc8] dark:bg-[#262622] dark:text-[#f3f3ee] dark:border-[#363631] cursor-wait"
              : canExtract
              ? "bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-[#042f2e] shadow-xs hover-lift cursor-pointer"
              : "bg-[#e5e5e0] text-[#787872] dark:bg-[#242420] dark:text-[#66665f] cursor-not-allowed"
          }`}
        >
          {isExtracting ? (
            <>
              <ThinkingOrb state="searching" size={20} theme={theme} aria-hidden="true" />
              <span role="status" aria-live="polite">Extracting phenotypes…</span>
            </>
          ) : (
            <>
              <Cpu className="w-3.5 h-3.5" />
              <span>Extract phenotypes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
