import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./motion";

const CLIP_ID = "phenora-paint-clip";
const PAINT_SVG_ID = "phenora-paint-svg-defs";
const PAINTING_CLASS = "theme-painting";
const TOTAL_DURATION_MS = 960;

export interface PaintOrigin {
  x: number;
  y: number;
}

interface SatelliteSpec {
  angle: number;
  distFactor: number;
  radius: number;
}

interface DropSpec {
  id: number;
  seed: number;
  /** Fraction of viewport width where impact lands */
  tx: number;
  /** Fraction of viewport height where impact lands */
  ty: number;
  /** Normalized start offset along [0..1] timeline */
  startU: number;
  /** Normalized impact time along [0..1] timeline */
  impactU: number;
  /** Normalized completion time along [0..1] timeline */
  endU: number;
  /** Initial drop size factor */
  dropScale: number;
  /** Rotation of organic splat silhouette in degrees */
  rotDeg: number;
  /** Final spread multiplier relative to viewport diagonal / 140 */
  spreadFactor: number;
  fromOrigin?: boolean;
  satellites: SatelliteSpec[];
}

// Smooth Catmull-Rom closed curve helper so paint splats look fluid, not polygonal
function closedCatmullRomToBezierPath(pts: Array<{ x: number; y: number }>): string {
  const n = pts.length;
  if (n < 3) return "";
  const fmt = (v: number) => v.toFixed(1);
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  const tension = 0.5;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const c1x = p1.x + ((p2.x - p0.x) / 6) * (tension * 2);
    const c1y = p1.y + ((p2.y - p0.y) / 6) * (tension * 2);
    const c2x = p2.x - ((p3.x - p1.x) / 6) * (tension * 2);
    const c2y = p2.y - ((p3.y - p1.y) / 6) * (tension * 2);

    d += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
  }

  return `${d} Z`;
}

/**
 * Generates an organic liquid-paint splash silhouette centered at (0, 0)
 * with smooth uneven puddles and outward radial splatter fingers.
 */
function buildOrganicSplatPath(seed: number, fingerCount = 6): string {
  const fingerAngles: Array<{ angle: number; reach: number; width: number }> = [];
  for (let k = 0; k < fingerCount; k++) {
    const jitter = Math.sin(seed * 7.3 + k * 4.1) * 0.28;
    const angle = (k / fingerCount) * Math.PI * 2 + jitter;
    const reach = 38 + Math.abs(Math.sin(seed * 3.7 + k * 2.9)) * 56;
    const width = 0.14 + Math.abs(Math.cos(seed * 5.1 + k * 1.7)) * 0.1;
    fingerAngles.push({ angle, reach, width });
  }

  const samples = 44;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    let r =
      58 +
      11 * Math.sin(2 * theta + seed * 1.9) +
      9 * Math.cos(3 * theta - seed * 2.7) +
      7 * Math.sin(5 * theta + seed * 0.8) +
      5 * Math.cos(7 * theta - seed * 1.4);

    for (const f of fingerAngles) {
      let diff = theta - f.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const g = Math.exp(-((diff * diff) / (f.width * f.width)));
      r += f.reach * g;
    }

    pts.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
  }

  return closedCatmullRomToBezierPath(pts);
}

// Elongated falling liquid drop silhouette (top tail at y ~ -52, heavy bulbous tip at y ~ +14)
const TEARDROP_PATH =
  "M 0 -54 C 4 -34 15 -14 16 2 C 17 15 9 22 0 22 C -9 22 -17 15 -16 2 C -15 -14 -4 -34 0 -54 Z";

function createSplashSchedule(): DropSpec[] {
  const configs: Array<Omit<DropSpec, "id" | "satellites">> = [
    // Wave 1: Lead drop plunges from theme toggle button + top-left & hero drops
    { seed: 1.2, tx: 0.78, ty: 0.25, startU: 0.0, impactU: 0.14, endU: 0.9, dropScale: 0.92, rotDeg: 14, spreadFactor: 1.15, fromOrigin: true },
    { seed: 2.6, tx: 0.49, ty: 0.34, startU: 0.03, impactU: 0.19, endU: 0.92, dropScale: 1.08, rotDeg: -28, spreadFactor: 1.32 },
    { seed: 3.9, tx: 0.19, ty: 0.22, startU: 0.06, impactU: 0.22, endU: 0.92, dropScale: 0.9, rotDeg: 48, spreadFactor: 1.18 },
    // Wave 2: Mid-screen left, right flank, and lower-center pool
    { seed: 5.1, tx: 0.22, ty: 0.61, startU: 0.1, impactU: 0.28, endU: 0.95, dropScale: 1.02, rotDeg: -64, spreadFactor: 1.25 },
    { seed: 6.4, tx: 0.82, ty: 0.56, startU: 0.13, impactU: 0.31, endU: 0.96, dropScale: 0.98, rotDeg: 86, spreadFactor: 1.22 },
    { seed: 7.8, tx: 0.53, ty: 0.76, startU: 0.17, impactU: 0.36, endU: 0.98, dropScale: 1.14, rotDeg: -16, spreadFactor: 1.35 },
    // Wave 3: Bottom corners + outer seal
    { seed: 9.1, tx: 0.14, ty: 0.88, startU: 0.21, impactU: 0.39, endU: 0.99, dropScale: 0.9, rotDeg: 112, spreadFactor: 1.2 },
    { seed: 10.5, tx: 0.88, ty: 0.86, startU: 0.23, impactU: 0.41, endU: 1.0, dropScale: 0.94, rotDeg: -94, spreadFactor: 1.22 },
  ];

  return configs.map((cfg, idx) => {
    const sats: SatelliteSpec[] = [];
    for (let s = 0; s < 4; s++) {
      const angle = (s / 4) * Math.PI * 2 + cfg.seed * 0.7 + idx * 0.4;
      sats.push({
        angle,
        distFactor: 0.85 + ((s * 37 + idx * 19) % 10) * 0.11,
        radius: 5 + ((s * 13 + idx * 7) % 6),
      });
    }
    return { ...cfg, id: idx, satellites: sats };
  });
}

const SPLASHES = createSplashSchedule();
const SPLAT_PATHS = SPLASHES.map((s) => buildOrganicSplatPath(s.seed, 6));

interface ActiveTransition {
  cancel: () => void;
}

let activeTransition: ActiveTransition | null = null;

function ensureClipPathContainer(): {
  svg: SVGSVGElement;
  dropEls: SVGPathElement[];
  trailEls: SVGCircleElement[];
  splatEls: SVGPathElement[];
  satEls: SVGCircleElement[][];
} {
  let svg = document.getElementById(PAINT_SVG_ID) as SVGSVGElement | null;
  if (svg) svg.remove();

  const ns = "http://www.w3.org/2000/svg";
  svg = document.createElementNS(ns, "svg");
  svg.id = PAINT_SVG_ID;
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "fixed";
  svg.style.inset = "0";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.overflow = "hidden";
  svg.style.pointerEvents = "none";

  const defs = document.createElementNS(ns, "defs");
  const clipPath = document.createElementNS(ns, "clipPath");
  clipPath.id = CLIP_ID;
  clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

  const dropEls: SVGPathElement[] = [];
  const trailEls: SVGCircleElement[] = [];
  const splatEls: SVGPathElement[] = [];
  const satEls: SVGCircleElement[][] = [];

  SPLASHES.forEach((spec, idx) => {
    // 1. Falling teardrop bolus
    const drop = document.createElementNS(ns, "path");
    drop.setAttribute("d", TEARDROP_PATH);
    drop.setAttribute("transform", "translate(-200 -200) scale(0)");
    clipPath.appendChild(drop);
    dropEls.push(drop);

    // 2. Trailing feeder droplet above falling drop
    const trail = document.createElementNS(ns, "circle");
    trail.setAttribute("cx", "-200");
    trail.setAttribute("cy", "-200");
    trail.setAttribute("r", "0");
    clipPath.appendChild(trail);
    trailEls.push(trail);

    // 3. Expanding organic multi-tendril paint puddle
    const splat = document.createElementNS(ns, "path");
    splat.setAttribute("d", SPLAT_PATHS[idx]);
    splat.setAttribute("transform", "translate(-200 -200) scale(0)");
    clipPath.appendChild(splat);
    splatEls.push(splat);

    // 4. Ballistic satellite splatter droplets on impact
    const sats: SVGCircleElement[] = [];
    spec.satellites.forEach(() => {
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", "-200");
      dot.setAttribute("cy", "-200");
      dot.setAttribute("r", "0");
      clipPath.appendChild(dot);
      sats.push(dot);
    });
    satEls.push(sats);
  });

  defs.appendChild(clipPath);
  svg.appendChild(defs);
  document.body.appendChild(svg);

  return { svg, dropEls, trailEls, splatEls, satEls };
}

/**
 * Transitions the document between light and dark themes using falling paint
 * droplets that splash and spread across the live viewport via View Transitions.
 */
export function runPaintSplashThemeTransition(
  applyThemeSync: () => void,
  origin?: PaintOrigin
): void {
  // Cancel any in-flight splash cleanly so rapid clicks never fight each other
  if (activeTransition) {
    activeTransition.cancel();
    activeTransition = null;
  }

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
      skipTransition: () => void;
    };
  };

  if (prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
    applyThemeSync();
    return;
  }

  const vw = window.innerWidth || 1366;
  const vh = window.innerHeight || 768;
  const diag = Math.hypot(vw, vh);
  const startOrigin: PaintOrigin =
    origin && origin.x > 0 && origin.y > 0
      ? origin
      : { x: Math.round(vw * 0.82), y: 28 };

  const nodes = ensureClipPathContainer();
  const root = document.documentElement;
  root.classList.add(PAINTING_CLASS);

  let rafId = 0;
  let cancelled = false;
  let newHoldAnim: Animation | null = null;
  let oldHoldAnim: Animation | null = null;

  const updateShapes = (u: number) => {
    const clampedU = Math.max(0, Math.min(1, u));

    SPLASHES.forEach((spec, i) => {
      const dropEl = nodes.dropEls[i];
      const trailEl = nodes.trailEls[i];
      const splatEl = nodes.splatEls[i];
      const satDots = nodes.satEls[i];

      const impactX = vw * spec.tx;
      const impactY = vh * spec.ty;
      const startX = spec.fromOrigin ? startOrigin.x : impactX;
      const startY = spec.fromOrigin ? startOrigin.y : -56;

      if (clampedU < spec.startU) {
        dropEl.setAttribute("transform", "translate(-200 -200) scale(0)");
        trailEl.setAttribute("r", "0");
        splatEl.setAttribute("transform", "translate(-200 -200) scale(0)");
        satDots.forEach((d) => d.setAttribute("r", "0"));
        return;
      }

      if (clampedU < spec.impactU) {
        // Phase A: Gravity-accelerated drop falling onto screen with stretched tail
        const f = (clampedU - spec.startU) / (spec.impactU - spec.startU);
        const fallEase = f * f;
        const curX = startX + (impactX - startX) * f;
        const curY = startY + (impactY - startY) * fallEase;
        const sx = (0.68 - 0.14 * fallEase) * spec.dropScale;
        const sy = (1.1 + 1.05 * fallEase) * spec.dropScale;

        dropEl.setAttribute(
          "transform",
          `translate(${curX.toFixed(1)} ${curY.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`
        );

        // Trailing droplet pinch-off directly above main drop
        trailEl.setAttribute("cx", curX.toFixed(1));
        trailEl.setAttribute("cy", (curY - 46 * sy).toFixed(1));
        trailEl.setAttribute("r", (Math.min(7, 3 + 4 * fallEase) * spec.dropScale).toFixed(1));

        splatEl.setAttribute("transform", "translate(-200 -200) scale(0)");
        satDots.forEach((d) => d.setAttribute("r", "0"));
        return;
      }

      // Phase B: Impact splat burst + outward micro-droplets + viscous spread across screen
      const p = Math.min(1, (clampedU - spec.impactU) / (spec.endU - spec.impactU));
      // Fast initial splat pop on impact, holding expressive puddles before coalescing flood
      const impactSnap = 1 - Math.pow(1 - Math.min(1, p / 0.24), 3);
      const crawlPhase = Math.max(0, (p - 0.16) / 0.84);
      const floodCurve = Math.pow(crawlPhase, 2.35);

      // Teardrop flattens into the emerging splat pool rapidly
      if (p < 0.22) {
        const flatten = p / 0.22;
        const dropSy = Math.max(0.14, 1.35 - 1.21 * flatten) * spec.dropScale;
        const dropSx = (0.72 + 0.88 * flatten) * spec.dropScale;
        dropEl.setAttribute(
          "transform",
          `translate(${impactX.toFixed(1)} ${impactY.toFixed(1)}) scale(${dropSx.toFixed(3)} ${dropSy.toFixed(3)})`
        );
        trailEl.setAttribute("r", (5 * (1 - flatten)).toFixed(1));
      } else {
        dropEl.setAttribute("transform", "translate(-200 -200) scale(0)");
        trailEl.setAttribute("r", "0");
      }

      // Medium puddle pops cleanly on impact (~1.12), then surges exponentially to full corner coverage
      const fullCoverageScale = (diag / 110) * spec.spreadFactor;
      const scale =
        0.24 +
        0.92 * impactSnap +
        Math.max(0, fullCoverageScale - 1.16) * floodCurve;
      // Subtle liquid wobble settles smoothly after impact
      const wobble = 1 + 0.09 * Math.sin(p * Math.PI * 2.5) * Math.max(0, 1 - p * 1.5);
      const scaleX = scale * wobble;
      const scaleY = scale / Math.sqrt(wobble);

      splatEl.setAttribute(
        "transform",
        `translate(${impactX.toFixed(1)} ${impactY.toFixed(1)}) rotate(${spec.rotDeg}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})`
      );

      // Ballistic micro-droplets flying outward from each impact before main pool swallows them
      const satDistBase = Math.min(250, diag * 0.16);
      const satFlight = 1 - Math.pow(1 - Math.min(1, p * 1.65), 3);
      satDots.forEach((dot, sIdx) => {
        const sat = spec.satellites[sIdx];
        const dist = satDistBase * sat.distFactor * satFlight;
        const sx = impactX + Math.cos(sat.angle) * dist;
        const sy = impactY + Math.sin(sat.angle) * dist + 26 * satFlight * satFlight;
        const sr = p < 0.72 ? sat.radius * Math.sin(Math.min(1, p * 2.5) * (Math.PI * 0.5)) : 0;
        dot.setAttribute("cx", sx.toFixed(1));
        dot.setAttribute("cy", sy.toFixed(1));
        dot.setAttribute("r", Math.max(0, sr).toFixed(1));
      });
    });
  };

  // Seed frame 0 before snapshot so the new layer begins strictly empty/dropping
  updateShapes(0);

  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    root.classList.remove(PAINTING_CLASS);
    newHoldAnim?.cancel();
    oldHoldAnim?.cancel();
    nodes.svg.remove();
  };

  let vt: ReturnType<NonNullable<typeof doc.startViewTransition>>;
  try {
    vt = doc.startViewTransition(() => {
      flushSync(() => {
        applyThemeSync();
      });
    });
  } catch {
    cleanup();
    applyThemeSync();
    return;
  }

  activeTransition = {
    cancel: () => {
      cancelled = true;
      cleanup();
      try {
        vt.skipTransition();
      } catch {
        // Ignore already-finished ViewTransition
      }
    },
  };

  vt.ready
    .then(() => {
      if (cancelled) return;

      // Hold View Transition snapshots alive while rAF animates #phenora-paint-clip
      try {
        newHoldAnim = root.animate(
          { opacity: [1, 1] },
          {
            duration: TOTAL_DURATION_MS,
            fill: "both",
            pseudoElement: "::view-transition-new(root)",
          }
        );
        oldHoldAnim = root.animate(
          { opacity: [1, 1] },
          {
            duration: TOTAL_DURATION_MS,
            fill: "both",
            pseudoElement: "::view-transition-old(root)",
          }
        );
      } catch {
        // Fallback if pseudoElement animation selector is unsupported
      }

      const startTime = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const u = Math.min(1, (now - startTime) / TOTAL_DURATION_MS);
        updateShapes(u);
        if (u < 1) {
          rafId = requestAnimationFrame(tick);
        }
      };
      updateShapes(0.01);
      rafId = requestAnimationFrame(tick);
    })
    .catch(() => {
      if (!cancelled) cleanup();
    });

  vt.finished
    .finally(() => {
      if (!cancelled) {
        cleanup();
        if (activeTransition) activeTransition = null;
      }
    })
    .catch(() => {});
}
