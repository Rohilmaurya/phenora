import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import type { Config, Context } from "@netlify/functions";

interface RawPack {
  manifest: {
    pack_id: string;
    ontology_release: string;
    annotation_release: string;
    manifest_sha256: string;
  };
  terms: [string, string][];
  ic: Record<string, number>;
  edges: [number, number][];
  syns: [number, string, number][];
  diseases: [string, string, string, string | null, string | null, string | null, string | null][];
  rels: string[];
  ann: [number, number, number, string, string, string, number][];
}

interface DiseaseAnnotation {
  termIdx: number;
  hpoId: string;
  polarity: "present" | "absent";
  frequency: string | null;
  evidenceCode: string | null;
  reference: string | null;
  sourceRelease: string;
}

interface Engine {
  manifest: RawPack["manifest"];
  terms: [string, string][];
  hpoToIdx: Map<string, number>;
  icValues: Float64Array;
  parentsByIdx: number[][];
  ancestorsCache: Map<number, Map<number, number>>;
  micaCache: Map<string, [number | null, number]>;
  lowerLabels: string[];
  synsByLower: Map<string, number[]>;
  synsList: [number, string, string, number][];
  exactLabelMap: Map<string, number[]>;
  diseases: RawPack["diseases"];
  diseasePresentAnn: DiseaseAnnotation[][];
  ancToDiseases: Map<number, number[]>;
  extractablePhrases: Map<string, string> | null;
}

const STOP_PHRASES = new Set([
  "normal",
  "abnormal",
  "absent",
  "present",
  "severe",
  "mild",
  "moderate",
  "bilateral",
  "unilateral",
  "progressive",
  "congenital",
  "infantile",
  "childhood",
  "adolescent",
  "adult",
  "neonatal",
  "prenatal",
  "chronic",
  "acute",
  "recurrent",
  "episodic",
  "history",
  "family",
  "routine",
  "evaluation",
  "examination",
  "weakness",
  "delay",
  "syndrome",
  "disease",
  "disorder",
  "abnormality",
  "finding",
  "features",
  "symptom",
  "symptoms",
  "pain",
  "short",
  "tall",
  "small",
  "large",
  "increased",
  "decreased",
  "reduced",
  "elevated",
  "delayed",
  "early",
  "late",
]);

const MOCK_PATTERNS: [string, string][] = [
  ["aortic root aneurysm", "Aortic root aneurysm"],
  ["aortic root dilation", "Aortic root aneurysm"],
  ["aortic root dilatation", "Aortic root aneurysm"],
  ["sinuses of valsalva", "Aortic root aneurysm"],
  ["arachnodactyly", "Arachnodactyly"],
  ["spider fingers", "Arachnodactyly"],
  ["ectopia lentis", "Ectopia lentis"],
  ["dislocated lens", "Ectopia lentis"],
  ["lens subluxation", "Ectopia lentis"],
  ["crystalline lens subluxation", "Ectopia lentis"],
  ["pectus excavatum", "Pectus excavatum"],
  ["sunken chest", "Pectus excavatum"],
  ["pectus carinatum", "Pectus carinatum"],
  ["joint hypermobility", "Joint hypermobility"],
  ["hypermobility", "Joint hypermobility"],
  ["high-arched narrow palate", "High-arched palate"],
  ["high-arched palate", "High-arched palate"],
  ["high arched palate", "High-arched palate"],
  ["tall stature", "Tall stature"],
  ["scoliosis", "Scoliosis"],
  ["pes planus", "Pes planus"],
  ["flat feet", "Pes planus"],
  ["dolichocephaly", "Dolichocephaly"],
  ["malar hypoplasia", "Malar hypoplasia"],
  ["retrognathia", "Retrognathia"],
  ["mitral valve prolapse", "Mitral valve prolapse"],
  ["striae atrophicae", "Striae distensae"],
  ["striae", "Striae distensae"],
  ["febrile status epilepticus", "Status epilepticus"],
  ["status epilepticus", "Status epilepticus"],
  ["febrile seizures", "Febrile seizure (within the pediatric population)"],
  ["febrile seizure", "Febrile seizure (within the pediatric population)"],
  ["epileptic seizures", "Seizure"],
  ["seizures", "Seizure"],
  ["seizure", "Seizure"],
  ["ataxia", "Ataxia"],
  ["hypotonia", "Hypotonia"],
  ["floppy", "Hypotonia"],
  ["developmental regression", "Developmental regression"],
  ["developmental delay", "Global developmental delay"],
  ["global developmental delay", "Global developmental delay"],
  ["intellectual disability", "Intellectual disability"],
  ["hand wringing", "Hand wringing"],
  ["hand stereotypy", "Hand stereotypy"],
  ["loss of spoken language", "Absent speech"],
  ["absent speech", "Absent speech"],
  ["non-verbal", "Absent speech"],
  ["microcephaly", "Microcephaly"],
  ["macrocephaly", "Macrocephaly"],
  ["hepatosplenomegaly", "Hepatosplenomegaly"],
  ["hepatomegaly", "Hepatomegaly"],
  ["splenomegaly", "Splenomegaly"],
  ["coarse facial features", "Coarse facial features"],
  ["corneal clouding", "Corneal opacity"],
  ["cafe-au-lait spot", "Cafe-au-lait spot"],
  ["cafe-au-lait spots", "Cafe-au-lait spot"],
  ["cafe au lait spots", "Cafe-au-lait spot"],
  ["neurofibroma", "Neurofibroma"],
  ["ash leaf spot", "Hypopigmented macule"],
  ["ash leaf spots", "Hypopigmented macule"],
  ["hypopigmented macule", "Hypopigmented macule"],
].sort((a, b) => b[0].length - a[0].length);

let cachedEngine: Engine | null = null;

function resolvePackPath(): string {
  const candidates: string[] = [];
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(__dirname, "../data/phenora_who_pack.json.gz"));
    candidates.push(path.resolve(__dirname, "../../netlify/data/phenora_who_pack.json.gz"));
  } catch {
    // ignore URL fallback
  }
  candidates.push(path.resolve(process.cwd(), "netlify/data/phenora_who_pack.json.gz"));
  candidates.push(path.resolve(process.cwd(), "frontend/netlify/data/phenora_who_pack.json.gz"));
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`WHO pack bundle not found; checked: ${candidates.join(", ")}`);
}

function getEngine(): Engine {
  if (cachedEngine) return cachedEngine;

  const packPath = resolvePackPath();
  const gzBytes = fs.readFileSync(packPath);
  const raw: RawPack = JSON.parse(zlib.gunzipSync(gzBytes).toString("utf-8"));

  const nTerms = raw.terms.length;
  const hpoToIdx = new Map<string, number>();
  const lowerLabels: string[] = new Array(nTerms);
  const exactLabelMap = new Map<string, number[]>();

  for (let i = 0; i < nTerms; i++) {
    const [hpoId, label] = raw.terms[i];
    hpoToIdx.set(hpoId, i);
    const low = label.toLowerCase();
    lowerLabels[i] = low;
    const arr = exactLabelMap.get(low);
    if (arr) arr.push(i);
    else exactLabelMap.set(low, [i]);
  }

  const icValues = new Float64Array(nTerms);
  for (const [k, v] of Object.entries(raw.ic)) {
    icValues[Number(k)] = v;
  }

  const parentsByIdx: number[][] = Array.from({ length: nTerms }, () => []);
  for (const [childIdx, parentIdx] of raw.edges) {
    parentsByIdx[childIdx].push(parentIdx);
  }

  const synsByLower = new Map<string, number[]>();
  const synsList: [number, string, string, number][] = new Array(raw.syns.length);
  for (let i = 0; i < raw.syns.length; i++) {
    const [tIdx, syn, isExact] = raw.syns[i];
    const low = syn.toLowerCase();
    synsList[i] = [tIdx, syn, low, isExact];
    const arr = synsByLower.get(low);
    if (arr) arr.push(tIdx);
    else synsByLower.set(low, [tIdx]);
  }

  const ancestorsCache = new Map<number, Map<number, number>>();
  const getAncestors = (idx: number): Map<number, number> => {
    const cached = ancestorsCache.get(idx);
    if (cached) return cached;
    const distMap = new Map<number, number>([[idx, 0]]);
    const queue: [number, number][] = [[idx, 0]];
    let head = 0;
    while (head < queue.length) {
      const [curr, d] = queue[head++];
      const parents = parentsByIdx[curr];
      for (let p = 0; p < parents.length; p++) {
        const pid = parents[p];
        if (!distMap.has(pid)) {
          distMap.set(pid, d + 1);
          queue.push([pid, d + 1]);
        }
      }
    }
    ancestorsCache.set(idx, distMap);
    return distMap;
  };

  const nDiseases = raw.diseases.length;
  const diseasePresentAnn: DiseaseAnnotation[][] = Array.from({ length: nDiseases }, () => []);
  const ancToDisSets = new Map<number, Set<number>>();

  for (let i = 0; i < raw.ann.length; i++) {
    const [dIdx, tIdx, present, freq, ev, ref, relIdx] = raw.ann[i];
    if (present !== 1) continue;
    const hpoId = raw.terms[tIdx][0];
    diseasePresentAnn[dIdx].push({
      termIdx: tIdx,
      hpoId,
      polarity: "present",
      frequency: freq || null,
      evidenceCode: ev || null,
      reference: ref || null,
      sourceRelease: raw.rels[relIdx] || raw.manifest.annotation_release,
    });
    const ancMap = getAncestors(tIdx);
    for (const ancIdx of ancMap.keys()) {
      if (icValues[ancIdx] > 0) {
        let s = ancToDisSets.get(ancIdx);
        if (!s) {
          s = new Set<number>();
          ancToDisSets.set(ancIdx, s);
        }
        s.add(dIdx);
      }
    }
  }

  const ancToDiseases = new Map<number, number[]>();
  for (const [ancIdx, s] of ancToDisSets.entries()) {
    ancToDiseases.set(ancIdx, Array.from(s));
  }

  cachedEngine = {
    manifest: raw.manifest,
    terms: raw.terms,
    hpoToIdx,
    icValues,
    parentsByIdx,
    ancestorsCache,
    micaCache: new Map(),
    lowerLabels,
    synsByLower,
    synsList,
    exactLabelMap,
    diseases: raw.diseases,
    diseasePresentAnn,
    ancToDiseases,
    extractablePhrases: null,
  };
  return cachedEngine;
}

function getAncestors(eng: Engine, idx: number): Map<number, number> {
  const cached = eng.ancestorsCache.get(idx);
  if (cached) return cached;
  const distMap = new Map<number, number>([[idx, 0]]);
  const queue: [number, number][] = [[idx, 0]];
  let head = 0;
  while (head < queue.length) {
    const [curr, d] = queue[head++];
    const parents = eng.parentsByIdx[curr];
    for (let p = 0; p < parents.length; p++) {
      const pid = parents[p];
      if (!distMap.has(pid)) {
        distMap.set(pid, d + 1);
        queue.push([pid, d + 1]);
      }
    }
  }
  eng.ancestorsCache.set(idx, distMap);
  return distMap;
}

function findMica(eng: Engine, idxA: number, idxB: number): [number | null, number] {
  if (idxA === idxB) {
    return [idxA, Math.max(0, eng.icValues[idxA])];
  }
  const key = idxA <= idxB ? `${idxA}:${idxB}` : `${idxB}:${idxA}`;
  const cached = eng.micaCache.get(key);
  if (cached) return cached;

  const ancA = getAncestors(eng, idxA);
  const ancB = getAncestors(eng, idxB);
  let bestIdx: number | null = null;
  let bestIc = -1;
  let bestHpoId = "";

  for (const anc of ancA.keys()) {
    if (!ancB.has(anc)) continue;
    const ic = eng.icValues[anc];
    const hpoId = eng.terms[anc][0];
    if (ic > bestIc || (ic === bestIc && hpoId < bestHpoId)) {
      bestIc = ic;
      bestIdx = anc;
      bestHpoId = hpoId;
    }
  }

  const res: [number | null, number] = bestIdx !== null ? [bestIdx, Math.max(0, bestIc)] : [null, 0];
  if (eng.micaCache.size > 250000) eng.micaCache.clear();
  eng.micaCache.set(key, res);
  return res;
}

function traceAncestorPath(eng: Engine, childIdx: number, ancestorIdx: number): string[] {
  if (childIdx === ancestorIdx) return [eng.terms[childIdx][0]];
  const pathIds = [eng.terms[childIdx][0]];
  let curr = childIdx;
  const visited = new Set<number>([childIdx]);

  while (curr !== ancestorIdx) {
    const currAnc = getAncestors(eng, curr);
    let nextStep: number | null = null;
    let minDist = Infinity;

    for (const [anc, dist] of currAnc.entries()) {
      if (dist === 1 && !visited.has(anc)) {
        const targetDist = getAncestors(eng, anc).get(ancestorIdx);
        if (targetDist !== undefined && targetDist < minDist) {
          minDist = targetDist;
          nextStep = anc;
        }
      }
    }
    if (nextStep === null) {
      pathIds.push(eng.terms[ancestorIdx][0]);
      break;
    }
    pathIds.push(eng.terms[nextStep][0]);
    visited.add(nextStep);
    curr = nextStep;
  }
  return pathIds;
}

function getExtractablePhrases(eng: Engine): Map<string, string> {
  if (eng.extractablePhrases) return eng.extractablePhrases;
  const rootPhenoIdx = eng.hpoToIdx.get("HP:0000118");
  const validTerms = new Set<number>();

  for (let i = 0; i < eng.terms.length; i++) {
    if (rootPhenoIdx !== undefined) {
      const dist = getAncestors(eng, i).get(rootPhenoIdx) ?? 0;
      if (dist >= 2) validTerms.add(i);
    }
  }

  const phrases = new Map<string, string>();
  for (const idx of validTerms) {
    const label = eng.terms[idx][1];
    const low = label.trim().toLowerCase();
    if (low.length >= 6 && !STOP_PHRASES.has(low) && !low.includes("(")) {
      phrases.set(low, label);
    }
  }
  for (let i = 0; i < eng.synsList.length; i++) {
    const [idx, syn, , isExact] = eng.synsList[i];
    if (isExact !== 1 || !validTerms.has(idx)) continue;
    const low = syn.trim().toLowerCase();
    if (
      low.length >= 6 &&
      !STOP_PHRASES.has(low) &&
      !low.includes("(") &&
      !phrases.has(low) &&
      (low.includes(" ") || low.includes("-") || low.length >= 8)
    ) {
      phrases.set(low, eng.terms[idx][1]);
    }
  }
  eng.extractablePhrases = phrases;
  return phrases;
}

function searchTerms(eng: Engine, query: string, limit: number) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: { hpo_id: string; label: string; match_kind: "exact_label" | "synonym" | "lexical" }[] = [];
  const seen = new Set<number>();

  for (const idx of eng.exactLabelMap.get(q) ?? []) {
    if (!seen.has(idx)) {
      results.push({ hpo_id: eng.terms[idx][0], label: eng.terms[idx][1], match_kind: "exact_label" });
      seen.add(idx);
    }
  }
  for (const idx of eng.synsByLower.get(q) ?? []) {
    if (!seen.has(idx)) {
      results.push({ hpo_id: eng.terms[idx][0], label: eng.terms[idx][1], match_kind: "synonym" });
      seen.add(idx);
    }
  }
  const cap = limit * 2;
  let subLblCount = 0;
  for (let i = 0; i < eng.lowerLabels.length && subLblCount < cap && results.length < limit; i++) {
    if (!seen.has(i) && eng.lowerLabels[i].includes(q)) {
      results.push({ hpo_id: eng.terms[i][0], label: eng.terms[i][1], match_kind: "lexical" });
      seen.add(i);
      subLblCount++;
    }
  }
  let subSynCount = 0;
  for (let i = 0; i < eng.synsList.length && subSynCount < cap && results.length < limit; i++) {
    const [idx, , lowSyn] = eng.synsList[i];
    if (!seen.has(idx) && lowSyn.includes(q)) {
      results.push({ hpo_id: eng.terms[idx][0], label: eng.terms[idx][1], match_kind: "synonym" });
      seen.add(idx);
      subSynCount++;
    }
  }
  return results.slice(0, limit);
}

function resolveTerm(eng: Engine, rawTerm: string) {
  const cleaned = rawTerm.trim().toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
  if (!cleaned) return { status: "unmapped" as const, candidates: [] };
  const candidates = searchTerms(eng, cleaned, 5);
  if (candidates.length === 0) return { status: "unmapped" as const, candidates: [] };
  const exact = candidates.filter((c) => c.match_kind === "exact_label");
  const syn = candidates.filter((c) => c.match_kind === "synonym");
  if (exact.length === 1) return { status: "exact" as const, candidates };
  if (exact.length > 1) return { status: "ambiguous" as const, candidates };
  if (syn.length === 1) return { status: "synonym" as const, candidates };
  if (syn.length > 1 || candidates.length > 1) return { status: "ambiguous" as const, candidates };
  return { status: "synonym" as const, candidates };
}

function analyzeContext(lowerNote: string, start: number, end: number) {
  const sentenceStart = Math.max(0, lowerNote.lastIndexOf(".", start) + 1);
  const prefix = lowerNote.slice(sentenceStart, start);

  let polarity: "present" | "negated" | "uncertain" = "present";
  if (/\b(no|not|denies|denied|without|negative for|negates|ruled out)\b/.test(prefix)) {
    polarity = "negated";
  } else if (/\b(possible|suspected|questionable|rule out|uncertain)\b/.test(prefix)) {
    polarity = "uncertain";
  }

  let experiencer: "patient" | "family_member" = "patient";
  if (/\b(mother|father|parent|sibling|brother|sister|family history|maternal|paternal|uncle|aunt)\b/.test(prefix)) {
    experiencer = "family_member";
  }

  let temporality: "current" | "historical" = "current";
  if (/\b(history of|past|previously|resolved)\b/.test(prefix)) {
    temporality = "historical";
  }

  let onset_age_group = "unknown";
  const upToEnd = lowerNote.slice(0, end);
  if (/\b(infant|infancy|baby|neonatal)\b/.test(upToEnd)) {
    onset_age_group = "infancy_29_days_to_1_year";
  } else if (/\b(toddler|early childhood)\b/.test(upToEnd)) {
    onset_age_group = "early_childhood_1_to_5_years";
  } else if (/\b(adolescent|teen|teenage)\b/.test(upToEnd)) {
    onset_age_group = "adolescence_12_to_17_years";
  }

  return { polarity, experiencer, temporality, onset_age_group };
}

function frequencyWeight(freq: string | null): number {
  if (!freq) return 0.85;
  if (freq === "HP:0040280") return 1.0;
  if (freq === "HP:0040281") return 0.96;
  if (freq === "HP:0040282") return 0.9;
  if (freq === "HP:0040283") return 0.78;
  if (freq === "HP:0040284") return 0.65;
  if (freq === "HP:0040285") return 0.0;
  const ratioMatch = /^(\d+)\/(\d+)$/.exec(freq.trim());
  if (ratioMatch && Number(ratioMatch[2]) > 0) {
    const ratio = Math.min(1, Number(ratioMatch[1]) / Number(ratioMatch[2]));
    return 0.7 + 0.3 * ratio;
  }
  if (freq.trim().endsWith("%")) {
    const pct = Number(freq.trim().slice(0, -1));
    if (Number.isFinite(pct)) {
      const ratio = Math.min(1, Math.max(0, pct / 100));
      return 0.7 + 0.3 * ratio;
    }
  }
  return 0.85;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function errorJson(requestId: string, code: string, message: string, status: number): Response {
  return jsonResponse({ request_id: requestId, code, message: message.slice(0, 240) }, status);
}

function requireBearer(req: Request, requestId: string): Response | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ") || auth.slice(7).trim().length < 10) {
    return errorJson(requestId, "unauthenticated", "Missing or invalid bearer authentication token", 401);
  }
  return null;
}

export default async (req: Request, _context: Context) => {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const url = new URL(req.url);
  const subPath = url.pathname.replace(/\/+$/, "");

  try {
    if (req.method === "GET" && subPath === "/v1/health") {
      const eng = getEngine();
      return jsonResponse({
        status: "ready",
        api_version: "v1",
        extractor_status: "ready",
        ontology_release: eng.manifest.ontology_release,
        annotation_release: eng.manifest.annotation_release,
        data_pack_id: eng.manifest.pack_id,
        model_pack_id: "phenora-model-v1",
        model_id: "mock-phenotype-ner-v1",
        model_version: "1.0.0",
      });
    }

    const authErr = requireBearer(req, requestId);
    if (authErr) return authErr;

    if (req.method === "POST" && subPath === "/v1/documents/extract-text") {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return errorJson(requestId, "invalid_request", "Missing clinical document upload.", 422);
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      if (buf.byteLength > 25 * 1024 * 1024) {
        return errorJson(requestId, "payload_too_large", "File size exceeds 25 MB limit", 413);
      }
      const mimeType = file.type || "application/octet-stream";
      const name = file.name.toLowerCase();
      if (name.endsWith(".txt") || mimeType.startsWith("text/")) {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
        return jsonResponse({
          extracted_text: text,
          detected_mime_type: mimeType,
          page_count: 1,
          extraction_method: "native_pdf_stream",
          warnings: [],
        });
      }
      return jsonResponse({
        extracted_text: "Scanned or binary clinical document uploaded. Please review or paste clinical note text in the editor.",
        detected_mime_type: mimeType,
        page_count: 1,
        extraction_method: "local_ocr",
        warnings: ["Netlify serverless runtime supports direct UTF-8 .txt extraction; PDF binary parsing requires the local Python server."],
      });
    }

    if (req.method === "POST" && subPath === "/v1/terms/search") {
      const body = (await req.json()) as { query?: string; limit?: number };
      const query = typeof body.query === "string" ? body.query.trim() : "";
      if (query.length < 2 || query.length > 120) {
        return errorJson(requestId, "invalid_request", "Query must be between 2 and 120 characters.", 422);
      }
      const limit = Math.min(20, Math.max(1, Number(body.limit ?? 10)));
      const eng = getEngine();
      return jsonResponse({
        ontology_release: eng.manifest.ontology_release,
        results: searchTerms(eng, query, limit),
      });
    }

    if (req.method === "POST" && subPath === "/v1/extractions") {
      const body = (await req.json()) as { note_text?: string };
      const noteText = typeof body.note_text === "string" ? body.note_text : "";
      if (!noteText.trim()) {
        return errorJson(requestId, "invalid_request", "note_text is required.", 422);
      }
      if (noteText.length > 50000) {
        return errorJson(requestId, "payload_too_large", "Note exceeds maximum limit of 50000 characters", 413);
      }

      const eng = getEngine();
      const lowerNote = noteText.toLowerCase();
      const seenSpans: [number, number][] = [];
      const rawMentions: {
        rawTerm: string;
        quote: string;
        start: number;
        end: number;
        polarity: string;
        temporality: string;
        experiencer: string;
        onset_age_group: string;
      }[] = [];

      const overlaps = (start: number, end: number) => seenSpans.some(([s, e]) => start < e && end > s);

      for (const [phrase, canonical] of MOCK_PATTERNS) {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b`, "gi");
        let m: RegExpExecArray | null;
        while ((m = re.exec(noteText)) !== null) {
          const start = m.index;
          const end = start + m[0].length;
          if (overlaps(start, end)) continue;
          seenSpans.push([start, end]);
          const ctx = analyzeContext(lowerNote, start, end);
          rawMentions.push({
            rawTerm: canonical,
            quote: noteText.slice(start, end),
            start,
            end,
            ...ctx,
          });
        }
      }

      const phrases = getExtractablePhrases(eng);
      const tokenSpans: [number, number][] = [];
      const tokRe = /[A-Za-z0-9-]+/g;
      let tm: RegExpExecArray | null;
      while ((tm = tokRe.exec(noteText)) !== null) {
        tokenSpans.push([tm.index, tm.index + tm[0].length]);
      }
      for (let nLen = 6; nLen >= 1; nLen--) {
        for (let idx = 0; idx <= tokenSpans.length - nLen; idx++) {
          const start = tokenSpans[idx][0];
          const end = tokenSpans[idx + nLen - 1][1];
          if (overlaps(start, end)) continue;
          const canonical = phrases.get(noteText.slice(start, end).toLowerCase());
          if (!canonical) continue;
          seenSpans.push([start, end]);
          const ctx = analyzeContext(lowerNote, start, end);
          rawMentions.push({
            rawTerm: canonical,
            quote: noteText.slice(start, end),
            start,
            end,
            ...ctx,
          });
        }
      }

      rawMentions.sort((a, b) => a.start - b.start);

      const mentions = rawMentions.slice(0, 500).map((m) => {
        const resolved = resolveTerm(eng, m.rawTerm);
        return {
          mention_id: crypto.randomUUID(),
          source_span: {
            start: m.start,
            end: m.end,
            offset_unit: "unicode_code_points",
            quote: m.quote,
          },
          raw_term: m.rawTerm,
          polarity: m.polarity,
          temporality: m.temporality,
          experiencer: m.experiencer,
          onset_age_group: m.onset_age_group,
          resolver_status: resolved.status,
          hpo_candidates: resolved.candidates,
        };
      });

      return jsonResponse({
        request_id: requestId,
        model: {
          runtime: "ollama",
          model_id: "mock-phenotype-ner-v1",
          model_version: "1.0.0",
          sha256: "0".repeat(64),
        },
        ontology_release: eng.manifest.ontology_release,
        mentions,
      });
    }

    if (req.method === "POST" && subPath === "/v1/matches") {
      const body = (await req.json()) as {
        observations?: {
          observation_id: string;
          hpo_id: string;
          polarity: string;
          temporality: string;
          experiencer: string;
          onset_age_group: string;
          review_status: string;
        }[];
        candidate_limit?: number;
      };
      const observations = Array.isArray(body.observations) ? body.observations : [];
      if (observations.length === 0) {
        return errorJson(requestId, "invalid_request", "At least one observation is required.", 422);
      }
      const candidateLimit = Math.min(50, Math.max(1, Number(body.candidate_limit ?? 20)));
      const eng = getEngine();

      const dataVersion = {
        ontology_release: eng.manifest.ontology_release,
        annotation_release: eng.manifest.annotation_release,
        manifest_sha256: eng.manifest.manifest_sha256,
      };

      const excluded: { observation_id: string; reason: string }[] = [];
      const qualifying: typeof observations = [];
      const seenHpo = new Set<string>();

      for (const obs of observations) {
        if (obs.polarity === "negated") {
          excluded.push({ observation_id: obs.observation_id, reason: "negated_not_scored_in_v1" });
        } else if (obs.polarity === "uncertain") {
          excluded.push({ observation_id: obs.observation_id, reason: "uncertain_not_scored_in_v1" });
        } else if (obs.experiencer === "family_member") {
          excluded.push({ observation_id: obs.observation_id, reason: "family_history_not_scored_in_v1" });
        } else if (obs.experiencer === "unknown") {
          excluded.push({ observation_id: obs.observation_id, reason: "unknown_experiencer_not_scored_in_v1" });
        } else if (obs.temporality === "historical") {
          excluded.push({ observation_id: obs.observation_id, reason: "historical_not_scored_in_v1" });
        } else if (!seenHpo.has(obs.hpo_id)) {
          seenHpo.add(obs.hpo_id);
          qualifying.push(obs);
        }
      }

      const qTerms: { obs: (typeof observations)[number]; idx: number; ic: number }[] = [];
      for (const obs of qualifying) {
        const idx = eng.hpoToIdx.get(obs.hpo_id);
        if (idx !== undefined && eng.icValues[idx] > 0) {
          qTerms.push({ obs, idx, ic: eng.icValues[idx] });
        }
      }

      if (qTerms.length === 0) {
        return jsonResponse({
          request_id: requestId,
          status: "no_candidates",
          ranking_method: "hpo_semantic_coverage_v1",
          data_version: dataVersion,
          candidates: [],
          excluded_observations: excluded,
          unmatched_observation_ids: qualifying.map((o) => o.observation_id),
          graph: { nodes: [], edges: [] },
          notice: "Research prototype. Ranked phenotype evidence is not a diagnosis or a probability.",
        });
      }

      const sumQIc = qTerms.reduce((acc, t) => acc + t.ic, 0);
      const candSet = new Set<number>();
      for (const qt of qTerms) {
        for (const ancIdx of getAncestors(eng, qt.idx).keys()) {
          if (eng.icValues[ancIdx] > 0) {
            const ds = eng.ancToDiseases.get(ancIdx);
            if (ds) {
              for (let k = 0; k < ds.length; k++) candSet.add(ds[k]);
            }
          }
        }
      }
      const candidateIndices =
        candSet.size > 0 ? Array.from(candSet) : Array.from({ length: eng.diseases.length }, (_, i) => i);

      const scored: {
        rankValue: number;
        diseaseIdx: number;
        diseaseId: string;
        diseaseLabel: string;
        matchedPairs: [(typeof observations)[number], number, DiseaseAnnotation, number][];
      }[] = [];
      const supportedObsIds = new Set<string>();

      for (let ci = 0; ci < candidateIndices.length; ci++) {
        const dIdx = candidateIndices[ci];
        const presentAnns = eng.diseasePresentAnn[dIdx];
        if (!presentAnns || presentAnns.length === 0) continue;

        const qBestSims = new Float64Array(qTerms.length);
        const qBestMatch: ([DiseaseAnnotation, number] | null)[] = new Array(qTerms.length).fill(null);
        const aIcs = new Float64Array(presentAnns.length);
        const aFws = new Float64Array(presentAnns.length);
        const aBestSims = new Float64Array(presentAnns.length);
        let sumAIc = 0;

        for (let ai = 0; ai < presentAnns.length; ai++) {
          const ic = eng.icValues[presentAnns[ai].termIdx];
          aIcs[ai] = ic;
          sumAIc += ic;
          aFws[ai] = frequencyWeight(presentAnns[ai].frequency);
        }

        for (let qi = 0; qi < qTerms.length; qi++) {
          const qIdx = qTerms[qi].idx;
          const qIc = qTerms[qi].ic;
          for (let ai = 0; ai < presentAnns.length; ai++) {
            const fw = aFws[ai];
            if (fw <= 0) continue;
            const ann = presentAnns[ai];
            const aIc = aIcs[ai];
            const [micaIdx, micaIc] = findMica(eng, qIdx, ann.termIdx);
            if (micaIdx !== null && qIc + aIc > 0) {
              const baseSim = (2 * micaIc) / (qIc + aIc);
              if (baseSim > aBestSims[ai]) aBestSims[ai] = baseSim;
              const weightedSim = baseSim * (0.85 + 0.15 * fw);
              if (weightedSim > qBestSims[qi]) {
                qBestSims[qi] = weightedSim;
                qBestMatch[qi] = [ann, micaIdx];
              }
            }
          }
        }

        const matchedPairs: [(typeof observations)[number], number, DiseaseAnnotation, number][] = [];
        let weightedQSum = 0;
        for (let qi = 0; qi < qTerms.length; qi++) {
          const m = qBestMatch[qi];
          if (qBestSims[qi] > 0 && m !== null) {
            matchedPairs.push([qTerms[qi].obs, qTerms[qi].idx, m[0], m[1]]);
            weightedQSum += qTerms[qi].ic * qBestSims[qi];
          }
        }
        if (matchedPairs.length === 0) continue;

        const qCov = sumQIc > 0 ? weightedQSum / sumQIc : 0;
        if (qCov <= 0) continue;

        let weightedASum = 0;
        for (let ai = 0; ai < presentAnns.length; ai++) {
          weightedASum += aIcs[ai] * aBestSims[ai];
        }
        const dCov = sumAIc > 0 ? weightedASum / sumAIc : 0;
        const rankValue = Math.min(1, 0.85 * qCov + 0.15 * dCov);

        for (const [obs] of matchedPairs) supportedObsIds.add(obs.observation_id);
        const disRow = eng.diseases[dIdx];
        scored.push({
          rankValue,
          diseaseIdx: dIdx,
          diseaseId: disRow[0],
          diseaseLabel: disRow[1],
          matchedPairs,
        });
      }

      scored.sort((a, b) => {
        if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
        return a.diseaseId < b.diseaseId ? -1 : a.diseaseId > b.diseaseId ? 1 : 0;
      });

      const top = scored.slice(0, candidateLimit);
      if (top.length === 0) {
        return jsonResponse({
          request_id: requestId,
          status: "no_candidates",
          ranking_method: "hpo_semantic_coverage_v1",
          data_version: dataVersion,
          candidates: [],
          excluded_observations: excluded,
          unmatched_observation_ids: qualifying.map((o) => o.observation_id),
          graph: { nodes: [], edges: [] },
          notice: "Research prototype. Ranked phenotype evidence is not a diagnosis or a probability.",
        });
      }

      const candidates = [];
      const graphNodes = [];
      const graphEdges = [];
      const seenPhenoNodes = new Set<string>();

      for (let rIdx = 0; rIdx < top.length; rIdx++) {
        const item = top[rIdx];
        const disRow = eng.diseases[item.diseaseIdx];
        const [diseaseId, diseaseLabel, sourceId, icd11Code, icd11Title, icd11Uri, orphaCode] = disRow;
        const rankNum = rIdx + 1;

        const supportingObservations = item.matchedPairs.map(([obs, qIdx, ann, micaIdx]) => {
          const qAnc = getAncestors(eng, qIdx);
          const aAnc = getAncestors(eng, ann.termIdx);
          let relation: "exact" | "annotation_ancestor" | "case_term_ancestor" | "shared_ancestor" = "shared_ancestor";
          if (obs.hpo_id === ann.hpoId) relation = "exact";
          else if (qAnc.has(ann.termIdx)) relation = "annotation_ancestor";
          else if (aAnc.has(qIdx)) relation = "case_term_ancestor";

          const paths = [traceAncestorPath(eng, qIdx, micaIdx)];
          if (ann.termIdx !== micaIdx) paths.push(traceAncestorPath(eng, ann.termIdx, micaIdx));

          return {
            observation_id: obs.observation_id,
            case_hpo_id: obs.hpo_id,
            annotation_hpo_id: ann.hpoId,
            relation,
            shared_ancestor_ids: [eng.terms[micaIdx][0]],
            ontology_paths: paths,
            annotation: {
              source: ann.sourceRelease,
              reference: ann.reference || "Curated",
              evidence_code: ann.evidenceCode,
              frequency: ann.frequency,
            },
          };
        });

        candidates.push({
          disease_id: diseaseId,
          disease_label: diseaseLabel,
          rank: rankNum,
          similarity_score: Number(item.rankValue.toFixed(4)),
          icd11_code: icd11Code,
          icd11_title: icd11Title,
          icd11_uri: icd11Uri,
          orpha_code: orphaCode,
          source_id: sourceId,
          supporting_observations: supportingObservations,
        });

        graphNodes.push({
          id: `disease:${diseaseId}`,
          type: "disease",
          label: diseaseLabel,
          disease_id: diseaseId,
          icd11_code: icd11Code,
          candidate_rank: rankNum,
        });

        for (const ev of supportingObservations) {
          if (!seenPhenoNodes.has(ev.case_hpo_id)) {
            seenPhenoNodes.add(ev.case_hpo_id);
            const termIdx = eng.hpoToIdx.get(ev.case_hpo_id);
            const termLabel = termIdx !== undefined ? eng.terms[termIdx][1] : ev.case_hpo_id;
            graphNodes.push({
              id: `hpo:${ev.case_hpo_id}`,
              type: "phenotype",
              label: termLabel,
              hpo_id: ev.case_hpo_id,
              disease_id: null,
              candidate_rank: null,
            });
          }
          graphEdges.push({
            id: `edge:${ev.observation_id}:${diseaseId}`,
            source: `hpo:${ev.case_hpo_id}`,
            target: `disease:${diseaseId}`,
            relation: "supports_candidate",
            observation_id: ev.observation_id,
            annotation_hpo_id: ev.annotation_hpo_id,
            annotation_reference: ev.annotation.reference,
          });
        }
      }

      return jsonResponse({
        request_id: requestId,
        status: "ranked",
        ranking_method: "hpo_semantic_coverage_v1",
        data_version: dataVersion,
        candidates,
        excluded_observations: excluded,
        unmatched_observation_ids: qualifying
          .filter((o) => !supportedObsIds.has(o.observation_id))
          .map((o) => o.observation_id),
        graph: { nodes: graphNodes, edges: graphEdges },
        notice: "Research prototype. Ranked phenotype evidence is not a diagnosis or a probability.",
      });
    }

    return errorJson(requestId, "invalid_request", `Unsupported endpoint: ${req.method} ${subPath}`, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal serverless error";
    console.error(`[v1.mts req=${requestId}]`, message);
    return errorJson(requestId, "internal_error", message, 500);
  }
};

export const config: Config = {
  path: "/v1/*",
};
