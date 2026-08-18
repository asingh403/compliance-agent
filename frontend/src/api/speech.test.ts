import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeSpeech } from "./speech";

afterEach(() => vi.unstubAllGlobals());

describe("speech transcription API", () => {
  it("posts the audio blob without exposing provider credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        transcript: "Users can request erasure.",
        languageCode: "en-IN",
        provider: "sarvam",
        model: "saaras:v3",
      },
      meta: { requestId: "speech-request" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const audio = new Blob(["recorded-audio"], { type: "audio/webm" });

    await expect(transcribeSpeech(audio)).resolves.toMatchObject({
      requestId: "speech-request",
      data: { transcript: "Users can request erasure." },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:5001/api/v1/speech/transcriptions",
      expect.objectContaining({
        method: "POST",
        body: audio,
        headers: expect.any(Headers),
      }),
    );
    const headers = fetcher.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("audio/webm");
    expect(headers.has("api-subscription-key")).toBe(false);
  });
});
