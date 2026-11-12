import React, { useEffect, useRef } from "react";

const SHEET_URL =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_025250_100df7b8-31fd-4614-aa4a-c1b7d5b6b273.png&w=1600&q=85";

const RECTS = {
  LA: [0, 0.06, 0.47, 0.4],
  RA: [0.53, 0.06, 0.47, 0.4],
  LB: [0, 0.55, 0.47, 0.4],
  RB: [0.53, 0.55, 0.47, 0.4],
};

const LEVELS = [0, 0.26, 0.52, 0.78, 1];
const LOOP = 20;

function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function mixAt(t: number, on: number, off: number, dur: number) {
  return smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));
}

export const DotMatrixHandsCanvas: React.FC<{
  className?: string;
  theme?: "light" | "dark";
}> = ({
  className = "absolute inset-0 w-full h-full pointer-events-none",
  theme = "light",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tilesReady = false;
    const tiles: Record<string, HTMLCanvasElement> = {};

    // Offscreen field canvases for reading luminance
    const fA = document.createElement("canvas");
    const fB = document.createElement("canvas");
    const ctxA = fA.getContext("2d", { willReadFrequently: true });
    const ctxB = fB.getContext("2d", { willReadFrequently: true });

    let W = 0;
    let H = 0;
    let DPR = 1;
    let step = 7;
    let rowStep = 14;
    let cols = 0;
    let rows = 0;
    let R = 3;
    let seeds: Float32Array | null = null;

    // Load sheet & create 420px pre-downscaled tiles
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const natW = img.naturalWidth || 1600;
      const natH = img.naturalHeight || 905;

      for (const key of ["LA", "RA", "LB", "RB"] as const) {
        const [rx, ry, rw, rh] = RECTS[key];
        const sx = rx * natW;
        const sy = ry * natH;
        const sw = rw * natW;
        const sh = rh * natH;

        const tileCanvas = document.createElement("canvas");
        const targetW = 420;
        const targetH = Math.round(targetW * (sh / sw));
        tileCanvas.width = targetW;
        tileCanvas.height = targetH;

        const tCtx = tileCanvas.getContext("2d");
        if (tCtx) {
          tCtx.imageSmoothingEnabled = true;
          tCtx.imageSmoothingQuality = "high";
          tCtx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
          tiles[key] = tileCanvas;
        }
      }
      tilesReady = true;
    };
    img.src = SHEET_URL;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      W = rect.width || window.innerWidth;
      H = rect.height || window.innerHeight;
      DPR = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);

      step = Math.max(5, W / 205);
      rowStep = step * 2.05;
      cols = Math.ceil(W / step);
      rows = Math.ceil(H / rowStep);
      R = step * 0.46;

      fA.width = cols;
      fA.height = rows;
      fB.width = cols;
      fB.height = rows;

      // Precalculate dissolve seeds
      seeds = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        const rowBias = 0.45 * hash(j * 3.1, 7.7);
        const rowOffset = j * cols;
        for (let i = 0; i < cols; i++) {
          seeds[rowOffset + i] = 0.55 * hash(i, j) + rowBias;
        }
      }
    }

    window.addEventListener("resize", resize);
    resize();

    function drawHandIntoField(
      fCtx: CanvasRenderingContext2D | null,
      tile: HTMLCanvasElement | undefined,
      isLeft: boolean,
      t: number
    ) {
      if (!fCtx || !tile) return;
      const a = (2 * Math.PI * t) / LOOP;
      const ph = isLeft ? 0 : Math.PI;

      const isPortrait = H > W;
      const hw = isPortrait ? W * 0.65 : W * 0.43;
      const hh = hw * ((0.4 * 1520) / (0.47 * 2688));
      const cy = isPortrait ? H * 0.77 : H * 0.76;

      const reach = (0.032 * Math.sin(a + ph) + 0.011 * Math.sin(2 * a + 1.3 + ph)) * W;
      const scale = 1 + 0.06 * Math.sin(a + 0.9 + ph);
      const rot = (isLeft ? 1 : -1) * 0.042 * Math.sin(a + 2.1 + ph);

      const x = isLeft ? reach - W * 0.035 : W - hw + W * 0.035 - reach;
      const pivotX = isLeft ? 0 : W;
      const pivotY = cy;

      fCtx.save();
      fCtx.scale(cols / W, rows / H);
      fCtx.translate(pivotX, pivotY);
      fCtx.rotate(rot);
      fCtx.scale(scale, scale);
      fCtx.translate(-pivotX, -pivotY);
      fCtx.drawImage(tile, x, cy - hh / 2, hw, hh);
      fCtx.restore();
    }

    function render(timeSeconds: number) {
      if (!tilesReady || cols === 0 || rows === 0 || !ctx || !ctxA || !ctxB || !seeds) return;

      const t = ((timeSeconds % LOOP) + LOOP) % LOOP;

      ctxA.fillStyle = "#ffffff";
      ctxA.fillRect(0, 0, cols, rows);
      ctxB.fillStyle = "#ffffff";
      ctxB.fillRect(0, 0, cols, rows);

      drawHandIntoField(ctxA, tiles.LA, true, t);
      drawHandIntoField(ctxA, tiles.RA, false, t);
      drawHandIntoField(ctxB, tiles.LB, true, t);
      drawHandIntoField(ctxB, tiles.RB, false, t);

      const dataA = ctxA.getImageData(0, 0, cols, rows).data;
      const dataB = ctxB.getImageData(0, 0, cols, rows).data;

      const mL = mixAt(t, 6.2, 14.6, 1.6);
      const mR = mixAt(t, 2.4, 10.4, 1.6);
      const halfCols = cols / 2;
      const tick = Math.floor(t * 7);

      const rowShifts = new Int32Array(rows);
      for (let j = 0; j < rows; j++) {
        if (hash(j, tick) > 0.965) {
          rowShifts[j] = Math.round((hash(tick, j) - 0.5) * 8);
        } else {
          rowShifts[j] = 0;
        }
      }

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = themeRef.current === "dark" ? "#e9e9e2" : "#0d0d0d";

      ctx.beginPath();

      for (let j = 0; j < rows; j++) {
        const shift = rowShifts[j];
        const rowOffset = j * cols;
        const dotY = (j + 0.5) * rowStep;
        const normY = dotY / H;

        for (let i = 0; i < cols; i++) {
          const cellIdx = rowOffset + i;
          const seed = seeds[cellIdx];

          const m = i < halfCols ? mL : mR;
          const useB = seed < m;

          const sampleI = Math.max(0, Math.min(cols - 1, i - shift));
          const samplePixelIdx = (rowOffset + sampleI) * 4;

          const red = useB ? dataB[samplePixelIdx] : dataA[samplePixelIdx];
          const lum = red / 255;

          let v = (1 - lum - 0.16) / 0.42;
          if (v <= 0) continue;
          if (v > 1) v = 1;

          if (m > 0.001 && m < 0.999) {
            const diff = Math.abs(seed - m);
            if (diff < 0.12) {
              v *= diff / 0.12;
              if (hash(i + tick, j) <= 0.4) {
                v *= 0.3;
              }
            }
          }

          v *= 0.86 + 0.14 * Math.sin(t * 3.2 + seed * 40);

          // Subtle horizontal edge taper between reaching fingertips
          const normX = Math.abs((i + 0.5) / cols - 0.5);
          v *= smooth(0.015, 0.07, normX);

          // Tight elliptical reading halo strictly around the centered upper-mid hero title & subtitle
          const textMaskX = normX / 0.25;
          const textMaskY = (normY - 0.36) / 0.21;
          const ellipDist = Math.hypot(textMaskX, textMaskY);
          if (ellipDist < 1.0) {
            continue;
          }
          if (ellipDist < 1.32) {
            v *= smooth(1.0, 1.32, ellipDist);
          }

          if (v <= 0.05) continue;

          let chosenLevel = 0;
          for (let l = LEVELS.length - 1; l >= 0; l--) {
            if (v >= LEVELS[l] - 0.13) {
              chosenLevel = LEVELS[l];
              break;
            }
          }

          if (chosenLevel === 0) continue;

          const rad = chosenLevel === 0.26 ? R * 0.38 : R * chosenLevel;
          const dotX = (i + 0.5) * step;

          ctx.moveTo(dotX + rad, dotY);
          ctx.arc(dotX, dotY, rad, 0, Math.PI * 2);
        }
      }

      ctx.fill();
    }

    const t0 = performance.now();
    function loop(now: number) {
      render((now - t0) / 1000);
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
};
