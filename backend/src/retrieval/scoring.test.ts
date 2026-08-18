import { describe, expect, it } from "vitest";
import { calculateCoverage, calculateFinalScore, clampScore } from "./scoring.js";

describe("retrieval scoring", () => {
  it("clamps scores and calculates bounded coverage", () => {
    expect(clampScore(1.2)).toBe(1);
    expect(clampScore(-0.2)).toBe(0);
    expect(calculateCoverage([0.9, 0.8, 0.7], 3)).toBe(80);
    expect(calculateCoverage([1, 1, 1, 1], 3)).toBe(100);
  });

  it("uses the documented 35/65 final-score weighting", () => {
    expect(calculateFinalScore(0.8, 0.9)).toBeCloseTo(0.865);
  });
});
