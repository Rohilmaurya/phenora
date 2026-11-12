import React from "react";
import { ShieldAlert } from "lucide-react";

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-[#f0f0ec] dark:bg-[#141412] border-t border-[#e5e5e0] dark:border-[#262622] px-4 sm:px-6 py-3.5 text-xs text-[#55554f] dark:text-[#a3a39a] transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-[#111] dark:text-[#f3f3ee]">FDA CDS Compliance:</strong>{" "}
            Research prototype. Candidate order reflects deterministic ontology similarity,{" "}
            <strong className="text-[#111] dark:text-[#f3f3ee]">
              not a clinical diagnosis, risk score, or disease probability
            </strong>
            .
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#66665f] dark:text-[#8c8c84]">
          Clinician attestation required before graph ranking
        </span>
      </div>
    </div>
  );
};
