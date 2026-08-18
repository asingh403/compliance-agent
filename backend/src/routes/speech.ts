import express, { Router } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { aiOperationRateLimiter } from "../middleware/security.js";
import { transcriptionService } from "../speech/transcription-service.js";

const supportedAudioTypes = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

export const speechRouter = Router();

speechRouter.post(
  "/transcriptions",
  aiOperationRateLimiter,
  express.raw({ type: () => true, limit: env.SARVAM_AUDIO_MAX_BYTES }),
  async (request, response) => {
    const mimeType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    if (!supportedAudioTypes.has(mimeType)) {
      throw new AppError(415, "UNSUPPORTED_AUDIO_TYPE", "The recorded audio format is not supported");
    }
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw new AppError(422, "EMPTY_SPEECH", "No recorded audio was received");
    }
    const data = await transcriptionService.transcribe(request.body, mimeType);
    response.locals.activityMetadata = {
      provider: data.provider,
      model: data.model,
      languageCode: data.languageCode,
    };
    response.json({ success: true, data, meta: { requestId: request.requestId } });
  },
);
