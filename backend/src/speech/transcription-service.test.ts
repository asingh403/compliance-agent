import { describe, expect, it, vi } from "vitest";
import { AppError } from "../lib/app-error.js";
import { SarvamTranscriptionService } from "./transcription-service.js";

describe("SarvamTranscriptionService", () => {
  it("sends audio and returns a normalized transcript", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      transcript: "Users can request deletion of their data.",
      language_code: "en-IN",
      request_id: "sarvam-request",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const service = new SarvamTranscriptionService("test-key", fetcher as typeof fetch);

    const result = await service.transcribe(new Uint8Array([1, 2, 3]), "audio/webm");

    expect(result).toEqual({
      transcript: "Users can request deletion of their data.",
      languageCode: "en-IN",
      provider: "sarvam",
      model: "saaras:v3",
    });
    expect(fetcher).toHaveBeenCalledWith("https://api.sarvam.ai/speech-to-text", expect.objectContaining({
      method: "POST",
      headers: { "api-subscription-key": "test-key" },
      body: expect.any(FormData),
    }));
  });

  it("fails safely when the server-side API key is not configured", async () => {
    const service = new SarvamTranscriptionService("", vi.fn() as typeof fetch);
    await expect(service.transcribe(new Uint8Array([1]), "audio/webm")).rejects.toMatchObject({
      code: "TRANSCRIPTION_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("reports successful responses containing no speech", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transcript: "   " }), { status: 200 }));
    const service = new SarvamTranscriptionService("test-key", fetcher as typeof fetch);
    await expect(service.transcribe(new Uint8Array([1]), "audio/webm")).rejects.toMatchObject({
      code: "EMPTY_SPEECH",
      statusCode: 422,
    } satisfies Partial<AppError>);
  });

  it("normalizes provider empty-audio rejections", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Unreadable audio", { status: 422 }));
    const service = new SarvamTranscriptionService("test-key", fetcher as typeof fetch);
    await expect(service.transcribe(new Uint8Array([1]), "audio/webm")).rejects.toMatchObject({
      code: "EMPTY_SPEECH",
      statusCode: 422,
    });
  });
});
