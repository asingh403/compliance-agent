import { z } from "zod";
import { env } from "../config/env.js";
import { legalStandardSchema } from "../domain/legal-clause.js";

export const complianceRetrievalRequestSchema = z.object({
  requirement: z.string().trim().min(1).max(env.REQUIREMENT_MAX_LENGTH),
  standards: z.array(legalStandardSchema).min(1).max(2).refine(
    (standards) => new Set(standards).size === standards.length,
    "standards must not contain duplicates",
  ),
  topK: z.number().int().min(1).max(env.VECTOR_TOP_K_MAX).default(env.TOP_K),
  similarityThreshold: z.number().min(0).max(1).default(env.VECTOR_SIMILARITY_THRESHOLD),
}).strict();

export type ComplianceRetrievalRequest = z.infer<typeof complianceRetrievalRequestSchema>;

export interface ComplianceEvidence {
  standard: z.infer<typeof legalStandardSchema>;
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
