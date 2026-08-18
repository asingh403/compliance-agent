import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";

const sarvamResponseSchema = z.object({
  transcript: z.string(),
  language_code: z.string().optional(),
  request_id: z.string().optional(),
}).passthrough();

export interface TranscriptionResult {
  transcript: string;
  languageCode: string;
  provider: "sarvam";
  model: string;
}

type Fetcher = typeof globalThis.fetch;

const extensionFor = (mimeType: string) => {
  const extensions: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
  };
  return extensions[mimeType] ?? "audio";
};

export class SarvamTranscriptionService {
  constructor(
    private readonly apiKey = env.SARVAM_API_KEY,
    private readonly fetcher: Fetcher = globalThis.fetch,
  ) {}

  async transcribe(audio: Uint8Array, mimeType: string): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new AppError(503, "TRANSCRIPTION_UNAVAILABLE", "Speech transcription is not configured");
    }
    if (audio.byteLength === 0) {
      throw new AppError(422, "EMPTY_SPEECH", "No recorded audio was received");
    }

    const form = new FormData();
    const audioCopy = new Uint8Array(audio.byteLength);
    audioCopy.set(audio);
    form.append("file", new Blob([audioCopy], { type: mimeType }), `recording.${extensionFor(mimeType)}`);
    form.append("model", env.SARVAM_MODEL);
    form.append("mode", "transcribe");
    form.append("language_code", env.SARVAM_LANGUAGE_CODE);
    form.append("with_timestamps", "false");

    try {
      const response = await this.fetcher("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: { "api-subscription-key": this.apiKey },
        body: form,
        signal: AbortSignal.timeout(env.SARVAM_TIMEOUT_MS),
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          throw new AppError(422, "EMPTY_SPEECH", "No speech was detected or the recording contained no readable audio");
        }
        throw new AppError(
          response.status === 429 ? 429 : 502,
          response.status === 429 ? "TRANSCRIPTION_RATE_LIMITED" : "TRANSCRIPTION_FAILED",
          response.status === 429
            ? "Speech transcription rate limit was reached"
            : "Speech transcription provider rejected the recording",
        );
      }
      const parsed = sarvamResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new AppError(502, "TRANSCRIPTION_RESPONSE_INVALID", "Speech transcription returned an invalid response");
      }
      const transcript = parsed.data.transcript.trim();
      if (!transcript) {
        throw new AppError(422, "EMPTY_SPEECH", "No speech was detected in the recording");
      }
      return {
        transcript,
        languageCode: parsed.data.language_code ?? env.SARVAM_LANGUAGE_CODE,
        provider: "sarvam",
        model: env.SARVAM_MODEL,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new AppError(504, "TRANSCRIPTION_TIMEOUT", "Speech transcription timed out");
      }
      throw new AppError(502, "TRANSCRIPTION_FAILED", "Speech transcription could not be completed");
    }
  }
}

export const transcriptionService = new SarvamTranscriptionService();
