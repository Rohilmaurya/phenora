import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export const MOTION_EASE = {
  uiOut: "power3.out",
  moveInOut: "power3.inOut",
  heroSettle: "expo.out",
} as const;

export const MOTION_DURATION = {
  press: 0.14,
  ui: 0.22,
  cardStagger: 0.04,
  scrollReveal: 0.55,
  scrollStagger: 0.07,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Mounts Lenis smooth scrolling synchronized with GSAP ScrollTrigger.
 * Disabled automatically when prefers-reduced-motion is active.
 */
export function initSmoothScroll(): () => void {
  if (prefersReducedMotion()) {
    return () => {};
  }

  const lenis = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on("scroll", onScroll);

  const tick = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    lenis.off("scroll", onScroll);
    lenis.destroy();
  };
}
