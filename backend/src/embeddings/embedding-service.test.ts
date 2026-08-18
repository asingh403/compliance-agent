import { describe, expect, it } from "vitest";
import { AppError } from "../lib/app-error.js";
import { assertCompatibleEmbedding } from "./embedding-service.js";

describe("embedding compatibility", () => {
  it("accepts a finite 1024-dimensional vector", () => {
    expect(() => assertCompatibleEmbedding(Array.from({ length: 1024 }, () => 0.1))).not.toThrow();
  });

  it("rejects an incompatible vector", () => {
    expect(() => assertCompatibleEmbedding([0.1, 0.2])).toThrow(AppError);
  });
});
