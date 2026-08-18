export interface ApiMeta {
  requestId: string;
  [key: string]: unknown;
}

export interface ApiSuccessEnvelope<TData> {
  success: true;
  data: TData;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorBody;
}

export interface ApiResult<TData> {
  data: TData;
  requestId: string;
  status: number;
}

export interface HealthData {
  status: "ok";
  service: string;
  environment: string;
  timestamp: string;
}

export interface ReadinessData {
  status: "ready";
  dependencies: {
    mongodb: "available";
  };
  timestamp: string;
}

export interface SpeechTranscriptionData {
  transcript: string;
  languageCode: string;
  provider: "sarvam";
  model: string;
}

export type ActivityAction = "HEALTH_CHECK" | "READINESS_CHECK" | "GDPR_SCRAPE" | "GDPR_INGESTION"
  | "EU_AI_ACT_SCRAPE" | "EU_AI_ACT_INGESTION" | "COMPLIANCE_RETRIEVAL" | "VOICE_TRANSCRIPTION";
export type ActivityStatus = "SUCCESS" | "WARNING" | "FAILED";

export interface ActivityItem {
  id: string;
  timestamp: string;
  actor: { id: string; displayName: string };
  action: ActivityAction;
  status: ActivityStatus;
  requestId: string;
  durationMs: number;
  metadata: Record<string, string | number | boolean | string[] | null>;
}

export interface ActivityData {
  activities: ActivityItem[];
  summary: { total: number; success: number; warning: number; failed: number };
  pagination: { page: number; limit: number; total: number; pages: number };
  range: { from: string; to: string };
}

export interface LegalSourceScrapeData {
  standard: "GDPR" | "EU_AI_ACT";
  sourceUrl: string;
  scrapedAt: string;
  clauseCount: number;
  stagingArtifact: string;
}

export interface IngestionFailure {
  clauseId: string;
  code: string;
}

export interface LegalSourceIngestionData {
  standard: "GDPR" | "EU_AI_ACT";
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  failures: IngestionFailure[];
  embeddingModel: string;
}

export type LegalStandard = "GDPR" | "EU_AI_ACT";

export interface ComplianceRetrievalRequest {
  requirement: string;
  standards: LegalStandard[];
  topK: number;
  similarityThreshold: number;
}

export interface ComplianceEvidence {
  standard: LegalStandard;
  clauseId: string;
  title: string;
  excerpt: string;
  sourceUrl: string;
}

export interface ComplianceResult extends ComplianceEvidence {
  vectorScore: number;
  rerankingScore: number | null;
  finalScore: number;
  explanation: string;
  evidence: ComplianceEvidence[];
}

export interface ComplianceRetrievalData {
  results: ComplianceResult[];
  coverage: {
    score: number;
    type: "indicative-retrieval-coverage";
    disclaimer: string;
  };
  retrieval: {
    embeddingModel: string;
    rerankingModel: string | null;
    rerankingProvider: "groq" | "cohere" | null;
    rerankingApplied: boolean;
    resultSource: "reranked" | "vector-search";
    topK: number;
    similarityThreshold: number;
    fallback?: { applied: true; reason: string };
    rerankingFallback?: { applied: true; from: "groq"; to: "cohere"; reason: string };
  };
}
