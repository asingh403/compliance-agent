import { apiRequest } from "./client";
import type { HealthData, ReadinessData } from "./types";

export const getHealth = (signal?: AbortSignal) =>
  apiRequest<HealthData>("/health", { ...(signal ? { signal } : {}) });

export const getReadiness = (signal?: AbortSignal) =>
  apiRequest<ReadinessData>("/health/ready", { ...(signal ? { signal } : {}) });
