import React from "react";
import { Lock, FileText } from "lucide-react";
import { PhenoraLogo } from "./PhenoraLogo";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#000000] text-white/70 pt-12 pb-10 px-6 sm:px-12 mt-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand & Purpose (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center gap-2">
              <PhenoraLogo size={20} inverted />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                Air-Gapped &bull; RAM Only
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-sm">
              An offline clinical phenotype evidence and decision-support canvas for pediatric geneticists and dysmorphology teams navigating rare, undiagnosed diseases.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Strict Zero-Cloud Egress Guarantee</span>
            </div>
          </div>

          {/* Regulatory & Methodology (5 cols) */}
          <div className="md:col-span-5 space-y-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/40">
              Clinical Safety &amp; Non-Device CDS Notice
            </span>
            <p className="text-xs text-white/60 leading-relaxed">
              Phenora operates under the FDA Non-Device Clinical Decision Support (CDS) research guidance. 
              The system identifies medical terms in consultation text and computes deterministic semantic similarity across the 
              official Human Phenotype Ontology (HPO). Ranked candidates represent evidence retrieval and literature overlap; 
              they do not constitute medical diagnoses or disease probabilities.
            </p>
          </div>

          {/* Data & Provenance (3 cols) */}
          <div className="md:col-span-3 space-y-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white/40">
              Data Architecture
            </span>
            <ul className="text-xs text-white/60 space-y-1 font-mono">
              <li>&bull; Human Phenotype Ontology (2026-02)</li>
              <li>&bull; OMIM / Orphanet Disease Catalog</li>
              <li>&bull; Local Ollama Llama 3.2 (3B)</li>
              <li>&bull; In-Memory Execution (0 Disk Writes)</li>
            </ul>
            <div className="pt-2">
              <a
                href="/sample_pediatric_consultation.pdf"
                download="sample_pediatric_consultation.pdf"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Sample Consultation PDF</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Sub-Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/40">
          <div>
            &copy; 2026 Phenora &bull; Air-Gapped Pediatric Medical Genetics Canvas
          </div>
          <div className="font-mono flex items-center gap-4 text-white/50">
            <span>Volatile Memory Only</span>
            <span>&bull;</span>
            <span>Zero Telemetry</span>
            <span>&bull;</span>
            <span>Physician Attested</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
