import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Clock, EyeOff, ShieldCheck } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

interface DilemmaSectionProps {
  onScrollToWorkbench: () => void;
}

export const DilemmaSection: React.FC<DilemmaSectionProps> = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !sectionRef.current || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll(".dilemma-card");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="odyssey"
      ref={sectionRef}
      className="relative z-10 py-28 px-6 sm:px-12 max-w-7xl mx-auto w-full border-t border-white/10 scroll-mt-20"
    >
      {/* Section Header */}
      <div className="max-w-3xl mb-14 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-xs font-mono font-medium text-amber-300 uppercase tracking-widest">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>The Diagnostic Odyssey</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
          Why Diagnosing a Rare Disease Takes 5+ Years
        </h2>

        <p className="text-base text-zinc-300/90 leading-relaxed max-w-2xl font-normal">
          A child with an undiagnosed rare disease typically visits <strong className="text-white font-semibold">8 specialists</strong>, undergoes dozens of inconclusive scans, and generates hundreds of pages of unstandardized notes. Subtle clinical clues remain buried across disparate electronic records.
        </p>
      </div>

      {/* 3 Core Metric Cards (Translucent Dark Glass) */}
      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Card 1: 5.6 Years */}
        <div className="dilemma-card rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-7 shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-amber-400 tracking-tight whitespace-nowrap">
                5.6 Years
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              The Diagnostic Odyssey
            </h3>

            <p className="text-sm text-zinc-300/80 leading-relaxed">
              Families endure an agonizing multi-year search for answers. Phenora accelerates this process by synthesizing physical hallmarks into standardized HPO ontology terms in seconds.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>EURORDIS Rare Disease Study</span>
            <span className="text-amber-300/80 font-medium">18,400+ Terms</span>
          </div>
        </div>

        {/* Card 2: 72% Missed */}
        <div className="dilemma-card rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-7 shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-rose-400 tracking-tight whitespace-nowrap">
                72% Missed
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center justify-center">
                <EyeOff className="w-4 h-4 text-rose-400" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Overlooked Subtle Signs
            </h3>

            <p className="text-sm text-zinc-300/80 leading-relaxed">
              Mild joint hypermobility, high-arched palate, or subtle corneal opacities are frequently dismissed in general exams. Phenora captures every physical sign and maps it to causal syndromes.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>Dysmorphology Benchmark</span>
            <span className="text-rose-300/80 font-medium">0 Hallucinations</span>
          </div>
        </div>

        {/* Card 3: Zero Cloud Egress */}
        <div className="dilemma-card rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-7 shadow-2xl hover:border-white/20 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 tracking-tight whitespace-nowrap">
                0 Cloud Egress
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Total Data Sovereignty
            </h3>

            <p className="text-sm text-zinc-300/80 leading-relaxed">
              Pediatric genetic information is sensitive and immutable. Phenora executes 100% in volatile RAM with zero network egress, fully compliant with strict hospital air-gap guidelines.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-zinc-400 flex items-center justify-between">
            <span>HIPAA &amp; GDPR Air-Gap</span>
            <span className="text-emerald-300/80 font-medium">Volatile RAM</span>
          </div>
        </div>
      </div>
    </section>
  );
};
