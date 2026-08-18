import { env } from "../config/env.js";
import type { LegalStandard } from "../domain/legal-clause.js";

export interface LegalSourceDefinition {
  standard: LegalStandard;
  sourceUrl: string;
  expectedMinimumClauses: number;
}

export const legalSourceRegistry: Record<LegalStandard, LegalSourceDefinition> = {
  GDPR: {
    standard: "GDPR",
    sourceUrl: env.GDPR_SOURCE_URL,
    expectedMinimumClauses: 90,
  },
  EU_AI_ACT: {
    standard: "EU_AI_ACT",
    sourceUrl: env.EU_AI_ACT_SOURCE_URL,
    expectedMinimumClauses: 100,
  },
};
