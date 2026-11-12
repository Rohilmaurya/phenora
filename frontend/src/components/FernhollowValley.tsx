import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

interface FernhollowValleyProps {
  onExplorePhenora: () => void;
}

export const FernhollowValley: React.FC<FernhollowValleyProps> = ({ onExplorePhenora }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [uiVisible, setUiVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // References for Three.js engine and audio
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    points: THREE.Points;
    dust: THREE.Points;
    originalPositions: Float32Array;
    currentPositions: Float32Array;
    velocities: Float32Array;
    colors: Float32Array;
    cameraZ: number;
    targetSpeed: number;
    currentSpeed: number;
    isHovering: boolean;
    mouse: THREE.Vector2;
    raycaster: THREE.Raycaster;
    clock: THREE.Clock;
    animId: number;
    cleanup: () => void;
  } | null>(null);

  const audioRef = useRef<{
    ctx: AudioContext | null;
    filter: BiquadFilterNode | null;
    gain: GainNode | null;
    oscillators: OscillatorNode[];
  }>({
    ctx: null,
    filter: null,
    gain: null,
    oscillators: [],
  });

  // Sound initialization via Web Audio API
  const initAudio = useCallback(() => {
    if (audioRef.current.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, ctx.currentTime);

      // Create warm generative ambient chord (F - A - C - E - G)
      const freqs = [174.61, 220.0, 261.63, 329.63, 392.0];
      const oscs: OscillatorNode[] = [];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.08 / (idx + 1), ctx.currentTime);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
        oscs.push(osc);
      });

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      audioRef.current = {
        ctx,
        filter,
        gain: masterGain,
        oscillators: oscs,
      };
    } catch {
      // AudioContext unavailable or restricted
    }
  }, []);

  const toggleSound = useCallback(() => {
    initAudio();
    const { ctx, gain } = audioRef.current;
    if (!ctx || !gain) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (isMuted) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.2);
      setIsMuted(false);
    } else {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      setIsMuted(true);
    }
  }, [initAudio, isMuted]);

  // Hover transitions (dispersion & audio muffling)
  const startHoverTransition = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.isHovering = true;
    }
    const { ctx, filter } = audioRef.current;
    if (ctx && filter) {
      filter.frequency.cancelScheduledValues(ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.6);
    }
  }, []);

  const stopHoverTransition = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.isHovering = false;
    }
    const { ctx, filter } = audioRef.current;
    if (ctx && filter) {
      filter.frequency.cancelScheduledValues(ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.8);
    }
  }, []);

  // Three.js Scene Setup & Animation Loop
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020305, 0.0065);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 800);
    camera.position.set(0, 8, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    // 2. Bioluminescent Valley Points (Flowers & Leaves)
    const FLOWER_COUNT = 14000;
    const positions = new Float32Array(FLOWER_COUNT * 3);
    const origPositions = new Float32Array(FLOWER_COUNT * 3);
    const velocities = new Float32Array(FLOWER_COUNT * 3);
    const colors = new Float32Array(FLOWER_COUNT * 3);
    const sizes = new Float32Array(FLOWER_COUNT);

    const palette = [
      new THREE.Color("#f5efe2"), // Cream
      new THREE.Color("#fef08a"), // Soft Moon Gold
      new THREE.Color("#6ee7b7"), // Bioluminescent Mint
      new THREE.Color("#c084fc"), // Night Violet
      new THREE.Color("#38bdf8"), // Soft Phosphor Cyan
      new THREE.Color("#fda4af"), // Pale Blossom
    ];

    for (let i = 0; i < FLOWER_COUNT; i++) {
      const idx = i * 3;
      // Terrain curve: undulating valley floor with gentle side hills
      const x = (Math.random() - 0.5) * 260;
      const z = Math.random() * -650;
      const hillElevation = Math.pow(Math.abs(x) / 45, 1.8) * 4;
      const wave = Math.sin(x * 0.05) * Math.cos(z * 0.04) * 3;
      const y = hillElevation + wave - 2 + (Math.random() - 0.5) * 1.5;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      origPositions[idx] = x;
      origPositions[idx + 1] = y;
      origPositions[idx + 2] = z;

      velocities[idx] = 0;
      velocities[idx + 1] = 0;
      velocities[idx + 2] = 0;

      // Color selection
      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;

      // Distance-dependent bloom scale
      sizes[i] = 2.5 + Math.random() * 3.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Radial Petal Glow Texture
    const createFlowerTexture = () => {
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext("2d")!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.2, "rgba(250,245,235,0.95)");
      grad.addColorStop(0.5, "rgba(180,225,255,0.4)");
      grad.addColorStop(0.8, "rgba(110,230,180,0.15)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    };

    const flowerTexture = createFlowerTexture();
    const flowerMaterial = new THREE.PointsMaterial({
      size: 4.5,
      map: flowerTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, flowerMaterial);
    scene.add(points);

    // 3. Floating Night Star Dust Particles
    const DUST_COUNT = 1500;
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 200;
      dustPositions[i * 3 + 1] = Math.random() * 40;
      dustPositions[i * 3 + 2] = Math.random() * -600;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      size: 1.8,
      color: 0xf5efe2,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    // 4. Mouse Tracking & Screen-Space Displacement
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);

    const onPointerMove = (e: MouseEvent) => {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointerMove);

    // Virtual Wheel & Touch flight multiplier
    let cameraZ = 20;
    let targetCameraZ = 20;

    const onWheel = (e: WheelEvent) => {
      targetCameraZ += e.deltaY * 0.15;
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const delta = (touchStartY - e.touches[0].clientY) * 0.8;
      targetCameraZ += delta;
      touchStartY = e.touches[0].clientY;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // 5. Animation Loop
    const clock = new THREE.Clock();
    let currentSpeed = 0.35;
    let targetSpeed = 0.35;
    let isHovering = false;

    const raycaster = new THREE.Raycaster();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse easing
      mouse.x += (targetMouse.x - mouse.x) * 0.08;
      mouse.y += (targetMouse.y - mouse.y) * 0.08;

      // Hover transition flight easing
      if (engineRef.current?.isHovering) {
        targetSpeed = 0.03;
      } else {
        targetSpeed = 0.42;
      }
      currentSpeed += (targetSpeed - currentSpeed) * 0.05;

      // Continuous flight drift forward
      targetCameraZ -= currentSpeed * 60 * delta;
      cameraZ += (targetCameraZ - cameraZ) * 0.08;

      // Loop valley seamless loop
      if (cameraZ < -480) {
        cameraZ = 15;
        targetCameraZ = 15;
      }

      // Camera motion & subtle mouse tilt
      camera.position.z = cameraZ;
      camera.position.x = Math.sin(elapsed * 0.25) * 3 + mouse.x * 4;
      camera.position.y = 7 + Math.cos(elapsed * 0.2) * 1.2 - mouse.y * 2.5;
      camera.lookAt(camera.position.x * 0.4, 4 + mouse.y * 1.5, camera.position.z - 50);

      // Flower point particles interaction
      const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const isHover = engineRef.current?.isHovering ?? false;

      // Mouse plane ray in world space
      const mouseWorldX = camera.position.x + mouse.x * 24;
      const mouseWorldY = camera.position.y + mouse.y * 18;
      const mouseWorldZ = camera.position.z - 30;

      for (let i = 0; i < FLOWER_COUNT; i++) {
        const idx = i * 3;
        const ox = origPositions[idx];
        const oy = origPositions[idx + 1];
        const oz = origPositions[idx + 2];

        // Dynamic breeze wave
        const breeze = Math.sin(elapsed * 1.5 + ox * 0.08 + oz * 0.05) * 0.25;

        let targetX = ox;
        let targetY = oy + breeze;
        let targetZ = oz;

        // Hover effect: disperse flowers outward into floating glowing clouds
        if (isHover) {
          const angle = (i * 0.17) + elapsed * 0.8;
          const disperseDist = 12 + (i % 25);
          targetX += Math.cos(angle) * disperseDist;
          targetY += Math.sin(angle * 1.3) * disperseDist + 8;
          targetZ += Math.sin(angle) * disperseDist;
        }

        // Screen-space mouse push
        const dx = posArray[idx] - mouseWorldX;
        const dy = posArray[idx + 1] - mouseWorldY;
        const dz = posArray[idx + 2] - mouseWorldZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 225 && distSq > 0.001) {
          const pushForce = (1 - distSq / 225) * 4.5;
          targetX += (dx / Math.sqrt(distSq)) * pushForce;
          targetY += (dy / Math.sqrt(distSq)) * pushForce;
        }

        // Spring physics return to base position
        posArray[idx] += (targetX - posArray[idx]) * 0.08;
        posArray[idx + 1] += (targetY - posArray[idx + 1]) * 0.08;
        posArray[idx + 2] += (targetZ - posArray[idx + 2]) * 0.08;
      }
      posAttr.needsUpdate = true;

      // Dust particles drift upward
      const dustAttr = dust.geometry.attributes.position as THREE.BufferAttribute;
      const dustArray = dustAttr.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        const idx = i * 3;
        dustArray[idx + 1] += 0.04;
        if (dustArray[idx + 1] > 45) {
          dustArray[idx + 1] = 0;
        }
      }
      dustAttr.needsUpdate = true;

      renderer.render(scene, camera);
      engineRef.current!.animId = requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    // Resize Handler
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Save engine state
    engineRef.current = {
      renderer,
      scene,
      camera,
      points,
      dust,
      originalPositions: origPositions,
      currentPositions: positions,
      velocities,
      colors,
      cameraZ,
      targetSpeed,
      currentSpeed,
      isHovering,
      mouse,
      raycaster,
      clock,
      animId,
      cleanup: () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("resize", onResize);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        geometry.dispose();
        flowerMaterial.dispose();
        dustGeometry.dispose();
        dustMaterial.dispose();
        renderer.dispose();
      },
    };

    // Mark loaded after short initial warmup
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
      setTimeout(() => {
        setUiVisible(true);
      }, 300);
    }, 600);

    return () => {
      clearTimeout(loadTimer);
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
      if (audioRef.current.ctx) {
        audioRef.current.ctx.close();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-black text-[#f5efe2] font-sans select-none"
      style={{
        ["--u" as any]: "min(calc(100vw / 1600), calc(100vh / 900))",
        ["--cream" as any]: "#f5efe2",
      }}
    >
      {/* 3D WebGL Canvas Layer */}
      <div id="valley" className="fixed inset-0 z-0 pointer-events-auto" aria-hidden="true">
        <div ref={canvasContainerRef} className="js-canvas-container absolute inset-0 w-full h-full" />
      </div>

      {/* Interface Layer (Fixed Above Canvas, pointer-events: none except controls) */}
      <div
        className={`ui fixed inset-0 z-10 pointer-events-none transition-opacity duration-[1600ms] ease-out ${
          uiVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Header */}
        <header className="absolute left-0 right-0 top-0 flex items-center justify-between pt-[calc(24*var(--u))] px-[calc(44*var(--u))] z-20">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="logo text-[calc(26*var(--u))] font-medium tracking-[-0.02em] pointer-events-auto cursor-pointer"
            aria-label="Fernhollow"
          >
            Fernhollow
          </a>

          <nav
            aria-label="Main"
            className="flex items-center gap-[calc(44*var(--u))] text-[calc(14.5*var(--u))] font-medium tracking-[0.16em] uppercase pointer-events-auto"
          >
            <a
              href="#phenora-app"
              onClick={(e) => {
                e.preventDefault();
                onExplorePhenora();
              }}
              className="hidden md:inline-block transition-opacity duration-200 hover:opacity-60"
            >
              Work
            </a>
            <a
              href="#architecture"
              onClick={(e) => {
                e.preventDefault();
                onExplorePhenora();
              }}
              className="hidden md:inline-block transition-opacity duration-200 hover:opacity-60"
            >
              About
            </a>
            <a
              href="#clinical-proof"
              onClick={(e) => {
                e.preventDefault();
                onExplorePhenora();
              }}
              className="hidden md:inline-block transition-opacity duration-200 hover:opacity-60"
            >
              Journal
            </a>
            <button
              onClick={onExplorePhenora}
              className="pill inline-flex items-center justify-center h-[calc(46*var(--u))] px-[calc(26*var(--u))] rounded-full bg-[#f5efe2] text-[#151510] text-xs md:text-sm font-semibold tracking-normal uppercase md:capitalize transition-transform duration-250 hover:-translate-y-0.5 cursor-pointer shadow-lg"
            >
              Let&rsquo;s talk
            </button>
          </nav>
        </header>

        {/* Hero Content (Centered) */}
        <section className="hero absolute left-0 right-0 top-1/2 -translate-y-[46%] flex flex-col items-center text-center px-4 z-20">
          <h1
            className="text-[calc(158*var(--u))] leading-[0.92] tracking-[-0.012em] whitespace-nowrap text-[#f5efe2]"
            style={{ fontFamily: 'Antonio, "Arial Narrow", sans-serif' }}
          >
            Grown, not built.
          </h1>

          <p className="cap mt-[calc(48*var(--u))] text-[calc(20*var(--u))] leading-[1.3] text-[#f5efe2]/90 font-normal">
            Rooted in nature.<br />Built for what&rsquo;s next.
          </p>

          {/* 58u Circle Button with Hover Transition on Three.js valley */}
          <button
            id="go"
            onClick={onExplorePhenora}
            onPointerEnter={startHoverTransition}
            onPointerLeave={stopHoverTransition}
            className="go grid place-items-center mt-[calc(34*var(--u))] w-[calc(58*var(--u))] h-[calc(58*var(--u))] border-[1.5px] border-[#f5efe2] rounded-full transition-all duration-300 hover:bg-[#f5efe2] hover:text-[#151510] cursor-pointer pointer-events-auto group focus:outline-hidden"
            aria-label="Explore Phenora Clinical Intelligence"
          >
            <svg
              className="w-[calc(22*var(--u))] h-[calc(22*var(--u))] fill-none stroke-current stroke-[1.6] stroke-linecap-round stroke-linejoin-round transition-transform duration-300 group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M4 12h16M14 6l6 6-6 6" />
            </svg>
          </button>
        </section>

        {/* Bottom Right: Scroll to wander + Audio Toggle Button */}
        <div className="corner absolute right-[calc(44*var(--u))] bottom-[calc(44*var(--u))] flex items-center gap-[calc(18*var(--u))] text-[calc(12.5*var(--u))] font-medium tracking-[0.16em] uppercase text-[#f5efe2] z-20 pointer-events-auto">
          <button
            onClick={onExplorePhenora}
            className="hover:opacity-75 transition-opacity cursor-pointer font-medium"
          >
            Scroll to wander
          </button>
          
          <i className="w-[1px] h-[calc(26*var(--u))] bg-[#f5efe2]/45 block" />

          {/* Sound Toggle Button */}
          <button
            id="sound"
            onClick={toggleSound}
            aria-pressed={!isMuted}
            aria-label="Toggle ambient nature sound"
            className="sound grid place-items-center w-[calc(28*var(--u))] h-[calc(28*var(--u))] hover:opacity-80 transition-opacity cursor-pointer"
            title={isMuted ? "Unmute generative ambient sound" : "Mute ambient sound"}
          >
            <svg
              className="w-full h-full fill-none stroke-current stroke-[1.5] stroke-linecap-round stroke-linejoin-round"
              viewBox="0 0 24 24"
            >
              <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" />
              {/* Sound waves (visible when playing) */}
              {!isMuted ? (
                <>
                  <path className="w" d="M15.5 9a4 4 0 0 1 0 6" />
                  <path className="w" d="M18 6.5a7.5 7.5 0 0 1 0 11" />
                </>
              ) : (
                /* Muted cross (visible when muted) */
                <path className="x" d="m16 10 4 4m0-4-4 4" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Full-Screen Black Loader with Pulsing 9u Cream Dot */}
      <div
        id="loader"
        className={`loader fixed inset-0 z-30 grid place-items-center bg-[#000000] pointer-events-none transition-opacity duration-1000 ease-out ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <span
          className="w-[calc(9*var(--u))] h-[calc(9*var(--u))] min-w-[6px] min-h-[6px] rounded-full bg-[#f5efe2] animate-ping"
          style={{ animationDuration: "1.2s" }}
        />
      </div>
    </div>
  );
};
