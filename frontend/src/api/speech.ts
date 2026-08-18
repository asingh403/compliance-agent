import { apiRequest } from "./client";
import { ApiClientError } from "./errors";
import type { SpeechTranscriptionData } from "./types";

const isSpeechTranscription = (value: unknown): value is SpeechTranscriptionData => {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return typeof data.transcript === "string"
    && data.transcript.trim().length > 0
    && typeof data.languageCode === "string"
    && data.provider === "sarvam"
    && typeof data.model === "string";
};

export const transcribeSpeech = async (audio: Blob, signal?: AbortSignal) => {
  const result = await apiRequest<unknown, Blob>("/speech/transcriptions", {
    method: "POST",
    body: audio,
    ...(signal ? { signal } : {}),
  });
  if (!isSpeechTranscription(result.data)) {
    throw new ApiClientError({
      code: "INVALID_RESPONSE",
      message: "The transcription response did not match the expected contract",
      status: result.status,
      requestId: result.requestId,
    });
  }
  return { ...result, data: result.data };
};
