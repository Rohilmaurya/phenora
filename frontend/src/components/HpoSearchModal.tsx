import React, { useState, useEffect } from "react";
import { Search, Check, X, BookOpen } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { searchHpoTerms } from "../lib/api";
import type { TermSearchResult } from "../types/api";

interface HpoSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTerm: (term: TermSearchResult) => void;
  title?: string;
  initialQuery?: string;
  theme?: "light" | "dark";
}

export const HpoSearchModal: React.FC<HpoSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTerm,
  title = "Search Human Phenotype Ontology (HPO)",
  initialQuery = "",
  theme = "light",
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TermSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await searchHpoTerms(query.trim(), 15);
        setResults(response.results);
      } catch (err: any) {
        setError(err.message || "Failed to search HPO terms");
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-enter bg-white dark:bg-[#151513] border border-[#e5e5e0] dark:border-[#2e2e2a] rounded-2xl max-w-xl w-full flex flex-col max-h-[85vh] shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#e5e5e0] dark:border-[#2e2e2a] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#111] dark:text-[#f3f3ee]" />
            <h3 className="text-sm font-semibold text-[#111] dark:text-[#f3f3ee]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#66665f] hover:text-[#111] hover:bg-[#f0f0ec] dark:text-[#a1a196] dark:hover:text-[#f3f3ee] dark:hover:bg-[#242420] btn-press cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-[#f0f0ec] dark:border-[#2a2a26] bg-[#fcfcfb] dark:bg-[#1a1a18]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7b7b72] dark:text-[#8f8f85] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search label or synonym (e.g. 'seizures', 'arachnodactyly', 'pectus')..."
              className="w-full text-xs bg-white dark:bg-[#111110] border border-[#e5e5e0] dark:border-[#33332e] rounded-lg pl-9 pr-10 py-2.5 text-[#111] dark:text-[#f3f3ee] focus:outline-none focus:border-[#111] dark:focus:border-[#f3f3ee]"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                <ThinkingOrb state="searching" size={20} theme={theme} aria-hidden="true" />
                <span className="sr-only" role="status">
                  Searching local HPO ontology
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[#66665f] dark:text-[#a1a196] font-mono mt-2">
            Queries local SQLite HPO release 2026-02-01 in request body (no PHI in URLs)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[200px]">
          {error && (
            <div role="alert" className="p-3 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg">
              {error}
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-xs text-[#66665f] dark:text-[#a1a196]">
              No matching HPO terms found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {results.map((term) => (
            <button
              key={`${term.hpo_id}-${term.label}`}
              type="button"
              onClick={() => {
                onSelectTerm(term);
                onClose();
              }}
              className="w-full text-left p-2.5 rounded-lg border border-[#e5e5e0] dark:border-[#2e2e2a] bg-white dark:bg-[#1a1a18] hover:bg-[#f7f7f5] hover:border-[#111] dark:hover:bg-[#22221f] dark:hover:border-[#f3f3ee] transition-[background-color,border-color] duration-150 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-[#111] dark:text-[#f3f3ee] group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">
                    {term.label}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                    {term.hpo_id}
                  </span>
                </div>
                {term.matched_synonym && (
                  <p className="text-[11px] text-[#66665f] dark:text-[#a1a196]">
                    Synonym: &ldquo;{term.matched_synonym}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono text-[#66665f] dark:text-[#a1a196]">
                <span className="capitalize">{term.match_kind}</span>
                <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#111] dark:text-[#f3f3ee] transition-opacity duration-150" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
