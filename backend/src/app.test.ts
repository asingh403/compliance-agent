import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("API foundation", () => {
  it("returns the standard success envelope and request ID", async () => {
    const response = await request(createApp())
      .get("/api/v1/health")
      .set("x-request-id", "test-request-id")
      .expect(200);

    expect(response.headers["x-request-id"]).toBe("test-request-id");
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok", service: "compliance-coverage-agent-backend" },
      meta: { requestId: "test-request-id" },
    });
  });

  it("returns the standard error envelope for unknown routes", async () => {
    const response = await request(createApp()).get("/api/v1/missing").expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: { code: "ROUTE_NOT_FOUND" },
    });
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });

  it("returns a normalized error for malformed JSON", async () => {
    const response = await request(createApp())
      .post("/api/v1/compliance/retrieve")
      .set("content-type", "application/json")
      .send('{"requirement":')
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: { code: "INVALID_JSON" },
    });
  });

  it("sets security headers", async () => {
    const response = await request(createApp()).get("/api/v1/health").expect(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
