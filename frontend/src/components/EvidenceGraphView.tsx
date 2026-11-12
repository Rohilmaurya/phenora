import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  useUpdateNodeInternals,
  useNodesState,
  useEdgesState,
  Background,
  MiniMap,
  Handle,
  getBezierPath,
  type Node,
  type Edge,
  type EdgeProps,
  type Viewport,
  type CoordinateExtent,
  Position,
  MarkerType,
} from "@xyflow/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ThinkingOrb } from "thinking-orbs";
import {
  Activity,
  GitMerge,
  Award,
  Layers,
  ChevronUp,
  ChevronDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Network,
} from "lucide-react";
import type {
  Candidate,
  EvidenceGraph,
  EvidenceGraphNode,
  ExcludedObservation,
} from "../types/api";
import { EvidenceInspector } from "./EvidenceInspector";
import { prefersReducedMotion } from "../lib/motion";

gsap.registerPlugin(useGSAP);

interface EvidenceGraphViewProps {
  graph: EvidenceGraph;
  selectedCandidate: Candidate | null;
  selectedCandidateId: string | null;
  excludedObservations?: ExcludedObservation[];
  onNodeClick?: (nodeId: string) => void;
  isMatching?: boolean;
  theme?: "light" | "dark";
}

const OBS_X = 24;
const OBS_BASE_Y = 24;
const OBS_ROW_GAP = 86;
const MICA_X = 270;
const DISEASE_X_NO_MICA = 320;
const DISEASE_X_WITH_MICA = 520;

interface NodeTargetPose {
  x: number;
  y: number;
  sourcePosition: Position;
  targetPosition: Position;
  diseaseTargetHandle?: "left" | "top" | "right" | "bottom";
  deckTier?: number;
}

interface GraphTargetLayout {
  poses: Map<string, NodeTargetPose>;
  orbitCenter: { x: number; y: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  diseaseTargetHandle: "left" | "top" | "right" | "bottom";
  edgeTargets: Map<string, { targetHandle: string; tier: number }>;
}

function getHandleToHub(dx: number, dy: number): {
  sourcePosition: Position;
  targetHandle: "left" | "top" | "right" | "bottom";
} {
  if (Math.abs(dx) * 0.82 >= Math.abs(dy)) {
    return dx >= 0
      ? { sourcePosition: Position.Right, targetHandle: "left" }
      : { sourcePosition: Position.Left, targetHandle: "right" };
  }
  return dy >= 0
    ? { sourcePosition: Position.Bottom, targetHandle: "top" }
    : { sourcePosition: Position.Top, targetHandle: "bottom" };
}

function computeGraphTargetLayout(
  obsNodes: EvidenceGraphNode[],
  micaNodes: EvidenceGraphNode[],
  diseaseNode: EvidenceGraphNode,
  filteredEdges: EvidenceGraph["edges"],
  effectiveStacked: boolean,
  shiftDiseaseBelow: boolean
): GraphTargetLayout {
  const poses = new Map<string, NodeTargetPose>();
  const edgeTargets = new Map<string, { targetHandle: string; tier: number }>();
  const obsCount = obsNodes.length;
  const micaCount = micaNodes.length;
  const hasMica = micaCount > 0;
  const micaIdSet = new Set(micaNodes.map((m) => m.id));

  let orbitCenter = { x: 420, y: 210 };
  let bounds = { minX: 12, maxX: 600, minY: 12, maxY: 360 };
  let defaultDiseaseHandle: "left" | "top" | "right" | "bottom" = "left";

  if (shiftDiseaseBelow) {
    // Stacked findings at top-left; MICA + Disease shifted below so right side stays 100% clear for the Evidence Card
    const stackOriginX = 28;
    const stackOriginY = 24;
    const firstSourcePos = Position.Bottom;
    defaultDiseaseHandle = "top";

    obsNodes.forEach((n, idx) => {
      const tier = idx === 0 ? 0 : Math.min(idx, 4);
      poses.set(n.id, {
        x: stackOriginX + tier * 5,
        y: stackOriginY + tier * 6,
        sourcePosition: firstSourcePos,
        targetPosition: Position.Top,
        deckTier: tier,
      });
    });

    const micaStartY = 148;
    micaNodes.forEach((m, idx) => {
      poses.set(m.id, {
        x: 34,
        y: micaStartY + idx * 84,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
    });

    const diseaseY = hasMica ? micaStartY + micaCount * 84 + 14 : 178;
    poses.set(diseaseNode.id, {
      x: 24,
      y: diseaseY,
      sourcePosition: Position.Right,
      targetPosition: Position.Top,
    });

    const extraOrbit = Math.max(0, obsCount - 6);
    orbitCenter =
      obsCount > 5
        ? { x: 447 + extraOrbit * 22, y: 279 + extraOrbit * 16 }
        : { x: 245, y: 195 };
    bounds = {
      minX: 12,
      maxX: 306,
      minY: 12,
      maxY: Math.max(300, diseaseY + 114),
    };

    filteredEdges.forEach((e) => {
      const isDownstream = e.target === diseaseNode.id && micaIdSet.has(e.source);
      edgeTargets.set(e.id, {
        targetHandle: "top",
        tier: isDownstream ? 1 : 0,
      });
    });
  } else if (effectiveStacked) {
    // Manual circular stack without inspector card open
    const stackOriginX = 28;
    const isOrbitSource = obsCount > 5;
    const stackOriginY = isOrbitSource ? 225 : 148;
    defaultDiseaseHandle = "left";

    obsNodes.forEach((n, idx) => {
      const tier = idx === 0 ? 0 : Math.min(idx, 4);
      poses.set(n.id, {
        x: stackOriginX + tier * 5,
        y: stackOriginY + tier * 6,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        deckTier: tier,
      });
    });

    micaNodes.forEach((m, idx) => {
      poses.set(m.id, {
        x: MICA_X,
        y: stackOriginY + idx * 86,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    const dX = hasMica ? DISEASE_X_WITH_MICA : DISEASE_X_NO_MICA;
    const dY = stackOriginY + Math.max(0, (micaCount - 1) * 43) - 4;
    poses.set(diseaseNode.id, {
      x: dX,
      y: dY,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    const extraOrbit = Math.max(0, obsCount - 6);
    orbitCenter = isOrbitSource
      ? { x: 447 + extraOrbit * 22, y: 279 + extraOrbit * 16 }
      : { x: 265, y: 205 };
    bounds = {
      minX: 12,
      maxX: dX + 266,
      minY: 12,
      maxY: Math.max(isOrbitSource ? 520 : 460, dY + 118),
    };

    filteredEdges.forEach((e) => {
      const isDownstream = e.target === diseaseNode.id && micaIdSet.has(e.source);
      edgeTargets.set(e.id, {
        targetHandle: "left",
        tier: isDownstream ? 1 : 0,
      });
    });
  } else if (obsCount > 5) {
    // >5 Patient Findings: distribute radially AROUND Candidate Condition instead of piling vertically
    const extra = Math.max(0, obsCount - 6);
    const rx = 315 + extra * 22;
    const ry = 215 + extra * 16;
    const hubCx = rx + 132;
    const hubCy = ry + 64;
    const startAngle = -2.36; // ~ -135deg (top-left anchor for Stack trigger card)

    poses.set(diseaseNode.id, {
      x: hubCx - 122,
      y: hubCy - 46,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    const angleByObsId = new Map<string, number>();
    let minX = hubCx - 122;
    let maxX = hubCx + 140;
    let minY = hubCy - 46;
    let maxY = hubCy + 56;

    obsNodes.forEach((n, idx) => {
      const theta = startAngle + (idx / obsCount) * Math.PI * 2;
      angleByObsId.set(n.id, theta);
      const nodeCx = hubCx + rx * Math.cos(theta);
      const nodeCy = hubCy + ry * Math.sin(theta);
      const x = Math.round(nodeCx - 114);
      const y = Math.round(nodeCy - 38);
      const { sourcePosition, targetHandle } = getHandleToHub(hubCx - nodeCx, hubCy - nodeCy);

      poses.set(n.id, {
        x,
        y,
        sourcePosition,
        targetPosition: Position.Left,
        diseaseTargetHandle: targetHandle,
        deckTier: 0,
      });

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 236);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 84);
    });

    micaNodes.forEach((m, idx) => {
      const linkedSources = filteredEdges
        .filter((e) => e.target === m.id)
        .map((e) => angleByObsId.get(e.source))
        .filter((a): a is number => typeof a === "number");
      const theta =
        linkedSources.length > 0
          ? linkedSources[0]
          : startAngle + ((idx + 0.5) / Math.max(1, micaCount)) * Math.PI * 2;
      const mCx = hubCx + rx * 0.52 * Math.cos(theta);
      const mCy = hubCy + ry * 0.52 * Math.sin(theta);
      const { sourcePosition } = getHandleToHub(hubCx - mCx, hubCy - mCy);
      poses.set(m.id, {
        x: Math.round(mCx - 98),
        y: Math.round(mCy - 36),
        sourcePosition,
        targetPosition: sourcePosition === Position.Right ? Position.Left : Position.Right,
      });
    });

    orbitCenter = { x: hubCx, y: hubCy };
    bounds = {
      minX: Math.max(4, minX - 16),
      maxX: maxX + 16,
      minY: Math.max(4, minY - 16),
      maxY: maxY + 16,
    };

    filteredEdges.forEach((e) => {
      const isDownstream = e.target === diseaseNode.id && micaIdSet.has(e.source);
      const srcPose = poses.get(e.source);
      const dx = srcPose ? hubCx - (srcPose.x + 114) : 1;
      const dy = srcPose ? hubCy - (srcPose.y + 38) : 0;
      const { targetHandle } = getHandleToHub(dx, dy);
      edgeTargets.set(e.id, {
        targetHandle: e.target === diseaseNode.id ? targetHandle : "left",
        tier: isDownstream ? 1 : 0,
      });
    });
  } else {
    // <= 5 Patient Findings expanded column layout
    const totalObsSpan = Math.max(0, (obsCount - 1) * OBS_ROW_GAP);
    const micaOffset = Math.max(
      OBS_BASE_Y,
      OBS_BASE_Y + totalObsSpan / 2 - Math.max(0, micaCount - 1) * 45
    );
    const dX = hasMica ? DISEASE_X_WITH_MICA : DISEASE_X_NO_MICA;
    const dY = Math.max(OBS_BASE_Y, OBS_BASE_Y + totalObsSpan / 2 - 4);

    obsNodes.forEach((n, idx) => {
      poses.set(n.id, {
        x: OBS_X,
        y: OBS_BASE_Y + idx * OBS_ROW_GAP,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        deckTier: 0,
      });
    });

    micaNodes.forEach((m, idx) => {
      poses.set(m.id, {
        x: MICA_X,
        y: micaOffset + idx * 90,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    poses.set(diseaseNode.id, {
      x: dX,
      y: dY,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    const obsBottom = OBS_BASE_Y + Math.max(0, obsCount - 1) * OBS_ROW_GAP + 82;
    const micaBottom = hasMica ? micaOffset + (micaCount - 1) * 90 + 82 : 0;
    const diseaseBottom = dY + 106;

    orbitCenter = { x: 245, y: 195 };
    bounds = {
      minX: 12,
      maxX: dX + 266,
      minY: 12,
      maxY: Math.max(obsBottom, micaBottom, diseaseBottom, 220) + 10,
    };

    filteredEdges.forEach((e) => {
      const isDownstream = e.target === diseaseNode.id && micaIdSet.has(e.source);
      edgeTargets.set(e.id, {
        targetHandle: "left",
        tier: isDownstream ? 1 : 0,
      });
    });
  }

  return {
    poses,
    orbitCenter,
    bounds,
    diseaseTargetHandle: defaultDiseaseHandle,
    edgeTargets,
  };
}

/** Monotonic circular polar sweep around orbitCenter with gentle outer bow and exact u=1 landing. */
function interpolateAlongCircle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  orbitCx: number,
  orbitCy: number,
  u: number
): { x: number; y: number } {
  const dx0 = startX - orbitCx;
  const dy0 = startY - orbitCy;
  const dx1 = endX - orbitCx;
  const dy1 = endY - orbitCy;

  const r0 = Math.hypot(dx0, dy0);
  const r1 = Math.hypot(dx1, dy1);
  if (r0 < 4 && r1 < 4) {
    return {
      x: startX + (endX - startX) * u,
      y: startY + (endY - startY) * u,
    };
  }

  const a0 = Math.atan2(dy0, dx0);
  const a1 = Math.atan2(dy1, dx1);
  let da = a1 - a0;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;

  const flareR = Math.min(24, Math.abs(da) * 16 + 8) * Math.sin(u * Math.PI);
  const r = r0 + (r1 - r0) * u + flareR;
  const theta = a0 + da * u;

  return {
    x: orbitCx + r * Math.cos(theta),
    y: orbitCy + r * Math.sin(theta),
  };
}

const ObservationNodeComponent = ({ id, data }: { id: string; data: any }) => {
  const isTop = Boolean(data.isTopObservation);
  const canStack = Boolean(data.canStack);
  const isStacked = Boolean(data.isStacked);
  const obsCount = Number(data.obsCount ?? 1);
  const handlePosition: Position = data.handlePosition || Position.Right;
  const deckRotate = Number(data.deckRotate ?? 0);
  const deckScale = Number(data.deckScale ?? 1);
  const isDimmed = Boolean(data.isDimmed);
  const isHighlighted = Boolean(data.isHighlighted);
  const baseOpacity = data.deckOpacity !== undefined ? Number(data.deckOpacity) : 1;
  const finalOpacity = isTop ? 1 : baseOpacity * (isDimmed ? 0.36 : 1);

  return (
    <div
      data-node-kind="obs"
      data-obs-id={id}
      data-stack-top={isTop ? "true" : undefined}
      role={isTop && canStack ? "button" : undefined}
      tabIndex={isTop && canStack ? 0 : undefined}
      aria-expanded={isTop && canStack ? !isStacked : undefined}
      aria-label={
        isTop && canStack
          ? `${data.label}. ${
              isStacked
                ? `${obsCount} findings stacked. Click to expand.`
                : `Click to stack ${obsCount} findings in a circular deck.`
            }`
          : data.label
      }
      onKeyDown={(e) => {
        if (isTop && canStack && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          e.stopPropagation();
          data.onToggleStack?.();
        }
      }}
      style={{
        transform: isTop
          ? undefined
          : `scale(${deckScale.toFixed(3)}) rotate(${deckRotate.toFixed(2)}deg)`,
        transformOrigin: "center center",
        opacity: finalOpacity,
      }}
      className={`graph-node-inner px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1a1a18] text-[#111] dark:text-[#f3f3ee] min-w-[218px] max-w-[238px] relative transition-[box-shadow,border-color] duration-150 ${
        !isTop && isStacked ? "pointer-events-none" : ""
      } ${
        isTop && canStack
          ? `border-2 border-emerald-600 dark:border-emerald-500 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-400 ${
              isStacked
                ? "shadow-[0_14px_28px_-10px_rgba(5,150,105,0.36)] dark:shadow-[0_14px_28px_-10px_rgba(16,185,129,0.38)]"
                : isHighlighted
                ? "shadow-[0_10px_24px_-8px_rgba(5,150,105,0.38)]"
                : "shadow-md hover:shadow-lg"
            }`
          : isHighlighted
          ? "border-2 border-emerald-500 dark:border-emerald-400 shadow-[0_10px_22px_-8px_rgba(5,150,105,0.35)]"
          : "border border-emerald-600/75 dark:border-emerald-500/70 shadow-sm hover:border-emerald-600 dark:hover:border-emerald-400"
      }`}
    >
      <Handle
        type="source"
        position={handlePosition}
        className="!w-2.5 !h-2.5 !bg-emerald-600 dark:!bg-emerald-400 !border-2 !border-white dark:!border-[#1a1a18]"
      />
      <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 shrink-0" />
          <span>Patient Finding</span>
        </div>

        {isTop && canStack && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-tight ${
              isStacked
                ? "bg-emerald-700 text-white dark:bg-emerald-600"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800"
            }`}
          >
            <Layers className="w-2.5 h-2.5" />
            <span>{isStacked ? `${obsCount} stacked` : `Stack ${obsCount}`}</span>
            {isStacked ? (
              <ChevronDown className="w-2.5 h-2.5" />
            ) : (
              <ChevronUp className="w-2.5 h-2.5" />
            )}
          </span>
        )}
      </div>

      <div className="text-xs font-semibold text-[#111] dark:text-[#f3f3ee] leading-tight truncate" title={data.label}>
        {data.label}
      </div>

      {data.hpo_id && (
        <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">{data.hpo_id}</div>
      )}
    </div>
  );
};

const MicaNodeComponent = ({ data }: { data: any }) => {
  const isDimmed = Boolean(data.isDimmed);
  const isHighlighted = Boolean(data.isHighlighted);
  const targetPosition: Position = data.targetPosition || Position.Left;
  const sourcePosition: Position = data.sourcePosition || Position.Right;
  return (
    <div
      data-node-kind="mica"
      style={{ opacity: isDimmed ? 0.38 : 1 }}
      className={`graph-node-inner px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1a1a18] text-[#111] dark:text-[#f3f3ee] min-w-[195px] relative transition-[box-shadow,border-color] duration-150 ${
        isHighlighted
          ? "border-2 border-sky-500 dark:border-sky-400 shadow-[0_10px_22px_-8px_rgba(2,132,199,0.32)]"
          : "border border-sky-600/80 dark:border-sky-500/70 shadow-sm"
      }`}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2 !h-2 !bg-sky-600 dark:!bg-sky-400 !border-white dark:!border-[#1a1a18]"
      />
      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2 !h-2 !bg-sky-600 dark:!bg-sky-400 !border-white dark:!border-[#1a1a18]"
      />
      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-sky-800 dark:text-sky-300">
        <GitMerge className="w-3 h-3" />
        <span>HPO Ancestor (MICA)</span>
      </div>
      <div className="text-xs font-semibold text-[#111] dark:text-[#f3f3ee] leading-tight">{data.label}</div>
      {data.hpo_id && (
        <div className="text-[10px] font-mono text-sky-700 dark:text-sky-400 mt-1">{data.hpo_id}</div>
      )}
    </div>
  );
};

const DiseaseNodeComponent = ({ data }: { data: any }) => {
  const isActive = Boolean(data.isInspectorOpen);

  return (
    <div
      data-node-kind="disease"
      className={`graph-node-inner px-4 py-3 rounded-xl bg-gradient-to-br from-[#0f2e2b] to-[#134e4a] dark:from-[#0c2926] dark:to-[#113d39] text-white min-w-[232px] max-w-[258px] relative cursor-pointer transition-[box-shadow,border-color] duration-150 ${
        isActive
          ? "border-2 border-teal-300 shadow-[0_14px_30px_-8px_rgba(20,184,166,0.45)]"
          : "border border-teal-700/70 dark:border-teal-600/60 shadow-md hover:border-teal-400 dark:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.75)]"
      }`}
    >
      <span
        data-disease-pulse="true"
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-2xl border-2 border-teal-300/75 dark:border-teal-400/75 opacity-0"
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-teal-300 !border !border-[#0f2e2b]"
      />
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-teal-300 !border !border-[#0f2e2b]"
      />
      <Handle
        id="right"
        type="target"
        position={Position.Right}
        className="!w-2 !h-2 !bg-teal-300 !border !border-[#0f2e2b]"
      />
      <Handle
        id="bottom"
        type="target"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-teal-300 !border !border-[#0f2e2b]"
      />

      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-teal-200/90">
          <Award className="w-3 h-3 text-amber-300 shrink-0" />
          <span>Candidate Condition</span>
        </div>
        {data.candidate_rank && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/15 text-white tabular-nums">
            #{data.candidate_rank}
          </span>
        )}
      </div>

      <div className="text-xs sm:text-[13px] font-semibold text-white leading-snug">
        {data.label}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {data.disease_id && (
          <span className="text-[10px] font-mono text-teal-100/80">{data.disease_id}</span>
        )}
        <span className="text-[9px] font-mono text-teal-200 font-medium">
          {isActive ? "Card open" : "Hover or click"}
        </span>
      </div>
    </div>
  );
};

interface EvidenceEdgeData {
  isDark?: boolean;
  tier?: number;
  edgeOrder?: number;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isStackedGhost?: boolean;
  isMorphing?: boolean;
}

const AnimatedEvidenceEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = (data || {}) as EvidenceEdgeData;
  const isDark = Boolean(edgeData.isDark);
  const tier = Number(edgeData.tier ?? 0);
  const edgeOrder = Number(edgeData.edgeOrder ?? 0);
  const isHighlighted = Boolean(edgeData.isHighlighted);
  const isDimmed = Boolean(edgeData.isDimmed);
  const isStackedGhost = Boolean(edgeData.isStackedGhost);
  const showPhoton = !prefersReducedMotion() && !isDimmed && !isStackedGhost;

  const baseColor = isDark ? "rgba(45, 212, 191, 0.22)" : "rgba(13, 148, 136, 0.16)";
  const strokeColor = isHighlighted
    ? isDark
      ? "#5eead4"
      : "#0f766e"
    : isDark
    ? "#34d399"
    : "#059669";
  const photonColor = isDark ? "#99f6e4" : "#0d9488";
  const photonHalo = isDark ? "rgba(94, 234, 212, 0.34)" : "rgba(13, 148, 136, 0.28)";
  const durStr = tier === 1 ? "1.95s" : "2.35s";
  const beginStr = `${((edgeOrder % 5) * 0.26 + tier * 0.32).toFixed(2)}s`;

  return (
    <g
      className="graph-edge-group"
      style={{ opacity: isDimmed ? 0.22 : isStackedGhost ? 0.42 : 1 }}
    >
      <path
        d={edgePath}
        fill="none"
        stroke={baseColor}
        strokeWidth={isHighlighted ? 6.5 : 4.2}
      />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isHighlighted ? 2.6 : 1.9}
        className="evidence-edge-flow"
        markerEnd={markerEnd}
      />
      <path
        data-edge-reveal="true"
        data-edge-tier={tier}
        d={edgePath}
        fill="none"
        stroke={photonColor}
        strokeWidth={isHighlighted ? 3 : 2.3}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={0}
        style={{ opacity: 0 }}
      />
      {showPhoton && (
        <g className="edge-photon">
          <circle r={isHighlighted ? 5.6 : 4.6} fill={photonHalo}>
            <animateMotion dur={durStr} begin={beginStr} repeatCount="indefinite" path={edgePath} />
            <animate
              attributeName="opacity"
              values="0;0.9;0.9;0"
              keyTimes="0;0.14;0.84;1"
              dur={durStr}
              begin={beginStr}
              repeatCount="indefinite"
            />
          </circle>
          <circle r={isHighlighted ? 2.8 : 2.2} fill={photonColor}>
            <animateMotion dur={durStr} begin={beginStr} repeatCount="indefinite" path={edgePath} />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.14;0.84;1"
              dur={durStr}
              begin={beginStr}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </g>
  );
};

const nodeTypes = {
  observed_phenotype: ObservationNodeComponent,
  hpo_ancestor: MicaNodeComponent,
  candidate_disease: DiseaseNodeComponent,
};

const edgeTypes = {
  evidence: AnimatedEvidenceEdge,
};

const EvidenceGraphCanvas: React.FC<EvidenceGraphViewProps> = ({
  graph,
  selectedCandidate,
  selectedCandidateId,
  excludedObservations = [],
  onNodeClick,
  isMatching = false,
  theme = "light",
}) => {
  const { setViewport, getViewport } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodesInitialized = useNodesInitialized();
  const isDark = theme === "dark";

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const morphTlRef = useRef<gsap.core.Timeline | null>(null);
  const livePosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevLayoutModeRef = useRef<string>("");
  const isClampingViewportRef = useRef(false);
  const isProgrammaticViewportRef = useRef(false);
  const programmaticVpTimerRef = useRef<number | null>(null);
  const lastEntranceKeyRef = useRef<string>("");

  const [isManualStacked, setIsManualStacked] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isCardPinned, setIsCardPinned] = useState(false);
  const [entranceRunKey, setEntranceRunKey] = useState("");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 880,
    height: 540,
  });

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setCanvasSize((prev) =>
          Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
            ? { width: rect.width, height: rect.height }
            : prev
        );
      }
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeDiseaseId =
    selectedCandidate?.disease_id || selectedCandidateId || null;

  const showInspectorCard = Boolean(selectedCandidate && isCardPinned);
  const showInspectorCardRef = useRef(showInspectorCard);
  showInspectorCardRef.current = showInspectorCard;

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  useEffect(() => {
    if (!showInspectorCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCardPinned(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showInspectorCard]);

  // Reset stack & inspector state cleanly when underlying graph dataset changes
  useEffect(() => {
    morphTlRef.current?.kill();
    livePosRef.current.clear();
    prevLayoutModeRef.current = "";
    lastEntranceKeyRef.current = "";
    setEntranceRunKey("");
    setIsManualStacked(false);
    setHoveredNodeId(null);
    setIsCardPinned(false);
    canvasWrapRef.current?.classList.remove("graph-morphing");
  }, [graph]);

  useEffect(() => {
    return () => {
      morphTlRef.current?.kill();
      if (programmaticVpTimerRef.current !== null) {
        window.clearTimeout(programmaticVpTimerRef.current);
      }
    };
  }, []);

  // Filter strictly to ONLY the selected candidate disease + connected paths
  const filteredGraph = useMemo(() => {
    if (!graph || graph.nodes.length === 0) {
      return {
        obsNodes: [] as EvidenceGraphNode[],
        micaNodes: [] as EvidenceGraphNode[],
        diseaseNode: null as EvidenceGraphNode | null,
        edges: [] as EvidenceGraph["edges"],
      };
    }

    const rawObs: EvidenceGraphNode[] = [];
    const rawMica: EvidenceGraphNode[] = [];
    const rawDiseases: EvidenceGraphNode[] = [];

    graph.nodes.forEach((n: EvidenceGraphNode) => {
      const kind = n.node_type || n.type;
      if (kind === "observed_phenotype" || kind === "phenotype") rawObs.push(n);
      else if (kind === "hpo_ancestor") rawMica.push(n);
      else rawDiseases.push(n);
    });

    const targetDisease =
      rawDiseases.find(
        (d) =>
          d.disease_id === activeDiseaseId ||
          d.id === activeDiseaseId ||
          d.id === `disease:${activeDiseaseId}`
      ) ||
      rawDiseases[0] ||
      null;

    if (!targetDisease) {
      return {
        obsNodes: [],
        micaNodes: [],
        diseaseNode: null,
        edges: [],
      };
    }

    const connectedNodeIds = new Set<string>([targetDisease.id]);
    const directEdgesToDisease = graph.edges.filter(
      (e) => e.target === targetDisease.id
    );
    directEdgesToDisease.forEach((e) => connectedNodeIds.add(e.source));

    const micaSet = new Set(rawMica.map((m) => m.id));
    const upstreamEdges = graph.edges.filter(
      (e) => micaSet.has(e.target) && connectedNodeIds.has(e.target)
    );
    upstreamEdges.forEach((e) => connectedNodeIds.add(e.source));

    const activeEdges = [...directEdgesToDisease, ...upstreamEdges];
    const obsNodes = rawObs.filter((n) => connectedNodeIds.has(n.id));
    const micaNodes = rawMica.filter((n) => connectedNodeIds.has(n.id));

    return {
      obsNodes,
      micaNodes,
      diseaseNode: targetDisease,
      edges: activeEdges,
    };
  }, [graph, activeDiseaseId]);

  const effectiveStacked = isManualStacked || showInspectorCard;
  const shiftDiseaseBelow = showInspectorCard;

  const targetLayout = useMemo(() => {
    if (!filteredGraph.diseaseNode) return null;
    return computeGraphTargetLayout(
      filteredGraph.obsNodes,
      filteredGraph.micaNodes,
      filteredGraph.diseaseNode,
      filteredGraph.edges,
      effectiveStacked,
      shiftDiseaseBelow
    );
  }, [filteredGraph, effectiveStacked, shiftDiseaseBelow]);

  const worldBounds = targetLayout?.bounds || {
    minX: 12,
    maxX: 600,
    minY: 12,
    maxY: 360,
  };

  const nodeExtent = useMemo<CoordinateExtent>(
    () => [
      [Math.min(-180, worldBounds.minX - 180), Math.min(-120, worldBounds.minY - 120)],
      [Math.max(worldBounds.maxX, 860) + 180, Math.max(worldBounds.maxY, 580) + 160],
    ],
    [worldBounds]
  );

  const { safeMinZoom, safeMaxZoom, canvasPad } = useMemo(() => {
    const pad = Math.min(28, Math.max(14, Math.round(Math.min(canvasSize.width, canvasSize.height) * 0.04)));
    const availW = Math.max(120, canvasSize.width - pad * 2);
    const availH = Math.max(120, canvasSize.height - pad * 2);
    const gW = Math.max(200, worldBounds.maxX - worldBounds.minX);
    const gH = Math.max(160, worldBounds.maxY - worldBounds.minY);
    const fitAllZoom = Math.min(availW / gW, availH / gH);
    const maxZ = Math.max(0.25, Math.min(1.22, fitAllZoom));
    const minZ = Math.max(0.2, Math.min(maxZ * 0.55, 0.72));
    return {
      safeMinZoom: minZ,
      safeMaxZoom: maxZ,
      canvasPad: pad,
    };
  }, [canvasSize.width, canvasSize.height, worldBounds]);

  const clampViewport = useCallback(
    (vp: Viewport): Viewport => {
      const k = Math.min(safeMaxZoom, Math.max(safeMinZoom, vp.zoom));
      const lowerX = canvasPad - worldBounds.minX * k;
      const upperX = canvasSize.width - canvasPad - worldBounds.maxX * k;
      const lowerY = canvasPad - worldBounds.minY * k;
      const upperY = canvasSize.height - canvasPad - worldBounds.maxY * k;

      const x =
        lowerX >= upperX
          ? (lowerX + upperX) / 2
          : Math.min(upperX, Math.max(lowerX, vp.x));
      const y =
        lowerY >= upperY
          ? (lowerY + upperY) / 2
          : Math.min(upperY, Math.max(lowerY, vp.y));

      return { x, y, zoom: k };
    },
    [safeMinZoom, safeMaxZoom, canvasPad, worldBounds, canvasSize.width, canvasSize.height]
  );

  const fitGraphFraming = useCallback(
    (duration = 420) => {
      if (!filteredGraph.diseaseNode || !targetLayout) return;
      const cardOpenDesktop = showInspectorCardRef.current && canvasSize.width >= 760;
      const rightReserve = cardOpenDesktop ? 420 : 0;
      const effAvailW = Math.max(200, canvasSize.width - canvasPad * 2 - rightReserve);
      const effAvailH = Math.max(160, canvasSize.height - canvasPad * 2);
      const gW = Math.max(200, worldBounds.maxX - worldBounds.minX);
      const gH = Math.max(160, worldBounds.maxY - worldBounds.minY);
      const fitWithReserveZoom = Math.min(effAvailW / gW, effAvailH / gH);
      const targetZoom = Math.max(safeMinZoom, Math.min(1.04, safeMaxZoom, fitWithReserveZoom));

      const lowerX = canvasPad - worldBounds.minX * targetZoom;
      const upperX = canvasSize.width - canvasPad - rightReserve - worldBounds.maxX * targetZoom;
      const lowerY = canvasPad - worldBounds.minY * targetZoom;
      const upperY = canvasSize.height - canvasPad - worldBounds.maxY * targetZoom;

      const targetX =
        lowerX >= upperX
          ? Math.min(
              lowerX,
              (canvasPad + (canvasSize.width - rightReserve - worldBounds.maxX * targetZoom)) / 2
            )
          : lowerX + (upperX - lowerX) * 0.45;
      const targetY = (lowerY + upperY) / 2;

      const clamped = clampViewport({ x: targetX, y: targetY, zoom: targetZoom });
      setZoomPercent(Math.round(clamped.zoom * 100));
      const effDuration = prefersReducedMotion() ? 0 : duration;
      if (effDuration > 0) {
        isProgrammaticViewportRef.current = true;
        if (programmaticVpTimerRef.current !== null) {
          window.clearTimeout(programmaticVpTimerRef.current);
        }
        programmaticVpTimerRef.current = window.setTimeout(() => {
          isProgrammaticViewportRef.current = false;
        }, effDuration + 60);
      }
      setViewport(clamped, { duration: effDuration });
    },
    [
      filteredGraph.diseaseNode,
      targetLayout,
      safeMinZoom,
      safeMaxZoom,
      canvasPad,
      worldBounds,
      canvasSize.width,
      canvasSize.height,
      clampViewport,
      setViewport,
    ]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const handleToggleStack = useCallback(() => {
    if (filteredGraph.obsNodes.length <= 1) return;
    setIsManualStacked((prev) => !prev);
  }, [filteredGraph.obsNodes.length]);

  const highlightedPath = useMemo(() => {
    if (!hoveredNodeId || !filteredGraph.diseaseNode) return null;
    const activeNodes = new Set<string>([hoveredNodeId]);
    const activeEdges = new Set<string>();
    const allEdges = filteredGraph.edges;
    const diseaseId = filteredGraph.diseaseNode.id;

    if (hoveredNodeId === diseaseId) {
      allEdges.forEach((e) => {
        activeEdges.add(e.id);
        activeNodes.add(e.source);
        activeNodes.add(e.target);
      });
      return { nodes: activeNodes, edges: activeEdges };
    }

    const micaSet = new Set(filteredGraph.micaNodes.map((m) => m.id));
    if (micaSet.has(hoveredNodeId)) {
      allEdges.forEach((e) => {
        if (e.target === hoveredNodeId || e.source === hoveredNodeId) {
          activeEdges.add(e.id);
          activeNodes.add(e.source);
          activeNodes.add(e.target);
        }
      });
      return { nodes: activeNodes, edges: activeEdges };
    }

    allEdges
      .filter((e) => e.source === hoveredNodeId)
      .forEach((e) => {
        activeEdges.add(e.id);
        activeNodes.add(e.target);
        if (micaSet.has(e.target)) {
          allEdges.forEach((e2) => {
            if (e2.source === e.target) {
              activeEdges.add(e2.id);
              activeNodes.add(e2.target);
            }
          });
        }
      });

    return { nodes: activeNodes, edges: activeEdges };
  }, [hoveredNodeId, filteredGraph]);

  // Drive unified circular orbital stack + slow candidate disease glide whenever layout state transitions
  useEffect(() => {
    if (!filteredGraph.diseaseNode || !targetLayout) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const { obsNodes, micaNodes, diseaseNode, edges: filteredEdges } = filteredGraph;
    const obsCount = obsNodes.length;
    const canStack = obsCount > 1;
    const edgeAccent = isDark ? "#34d399" : "#059669";

    const diseaseKey = `${diseaseNode.id}:${obsCount}:${micaNodes.length}`;
    const modeKey = `${diseaseKey}:${effectiveStacked ? 1 : 0}:${shiftDiseaseBelow ? 1 : 0}`;
    const isFreshDisease = !prevLayoutModeRef.current.startsWith(diseaseKey);
    const shouldAnimate =
      !isFreshDisease &&
      prevLayoutModeRef.current !== modeKey &&
      !prefersReducedMotion() &&
      livePosRef.current.size > 0;

    prevLayoutModeRef.current = modeKey;

    const buildEdgesAtPose = () => {
      setEdges(
        filteredEdges.map((e, idx) => {
          const meta = targetLayout.edgeTargets.get(e.id) || {
            targetHandle: targetLayout.diseaseTargetHandle,
            tier: 0,
          };
          const isDiseaseTarget = e.target === diseaseNode.id;
          const topObsId = obsNodes[0]?.id;
          const isStackedGhost = Boolean(
            effectiveStacked && topObsId && e.source !== topObsId && meta.tier === 0
          );
          const nextHighlighted = highlightedPath ? highlightedPath.edges.has(e.id) : false;
          const nextDimmed = highlightedPath ? !highlightedPath.edges.has(e.id) : false;

          return {
            id: e.id,
            source: e.source,
            target: e.target,
            targetHandle: isDiseaseTarget ? meta.targetHandle : undefined,
            type: "evidence",
            data: {
              isDark,
              tier: meta.tier,
              edgeOrder: idx,
              isStackedGhost,
              isHighlighted: nextHighlighted,
              isDimmed: nextDimmed,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: edgeAccent,
            },
          };
        })
      );
    };

    const buildNodesWithPoses = (
      customPoses: Map<string, { x: number; y: number; rot?: number; scale?: number; opacity?: number }>
    ) => {
      const nextNodes: Node[] = [];

      obsNodes.forEach((n, idx) => {
        const pose = targetLayout.poses.get(n.id)!;
        const curr = customPoses.get(n.id) || { x: pose.x, y: pose.y };
        livePosRef.current.set(n.id, { x: curr.x, y: curr.y });

        const tier = effectiveStacked && idx > 0 ? Math.min(idx, 4) : 0;
        const baseOpacity = effectiveStacked && idx > 0 ? Math.max(0.54, 1 - tier * 0.11) : 1;

        nextNodes.push({
          id: n.id,
          type: "observed_phenotype",
          position: { x: curr.x, y: curr.y },
          zIndex: idx === 0 ? 40 : Math.max(2, 30 - idx),
          sourcePosition: pose.sourcePosition,
          targetPosition: pose.targetPosition,
          data: {
            label: n.label,
            hpo_id: n.hpo_id,
            isTopObservation: idx === 0,
            canStack,
            isStacked: effectiveStacked,
            stackIndex: idx,
            obsCount,
            handlePosition: pose.sourcePosition,
            deckRotate: curr.rot ?? (effectiveStacked && idx > 0 ? -Math.min(idx, 3) * 0.8 : 0),
            deckScale: curr.scale ?? (effectiveStacked && idx > 0 ? 1 - Math.min(idx, 3) * 0.025 : 1),
            deckOpacity: curr.opacity ?? baseOpacity,
            onToggleStack: handleToggleStack,
          },
        });
      });

      micaNodes.forEach((m) => {
        const pose = targetLayout.poses.get(m.id)!;
        const curr = customPoses.get(m.id) || { x: pose.x, y: pose.y };
        livePosRef.current.set(m.id, { x: curr.x, y: curr.y });

        nextNodes.push({
          id: m.id,
          type: "hpo_ancestor",
          position: { x: curr.x, y: curr.y },
          zIndex: 15,
          sourcePosition: pose.sourcePosition,
          targetPosition: pose.targetPosition,
          data: {
            label: m.label,
            hpo_id: m.hpo_id,
            sourcePosition: pose.sourcePosition,
            targetPosition: pose.targetPosition,
          },
        });
      });

      const dPose = targetLayout.poses.get(diseaseNode.id)!;
      const dCurr = customPoses.get(diseaseNode.id) || { x: dPose.x, y: dPose.y };
      livePosRef.current.set(diseaseNode.id, { x: dCurr.x, y: dCurr.y });

      nextNodes.push({
        id: diseaseNode.id,
        type: "candidate_disease",
        position: { x: dCurr.x, y: dCurr.y },
        zIndex: 25,
        sourcePosition: Position.Right,
        targetPosition: dPose.targetPosition,
        data: {
          label: diseaseNode.label,
          disease_id: diseaseNode.disease_id,
          candidate_rank: diseaseNode.candidate_rank,
          isInspectorOpen: showInspectorCardRef.current,
        },
      });

      setNodes(nextNodes);
    };

    morphTlRef.current?.kill();

    if (!shouldAnimate) {
      canvasWrapRef.current?.classList.remove("graph-morphing");
      const staticMap = new Map<string, { x: number; y: number }>();
      targetLayout.poses.forEach((p, id) => staticMap.set(id, { x: p.x, y: p.y }));
      buildNodesWithPoses(staticMap);
      buildEdgesAtPose();
      updateNodeInternals(Array.from(targetLayout.poses.keys()));
      return;
    }

    // Snapshot start coordinates & initial deck transforms so frame 0 starts cleanly without snap
    const startMap = new Map<string, { x: number; y: number; rot?: number; scale?: number; opacity?: number }>();
    targetLayout.poses.forEach((endPose, id) => {
      const prev = livePosRef.current.get(id);
      startMap.set(id, prev ? { ...prev } : { x: endPose.x, y: endPose.y });
    });
    obsNodes.forEach((n, idx) => {
      const base = startMap.get(n.id)!;
      if (idx === 0) return;
      const tier = Math.min(idx, 4);
      startMap.set(n.id, {
        ...base,
        rot: effectiveStacked ? 0 : -Math.min(idx, 3) * 0.8,
        scale: effectiveStacked ? 1 : 1 - Math.min(idx, 3) * 0.025,
        opacity: effectiveStacked ? 1 : Math.max(0.54, 1 - tier * 0.11),
      });
    });

    canvasWrapRef.current?.classList.add("graph-morphing");
    buildNodesWithPoses(startMap);
    buildEdgesAtPose();

    const obsDomCache = new Map<string, HTMLElement>();
    const state = { stackT: 0, diseaseT: 0 };
    const tl = gsap.timeline({
      onUpdate: () => {
        const framePos = new Map<string, { x: number; y: number }>();

        // 1. Findings travel in a smooth monotonic circular sweep (node.data stays untouched for memo 60fps)
        const denom = Math.max(1, obsCount - 1);
        obsNodes.forEach((n, idx) => {
          const s = startMap.get(n.id)!;
          const e = targetLayout.poses.get(n.id)!;
          if (idx === 0) {
            const u = gsap.parseEase("power2.inOut")(state.stackT);
            const p = {
              x: s.x + (e.x - s.x) * u,
              y: s.y + (e.y - s.y) * u,
            };
            livePosRef.current.set(n.id, p);
            framePos.set(n.id, p);
            return;
          }

          const delayFrac = ((idx - 1) / denom) * 0.16;
          const localLinear = Math.max(
            0,
            Math.min(1, (state.stackT - delayFrac) / (1 - 0.16))
          );
          const u = gsap.parseEase("power2.inOut")(localLinear);

          const pos = interpolateAlongCircle(
            s.x,
            s.y,
            e.x,
            e.y,
            targetLayout.orbitCenter.x,
            targetLayout.orbitCenter.y,
            u
          );
          livePosRef.current.set(n.id, pos);
          framePos.set(n.id, pos);

          let el = obsDomCache.get(n.id);
          if (!el && canvasWrapRef.current) {
            el = canvasWrapRef.current.querySelector<HTMLElement>(`[data-obs-id="${n.id}"]`) || undefined;
            if (el) obsDomCache.set(n.id, el);
          }
          if (el) {
            const flightArc = Math.sin(u * Math.PI);
            const tier = Math.min(idx, 4);
            const startRot = s.rot ?? 0;
            const endRot = effectiveStacked ? -Math.min(idx, 3) * 0.8 : 0;
            const startScale = s.scale ?? 1;
            const endScale = effectiveStacked ? 1 - Math.min(idx, 3) * 0.025 : 1;
            const startOpacity = s.opacity ?? 1;
            const endOpacity = effectiveStacked ? Math.max(0.54, 1 - tier * 0.11) : 1;

            const rot = startRot + (endRot - startRot) * u - flightArc * 2.0;
            const scale = startScale + (endScale - startScale) * u + flightArc * 0.015;
            const opacity = startOpacity + (endOpacity - startOpacity) * u;
            el.style.transform = `scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
            el.style.opacity = opacity.toFixed(3);
          }
        });

        // 2. MICA nodes settle smoothly
        const micaU = gsap.parseEase("power2.inOut")((state.stackT + state.diseaseT) * 0.5);
        micaNodes.forEach((m) => {
          const s = startMap.get(m.id)!;
          const e = targetLayout.poses.get(m.id)!;
          const p = {
            x: s.x + (e.x - s.x) * micaU,
            y: s.y + (e.y - s.y) * micaU,
          };
          livePosRef.current.set(m.id, p);
          framePos.set(m.id, p);
        });

        // 3. Disease node glides deliberately beneath stacked findings
        const dStart = startMap.get(diseaseNode.id)!;
        const dEnd = targetLayout.poses.get(diseaseNode.id)!;
        const du = gsap.parseEase("power3.inOut")(state.diseaseT);
        const arcDip = Math.sin(du * Math.PI) * 14;
        const dPos = {
          x: dStart.x + (dEnd.x - dStart.x) * du,
          y: dStart.y + (dEnd.y - dStart.y) * du + arcDip,
        };
        livePosRef.current.set(diseaseNode.id, dPos);
        framePos.set(diseaseNode.id, dPos);

        // Position-only update keeps node.data reference-stable so React Flow memo skips JSX re-renders
        setNodes((prev) =>
          prev.map((node) => {
            const p = framePos.get(node.id);
            return p ? { ...node, position: p } : node;
          })
        );
      },
      onComplete: () => {
        canvasWrapRef.current?.classList.remove("graph-morphing");
        const finalMap = new Map<string, { x: number; y: number }>();
        targetLayout.poses.forEach((p, id) => finalMap.set(id, { x: p.x, y: p.y }));
        buildNodesWithPoses(finalMap);
        buildEdgesAtPose();
        const allIds = Array.from(targetLayout.poses.keys());
        window.requestAnimationFrame(() => updateNodeInternals(allIds));
      },
    });

    // Stack Findings first along a smooth circular orbit, then glide Candidate Disease beneath when Card opens
    tl.to(state, { stackT: 1, duration: 0.68, ease: "none" }, 0);
    tl.to(
      state,
      { diseaseT: 1, duration: shiftDiseaseBelow ? 0.70 : 0.56, ease: "none" },
      shiftDiseaseBelow ? 0.16 : 0
    );

    morphTlRef.current = tl;
    const allIds = Array.from(targetLayout.poses.keys());
    window.requestAnimationFrame(() => updateNodeInternals(allIds));
    if (shiftDiseaseBelow || obsCount > 5) {
      fitGraphFraming(shiftDiseaseBelow ? 620 : 540);
    }
  }, [
    filteredGraph,
    targetLayout,
    isDark,
    effectiveStacked,
    shiftDiseaseBelow,
    handleToggleStack,
    setNodes,
    setEdges,
    updateNodeInternals,
    fitGraphFraming,
  ]);

  // Synchronize hover illumination & inspector active state without disturbing coordinates
  useEffect(() => {
    const diseaseId = filteredGraph.diseaseNode?.id;
    const topObsId = filteredGraph.obsNodes[0]?.id;

    setNodes((prev) =>
      prev.map((node) => {
        const nextInspector =
          node.id === diseaseId ? showInspectorCard : node.data?.isInspectorOpen;
        const nextHighlighted = highlightedPath
          ? highlightedPath.nodes.has(node.id)
          : false;
        const nextDimmed =
          highlightedPath && node.type !== "candidate_disease"
            ? !highlightedPath.nodes.has(node.id)
            : false;

        if (
          node.data?.isInspectorOpen === nextInspector &&
          node.data?.isHighlighted === nextHighlighted &&
          node.data?.isDimmed === nextDimmed
        ) {
          return node;
        }
        return {
          ...node,
          data: {
            ...node.data,
            ...(node.id === diseaseId ? { isInspectorOpen: showInspectorCard } : {}),
            isHighlighted: nextHighlighted,
            isDimmed: nextDimmed,
          },
        };
      })
    );

    setEdges((prev) =>
      prev.map((edge) => {
        const nextHighlighted = highlightedPath
          ? highlightedPath.edges.has(edge.id)
          : false;
        const nextDimmed = highlightedPath
          ? !highlightedPath.edges.has(edge.id)
          : false;
        const nextGhost = Boolean(
          effectiveStacked && topObsId && edge.source !== topObsId && edge.data?.tier === 0
        );

        if (
          edge.data?.isHighlighted === nextHighlighted &&
          edge.data?.isDimmed === nextDimmed &&
          edge.data?.isStackedGhost === nextGhost
        ) {
          return edge;
        }
        return {
          ...edge,
          data: {
            ...edge.data,
            isHighlighted: nextHighlighted,
            isDimmed: nextDimmed,
            isStackedGhost: nextGhost,
          },
        };
      })
    );
  }, [
    highlightedPath,
    showInspectorCard,
    effectiveStacked,
    filteredGraph.diseaseNode?.id,
    filteredGraph.obsNodes,
    setNodes,
    setEdges,
  ]);

  const handleZoomStep = useCallback(
    (delta: number) => {
      const vp = getViewport();
      const nextZoom = Math.min(safeMaxZoom, Math.max(safeMinZoom, vp.zoom + delta));
      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;
      const worldCx = (cx - vp.x) / vp.zoom;
      const worldCy = (cy - vp.y) / vp.zoom;
      const target = clampViewport({
        zoom: nextZoom,
        x: cx - worldCx * nextZoom,
        y: cy - worldCy * nextZoom,
      });
      setZoomPercent(Math.round(target.zoom * 100));
      const effDuration = prefersReducedMotion() ? 0 : 200;
      if (effDuration > 0) {
        isProgrammaticViewportRef.current = true;
        if (programmaticVpTimerRef.current !== null) {
          window.clearTimeout(programmaticVpTimerRef.current);
        }
        programmaticVpTimerRef.current = window.setTimeout(() => {
          isProgrammaticViewportRef.current = false;
        }, effDuration + 50);
      }
      setViewport(target, { duration: effDuration });
    },
    [getViewport, safeMaxZoom, safeMinZoom, canvasSize.width, canvasSize.height, clampViewport, setViewport]
  );

  const enforceBoundsOnViewport = useCallback(
    (viewport: Viewport, syncZoomLabel = false) => {
      const clamped = clampViewport(viewport);
      if (syncZoomLabel) {
        setZoomPercent(Math.round(clamped.zoom * 100));
      }

      if (isClampingViewportRef.current || isProgrammaticViewportRef.current) return;
      const drifted =
        Math.abs(clamped.x - viewport.x) > 0.75 ||
        Math.abs(clamped.y - viewport.y) > 0.75 ||
        Math.abs(clamped.zoom - viewport.zoom) > 0.004;
      if (!drifted) return;

      isClampingViewportRef.current = true;
      setViewport(clamped, { duration: 0 });
      window.requestAnimationFrame(() => {
        isClampingViewportRef.current = false;
      });
    },
    [clampViewport, setViewport]
  );

  // Reframe cleanly whenever the selected candidate disease switches
  const lastFramedDiseaseRef = useRef<string>("");
  useEffect(() => {
    if (!filteredGraph.diseaseNode) return;
    const key = `${filteredGraph.diseaseNode.id}:${filteredGraph.obsNodes.length}`;
    if (lastFramedDiseaseRef.current === key) return;
    lastFramedDiseaseRef.current = key;

    const timer = window.setTimeout(() => {
      fitGraphFraming(prefersReducedMotion() ? 0 : 420);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [filteredGraph.diseaseNode, filteredGraph.obsNodes.length, fitGraphFraming]);

  useEffect(() => {
    if (!filteredGraph.diseaseNode) {
      lastEntranceKeyRef.current = "";
      setEntranceRunKey("");
      return;
    }
    const nextKey = `${filteredGraph.diseaseNode.id}:${filteredGraph.obsNodes.length}:${filteredGraph.micaNodes.length}`;
    if (nodesInitialized && nextKey !== lastEntranceKeyRef.current) {
      lastEntranceKeyRef.current = nextKey;
      setEntranceRunKey(nextKey);
    }
  }, [
    nodesInitialized,
    filteredGraph.diseaseNode,
    filteredGraph.obsNodes.length,
    filteredGraph.micaNodes.length,
  ]);

  // Choreographed signal-trace entrance once freshly switched candidate nodes commit (never on stack/hover morphs)
  useGSAP(
    () => {
      if (prefersReducedMotion() || !entranceRunKey || !canvasWrapRef.current) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      const obsEls = gsap.utils.toArray<HTMLElement>("[data-node-kind='obs']", canvasWrapRef.current);
      if (obsEls.length > 0) {
        tl.fromTo(
          obsEls,
          { opacity: 0, x: -20, scale: 0.94 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            stagger: 0.05,
            duration: 0.34,
            clearProps: "transform,opacity",
          },
          0
        );
      }

      const tier0Edges = gsap.utils.toArray<SVGPathElement>(
        "[data-edge-reveal='true'][data-edge-tier='0']",
        canvasWrapRef.current
      );
      if (tier0Edges.length > 0) {
        tl.fromTo(
          tier0Edges,
          { strokeDashoffset: 100, opacity: 0.95 },
          {
            strokeDashoffset: 0,
            opacity: 0.95,
            stagger: 0.04,
            duration: 0.4,
            ease: "power2.out",
          },
          0.08
        ).to(tier0Edges, { opacity: 0, duration: 0.22, clearProps: "opacity" }, 0.42);
      }

      const micaEls = gsap.utils.toArray<HTMLElement>("[data-node-kind='mica']", canvasWrapRef.current);
      if (micaEls.length > 0) {
        tl.fromTo(
          micaEls,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            stagger: 0.05,
            duration: 0.32,
            ease: "back.out(1.4)",
            clearProps: "transform,opacity",
          },
          0.22
        );
      }

      const tier1Edges = gsap.utils.toArray<SVGPathElement>(
        "[data-edge-reveal='true'][data-edge-tier='1']",
        canvasWrapRef.current
      );
      if (tier1Edges.length > 0) {
        tl.fromTo(
          tier1Edges,
          { strokeDashoffset: 100, opacity: 0.95 },
          {
            strokeDashoffset: 0,
            opacity: 0.95,
            stagger: 0.05,
            duration: 0.34,
            ease: "power2.out",
          },
          0.28
        ).to(tier1Edges, { opacity: 0, duration: 0.22, clearProps: "opacity" }, 0.56);
      }

      const diseaseStart = micaEls.length > 0 ? 0.34 : 0.16;
      const diseaseEls = gsap.utils.toArray<HTMLElement>("[data-node-kind='disease']", canvasWrapRef.current);
      if (diseaseEls.length > 0) {
        tl.fromTo(
          diseaseEls,
          { opacity: 0.25, scale: 0.93 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.42,
            ease: "back.out(1.25)",
            clearProps: "transform,opacity",
          },
          diseaseStart
        );
      }

      const pulseEls = gsap.utils.toArray<HTMLElement>("[data-disease-pulse='true']", canvasWrapRef.current);
      if (pulseEls.length > 0) {
        tl.fromTo(
          pulseEls,
          { scale: 0.96, opacity: 0.72 },
          {
            scale: 1.08,
            opacity: 0,
            duration: 0.65,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
          diseaseStart + 0.22
        );
      }
    },
    {
      scope: canvasWrapRef,
      dependencies: [entranceRunKey],
      revertOnUpdate: true,
    }
  );

  const handleFlowNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.data?.isTopObservation && Number(node.data?.obsCount) > 1) {
        handleToggleStack();
        return;
      }
      if (node.type === "candidate_disease") {
        setIsCardPinned((prev) => !prev);
      }
      onNodeClick?.(node.id);
    },
    [handleToggleStack, onNodeClick]
  );

  const obsCount = filteredGraph.obsNodes.length;
  const minZoomPercent = Math.round(safeMinZoom * 100);
  const maxZoomPercent = Math.round(safeMaxZoom * 100);
  const canZoomOut = zoomPercent > minZoomPercent + 1;
  const canZoomIn = zoomPercent < maxZoomPercent - 1;

  return (
    <div className="surface-card p-4 flex flex-col h-full relative overflow-hidden">
      {/* Header + Quick Graph & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 z-10">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111] dark:text-[#f3f3ee] m-0">
            Interactive evidence graph
          </h2>
          <span className="text-[11px] font-mono text-[#66665f] dark:text-[#a1a196]">
            {filteredGraph.diseaseNode
              ? showInspectorCard
                ? `Focused on ${filteredGraph.diseaseNode.label} · Summary card open`
                : `Focused on ${filteredGraph.diseaseNode.label} · ${
                    obsCount > 5 ? "Orbital layout" : "Bounded pan & zoom"
                  }`
              : "Deterministic HPO paths linking findings to selected candidate syndrome"}
          </span>
        </div>

        {filteredGraph.diseaseNode && (
          <div className="flex flex-wrap items-center gap-1.5">
            {obsCount > 1 && (
              <button
                type="button"
                onClick={handleToggleStack}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                  effectiveStacked
                    ? "bg-teal-700 text-white border-teal-700 dark:bg-teal-500 dark:text-[#042f2e] dark:border-teal-500 font-semibold"
                    : "bg-white text-[#111] border-[#dcdcd6] hover:border-teal-600/70 hover:bg-teal-50/40 dark:bg-[#1e1e1b] dark:text-[#f3f3ee] dark:border-[#33332e] dark:hover:border-teal-400/70 dark:hover:bg-[#282824]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{effectiveStacked ? `Expand findings (${obsCount})` : `Stack findings (${obsCount})`}</span>
              </button>
            )}

            <div className="inline-flex items-center bg-white dark:bg-[#1a1a18] border border-[#dcdcd6] dark:border-[#33332e] rounded-lg overflow-hidden text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleZoomStep(-0.15)}
                disabled={!canZoomOut}
                title="Zoom out"
                aria-label="Zoom out graph"
                className="px-2 py-1.5 text-[#55554f] hover:text-[#111] hover:bg-[#f4f4f0] dark:text-[#b2b2a7] dark:hover:text-[#f3f3ee] dark:hover:bg-[#262622] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-1.5 text-[#111] dark:text-[#f3f3ee] tabular-nums border-x border-[#ecece6] dark:border-[#2e2e2a] min-w-[46px] text-center">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={() => handleZoomStep(0.15)}
                disabled={!canZoomIn}
                title="Zoom in"
                aria-label="Zoom in graph"
                className="px-2 py-1.5 text-[#55554f] hover:text-[#111] hover:bg-[#f4f4f0] dark:text-[#b2b2a7] dark:hover:text-[#f3f3ee] dark:hover:bg-[#262622] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fitGraphFraming(360)}
                title="Fit graph in view"
                aria-label="Fit graph in view"
                className="px-2 py-1.5 text-[#55554f] hover:text-[#111] hover:bg-[#f4f4f0] dark:text-[#b2b2a7] dark:hover:text-[#f3f3ee] dark:hover:bg-[#262622] border-l border-[#ecece6] dark:border-[#2e2e2a] transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fit</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Graph Viewport + Floating Summary Card */}
      <div
        ref={canvasWrapRef}
        onMouseLeave={handleCanvasMouseLeave}
        className="flex-1 w-full min-h-[360px] sm:min-h-[460px] lg:min-h-[540px] rounded-xl border border-[#e5e5e0] dark:border-[#2e2e2a] bg-[#fafaf8] dark:bg-[#111110] overflow-hidden relative"
      >
        {isMatching ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-4"
            role="status"
            aria-live="polite"
          >
            <ThinkingOrb state="searching" size={64} theme={theme} aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#111] dark:text-[#f3f3ee]">Traversing HPO Ancestry</p>
              <p className="text-xs font-mono text-[#66665f] dark:text-[#a1a196]">
                Computing Lin semantic similarity over confirmed patient observations…
              </p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-xs text-[#66665f] dark:text-[#a1a196] gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1a1a18] border border-[#e5e5e0] dark:border-[#2e2e2a] shadow-xs flex items-center justify-center text-[#111] dark:text-[#f3f3ee]">
              <Network className="w-6 h-6 stroke-[1.6]" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="font-semibold text-sm text-[#111] dark:text-[#f3f3ee]">Evidence canvas standing by</p>
              <p className="text-xs text-[#66665f] dark:text-[#a1a196]">
                Extract and attest patient findings to render shared MICA paths for the selected syndrome.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodeExtent={nodeExtent}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleFlowNodeClick}
              onPaneClick={() => {
                setIsCardPinned(false);
              }}
              onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
              onNodeMouseLeave={() => setHoveredNodeId(null)}
              onInit={() => fitGraphFraming(0)}
              onMove={(_e, viewport: Viewport) => enforceBoundsOnViewport(viewport, false)}
              onMoveEnd={(_e, viewport: Viewport) => enforceBoundsOnViewport(viewport, true)}
              minZoom={safeMinZoom}
              maxZoom={safeMaxZoom}
              zoomOnScroll
              zoomOnPinch
              panOnDrag
              zoomOnDoubleClick={false}
              attributionPosition="bottom-left"
            >
              <Background color={isDark ? "#2a2a25" : "#dcdcd6"} gap={20} size={1} />
              {!showInspectorCard && canvasSize.width >= 600 && (
                <MiniMap
                  pannable
                  zoomable
                  nodeStrokeColor={() => (isDark ? "#2dd4bf" : "#0f766e")}
                  nodeColor={() => (isDark ? "#252521" : "#f0f0ec")}
                  maskColor={isDark ? "rgba(12, 12, 11, 0.72)" : "rgba(247, 247, 245, 0.7)"}
                  style={{
                    background: isDark ? "#151513" : "#ffffff",
                    border: isDark ? "1px solid #2e2e2a" : "1px solid #e5e5e0",
                    borderRadius: 8,
                  }}
                />
              )}
            </ReactFlow>

            {/* Hint pill when card is closed */}
            {!showInspectorCard && selectedCandidate && (
              <button
                type="button"
                onClick={() => setIsCardPinned(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 absolute top-3 right-3 z-20 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#1a1a18]/95 border border-teal-200 dark:border-teal-800 shadow-xs text-[11px] font-mono text-teal-800 dark:text-teal-300 hover:border-teal-600 dark:hover:border-teal-400 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0" />
                <span className="sm:hidden">Tap to inspect</span>
                <span className="hidden sm:inline">Click disease block to inspect</span>
              </button>
            )}

            {/* Floating Editorial Summary Card on wide canvases (docked cleanly below on narrow widths) */}
            {showInspectorCard && selectedCandidate && canvasSize.width >= 760 && (
              <div className="absolute top-5 right-5 bottom-5 w-[min(392px,calc(100%-2.5rem))] z-30 pointer-events-none flex items-center justify-end">
                <div className="pointer-events-auto w-full max-h-full flex flex-col">
                  <EvidenceInspector
                    selectedCandidate={selectedCandidate}
                    excludedObservations={excludedObservations}
                    onClose={() => setIsCardPinned(false)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Docked Editorial Summary Card on compact/mobile/tablet canvases so nodes remain unoccluded */}
      {showInspectorCard && selectedCandidate && canvasSize.width < 760 && (
        <div className="mt-3 w-full max-h-[460px] flex flex-col">
          <EvidenceInspector
            selectedCandidate={selectedCandidate}
            excludedObservations={excludedObservations}
            onClose={() => setIsCardPinned(false)}
          />
        </div>
      )}
    </div>
  );
};

export const EvidenceGraphView: React.FC<EvidenceGraphViewProps> = (props) => (
  <ReactFlowProvider>
    <EvidenceGraphCanvas {...props} />
  </ReactFlowProvider>
);
