import React from "react";

interface PhenoraLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  inverted?: boolean;
}

export const PhenoraLogo: React.FC<PhenoraLogoProps> = ({
  className = "",
  size = 22,
  showWordmark = true,
  inverted = false,
}) => {
  const strokeTone = inverted ? "text-white" : "text-[#111111] dark:text-[#f3f3ee]";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Precision Phenora Mark — Vector Shield with Phenotype Triad */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${strokeTone}`}
        aria-hidden="true"
      >
        {/* Diamond Outer Shield */}
        <polygon
          points="12,2 22,12 12,22 2,12"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
          className="opacity-90"
        />
        {/* Directed Acyclic Graph Struts */}
        <line
          x1="12"
          y1="7.5"
          x2="7.5"
          y2="15.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.45"
          strokeDasharray="1.5 1.5"
        />
        <line
          x1="12"
          y1="7.5"
          x2="16.5"
          y2="15.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.45"
          strokeDasharray="1.5 1.5"
        />
        <line
          x1="7.5"
          y1="15.5"
          x2="16.5"
          y2="15.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />
        {/* Inner MICA Phenotype Nodes */}
        <circle
          cx="12"
          cy="7.5"
          r="1.8"
          className={inverted ? "fill-white" : "fill-[#111111] dark:fill-white"}
        />
        <circle
          cx="7.5"
          cy="15.5"
          r="1.8"
          className={inverted ? "fill-[#38bdf8]" : "fill-[#0284c7] dark:fill-[#38bdf8]"}
        />
        <circle
          cx="16.5"
          cy="15.5"
          r="1.8"
          className={inverted ? "fill-[#34d399]" : "fill-[#0f766e] dark:fill-[#34d399]"}
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={`font-sans font-semibold tracking-tight text-[15px] flex items-center ${
            inverted ? "text-white" : "text-[#111111] dark:text-[#f3f3ee]"
          }`}
        >
          PHENORA
        </span>
      )}
    </div>
  );
};
