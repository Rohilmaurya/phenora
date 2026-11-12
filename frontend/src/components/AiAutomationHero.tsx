import React from "react";
import { motion } from "framer-motion";
import { FadeUp } from "./FadeUp";
import { ArrowDown, ArrowRight, ShieldCheck, Stethoscope } from "lucide-react";

interface AiAutomationHeroProps {
  onExplorePhenora: () => void;
  onLaunchWorkbench: () => void;
}

export const AiAutomationHero: React.FC<AiAutomationHeroProps> = ({
  onExplorePhenora,
  onLaunchWorkbench,
}) => {
  const words = ["WE", "BUILD", "END-TO-END", "AI", "AUTOMATION", "SYSTEMS."];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white selection:bg-white selection:text-black">
      <style>{`
        .ai-hero-section {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100vh;
          padding: 70px 32px 32px 32px;
          font-family: 'Helvetica Now Var', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        @media (max-width: 900px) {
          .ai-hero-section {
            padding: 90px 18px 32px 18px !important;
          }
        }
      `}</style>

      {/* Background Video (Fixed, behind everything) */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100vh",
          objectFit: "cover",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_135830_bb6491d1-9b66-4aec-9722-13b4dfe3fb46.mp4"
          type="video/mp4"
        />
      </video>

      {/* Subtle overlay scrim for contrast and legibility */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.65) 100%)",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Top minimal header bar */}
      <header
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 pt-6 max-w-7xl mx-auto w-full"
        style={{ fontFamily: "'Helvetica Now Var', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-sm tracking-wider uppercase text-white">
            PHENORA
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 px-2 py-0.5 rounded-full border border-white/15 bg-white/5">
            Operational Systems
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExplorePhenora}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white px-3.5 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-colors cursor-pointer"
          >
            <span>Phenora Architecture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onLaunchWorkbench}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black px-4 py-2 rounded-full bg-white hover:bg-zinc-200 transition-transform hover:-translate-y-0.5 cursor-pointer shadow-md"
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
            <span>Workbench</span>
          </button>
        </div>
      </header>

      {/* Main Full-Viewport Section (100vh, Fully Transparent over video) */}
      <section className="ai-hero-section max-w-7xl mx-auto w-full">
        {/* Content Block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            maxWidth: "720px",
          }}
        >
          {/* Heading (<h2>): Words with staggered fade-up */}
          <h2
            style={{
              fontSize: "clamp(26px, 3vw, 42px)",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              color: "#fff",
              margin: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.25em",
              }}
            >
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15 + i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ display: "inline-block" }}
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </h2>

          {/* Subtext (<p>) */}
          <FadeUp
            as="p"
            delay={0.9}
            duration={0.7}
            y={24}
            style={{
              marginTop: "24px",
              fontSize: "14px",
              lineHeight: 1.65,
              color: "rgba(255, 255, 255, 0.85)",
              maxWidth: "260px",
            }}
          >
            We provide all-in-one AI automation services in one place.
          </FadeUp>

          {/* Action CTAs to seamlessly enter the platform */}
          <FadeUp
            delay={1.1}
            duration={0.7}
            y={24}
            className="mt-8 flex items-center gap-3.5 flex-wrap"
          >
            <button
              onClick={onExplorePhenora}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 shadow-lg cursor-pointer"
            >
              <span>Explore Phenora Architecture</span>
              <ArrowDown className="w-4 h-4" />
            </button>

            <button
              onClick={onLaunchWorkbench}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-white/30 bg-black/40 hover:bg-white/10 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-md transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Launch Clinical Workbench</span>
            </button>
          </FadeUp>
        </div>

        {/* Bottom subtle scroll cue */}
        <div className="absolute bottom-8 left-6 sm:left-10 right-6 sm:right-10 flex items-center justify-between text-xs font-mono text-white/50 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Air-Gapped Operational Infrastructure</span>
          </div>

          <button
            onClick={onExplorePhenora}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <span>Scroll for Clinical Intelligence</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </button>
        </div>
      </section>
    </div>
  );
};
