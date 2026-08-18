import { describe, expect, it } from "vitest";
import { complianceRetrievalRequestSchema } from "./retrieval-contract.js";

describe("compliance retrieval request", () => {
  it("applies bounded defaults", () => {
    const parsed = complianceRetrievalRequestSchema.parse({
      requirement: "Delete a user's personal data",
      standards: ["GDPR"],
    });
    expect(parsed.topK).toBeGreaterThan(0);
    expect(parsed.similarityThreshold).toBeGreaterThanOrEqual(0);
  });

  it("rejects duplicate standards and unknown fields", () => {
    expect(complianceRetrievalRequestSchema.safeParse({
      requirement: "A requirement",
      standards: ["GDPR", "GDPR"],
    }).success).toBe(false);
    expect(complianceRetrievalRequestSchema.safeParse({
      requirement: "A requirement",
      standards: ["GDPR"],
      unsupported: true,
    }).success).toBe(false);
  });
});
