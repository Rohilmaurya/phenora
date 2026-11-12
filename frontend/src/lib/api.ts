import type {
  DocumentExtractResponse,
  ExtractionResponse,
  HealthResponse,
  MatchResponse,
  ReviewedObservation,
  TermSearchResponse,
} from "../types/api";

export const DEFAULT_DEV_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1jbGluaWNpYW4iLCJyb2xlIjoiY2xpbmljaWFuIiwiaXNzIjoicGhlbm9yYS1sb2NhbC1pZHAiLCJhdWQiOiJwaGVub3JhLWJhY2tlbmQiLCJpYXQiOjE3OTQyMjQxODEsImV4cCI6MTc5NjgxNjE4MX0.pqZ4RoDVuxopFf2YhpApPY_Uy-6BIFI7qPFOkcQeJIc";

let activeToken = DEFAULT_DEV_TOKEN;

export function setAuthToken(token: string) {
  activeToken = token;
}

export function getAuthToken(): string {
  return activeToken;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${activeToken}`,
  };
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/v1/health", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Health check failed (${res.status})`);
  }
  return res.json();
}

export async function extractDocumentText(file: File): Promise<DocumentExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/v1/documents/extract-text", {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Document parsing failed (${res.status})`);
  }
  return res.json();
}

export async function extractPhenotypes(noteText: string): Promise<ExtractionResponse> {
  const res = await fetch("/v1/extractions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ note_text: noteText }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Extraction failed (${res.status})`);
  }
  return res.json();
}

export async function searchHpoTerms(query: string, limit: number = 10): Promise<TermSearchResponse> {
  const res = await fetch("/v1/terms/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ query, limit }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HPO search failed (${res.status})`);
  }
  return res.json();
}

export async function rankMatches(
  observations: ReviewedObservation[],
  candidateLimit: number = 10
): Promise<MatchResponse> {
  const res = await fetch("/v1/matches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ observations, candidate_limit: candidateLimit }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Matching failed (${res.status})`);
  }
  return res.json();
}
