import React from "react";
import {
  ArrowLeft,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";
import { PhenoraLogo } from "./PhenoraLogo";
import type { HealthResponse } from "../types/api";

interface HeaderProps {
  health: HealthResponse | null;
  healthError: string | null;
  onRefreshHealth: () => void;
  onResetSession: () => void;
  currentView: "landing" | "workbench";
  onSwitchView: (view: "landing" | "workbench") => void;
  theme: "light" | "dark";
  onToggleTheme: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  healthError,
  onRefreshHealth,
  onResetSession,
  currentView,
  onSwitchView,
  theme,
  onToggleTheme,
}) => {
  const isReady = health?.status === "ready";
  const isDark = theme === "dark";

  return (
    <header className="border-b border-[#e5e5e0]/80 dark:border-[#242420] bg-[#f7f7f5]/90 dark:bg-[#0c0c0b]/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onSwitchView("landing")}
          className="inline-flex items-center cursor-pointer text-left group btn-press rounded-lg py-0.5 pr-1 min-w-0"
          aria-label="Phenora overview"
        >
          <PhenoraLogo
            size={24}
            className="group-hover:opacity-80 transition-opacity"
          />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isReady && healthError && (
            <button
              type="button"
              onClick={onRefreshHealth}
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 btn-press cursor-pointer"
              title={`Backend check failed: ${healthError}. Click to retry.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden="true" />
              <span>Engine offline</span>
            </button>
          )}

          {currentView === "landing" ? (
            <>
              <nav
                className="hidden md:flex items-center gap-6 text-xs font-medium text-[#66665f] dark:text-[#9c9c92] mr-2"
                aria-label="Overview sections"
              >
                {[
                  { id: "why-phenora", label: "Diagnostic gap" },
                  { id: "how-it-works", label: "Workflow" },
                  { id: "clinician-safety", label: "Safety design" },
                ].map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      if (window.location.hash) {
                        window.history.replaceState(null, "", window.location.pathname + window.location.search);
                      }
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:text-[#111] dark:hover:text-[#f3f3ee] transition-colors py-1"
                  >
                    {label}
                  </a>
                ))}
              </nav>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-pressed={isDark}
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#55554f] dark:text-[#b2b2a8] hover:text-[#111] dark:hover:text-[#f3f3ee] hover:bg-[#eaeae5] dark:hover:bg-[#1f1f1b] transition-colors btn-press cursor-pointer"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => onSwitchView("workbench")}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#111] hover:bg-black dark:bg-[#f3f3ee] dark:hover:bg-white text-white dark:text-[#0c0c0b] text-xs font-medium btn-press hover-lift cursor-pointer"
              >
                Open workbench
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSwitchView("landing")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#55554f] dark:text-[#a8a89f] hover:text-[#111] dark:hover:text-[#f3f3ee] hover:bg-[#eaeae5] dark:hover:bg-[#1f1f1b] transition-colors btn-press cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-pressed={isDark}
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#55554f] dark:text-[#b2b2a8] hover:text-[#111] dark:hover:text-[#f3f3ee] hover:bg-[#eaeae5] dark:hover:bg-[#1f1f1b] transition-colors btn-press cursor-pointer"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onResetSession}
                aria-label="Wipe session"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors btn-press cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="sm:hidden">Wipe</span>
                <span className="hidden sm:inline">Wipe session</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
