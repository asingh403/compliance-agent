import { describe, expect, it } from "vitest";
import { actionFor } from "./activity-audit.js";

describe("activity audit route mapping", () => {
  it("maps tracked operations and excludes activity reads", () => {
    expect(actionFor("GET", "/api/v1/health")).toBe("HEALTH_CHECK");
    expect(actionFor("POST", "/api/v1/compliance/retrieve")).toBe("COMPLIANCE_RETRIEVAL");
    expect(actionFor("POST", "/api/v1/speech/transcriptions")).toBe("VOICE_TRANSCRIPTION");
    expect(actionFor("GET", "/api/v1/activity")).toBeNull();
  });
});
