import { z } from "zod";

export const legalStandardSchema = z.enum(["GDPR", "EU_AI_ACT"]);
export type LegalStandard = z.infer<typeof legalStandardSchema>;

export const normalizedClauseSchema = z.object({
  standard: legalStandardSchema,
  clauseId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(500),
  text: z.string().trim().min(1),
  sourceUrl: z.string().url(),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceRetrievedAt: z.date(),
});

export type NormalizedClause = z.infer<typeof normalizedClauseSchema>;

export interface LegalClauseDocument extends NormalizedClause {
  version: number;
  isActive: boolean;
  embedding: number[];
  embeddingModel: string;
  metadata: {
    standard: LegalStandard;
    clauseId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RetrievalCandidate {
  standard: LegalStandard;
  clauseId: string;
  title: string;
  text: string;
  sourceUrl: string;
  version: number;
  vectorScore: number;
}

export const collectionKeyByStandard: Record<LegalStandard, "GDPR" | "EU_AI"> = {
  GDPR: "GDPR",
  EU_AI_ACT: "EU_AI",
};
