import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const candidateEnvFiles = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../.env"),
];

for (const path of candidateEnvFiles) {
  if (existsSync(path)) {
    dotenv.config({ path, override: false, quiet: true });
  }
}

const integerFromEnv = (minimum: number, maximum?: number) => {
  let schema = z.coerce.number().int().min(minimum);
  if (maximum !== undefined) {
    schema = schema.max(maximum);
  }
  return schema;
};

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: integerFromEnv(1, 65_535).default(5001),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    CORS_ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:5173"),
    REQUEST_BODY_LIMIT: z.string().min(1).default("100kb"),
    REQUIREMENT_MAX_LENGTH: integerFromEnv(1).default(10_000),
    TRUST_PROXY_HOPS: integerFromEnv(0, 10).default(0),
    API_RATE_LIMIT_WINDOW_MS: integerFromEnv(1_000).default(60_000),
    API_RATE_LIMIT_MAX: integerFromEnv(1).default(100),
    AI_RATE_LIMIT_MAX: integerFromEnv(1).default(20),
    REQUEST_TIMEOUT_MS: integerFromEnv(1_000).default(60_000),
    MONGODB_URI: z.string().min(1),
    MONGODB_DB_NAME: z.string().min(1),
    MONGODB_COLLECTION_GDPR: z.string().min(1),
    MONGODB_COLLECTION_EU_AI: z.string().min(1),
    MONGODB_COLLECTION_ACTIVITY: z.string().min(1).default("activity_logs"),
    ACTIVITY_RETENTION_DAYS: integerFromEnv(7).default(90),
    MONGODB_VECTOR_INDEX_GDPR: z.string().min(1),
    MONGODB_VECTOR_INDEX_EU_AI: z.string().min(1),
    MONGODB_VECTOR_DIMENSIONS: z.coerce.number().int().refine((value) => value === 1024, {
      message: "must be 1024 for the configured embedding space",
    }),
    MISTRAL_API_KEY: z.string().min(1),
    MISTRAL_EMBED_MODEL: z.string().min(1).default("mistral-embed"),
    GROQ_API_KEY: z.string().min(1),
    GROQ_MODEL: z.string().min(1),
    CO_API_KEY: z.string().min(1).optional(),
    CO_RERANK_MODEL: z.string().min(1).default("rerank-v4.0-fast"),
    CO_RERANK_TIMEOUT_MS: integerFromEnv(1_000).default(15_000),
    SARVAM_API_KEY: z.string().min(1).optional(),
    SARVAM_TIMEOUT_MS: integerFromEnv(1_000).default(30_000),
    SARVAM_MODEL: z.string().min(1).default("saaras:v3"),
    SARVAM_LANGUAGE_CODE: z.string().min(1).default("en-IN"),
    SARVAM_AUDIO_MAX_BYTES: integerFromEnv(1_024).default(10_485_760),
    TOP_K: integerFromEnv(1).default(20),
    VECTOR_TOP_K_MAX: integerFromEnv(1).default(50),
    VECTOR_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
    VECTOR_NUM_CANDIDATES: integerFromEnv(1).default(200),
    RERANK_CANDIDATE_COUNT: integerFromEnv(1).default(10),
    RERANK_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
    GROQ_TIMEOUT_MS: integerFromEnv(1_000).default(20_000),
    RERANK_MAX_CLAUSE_LENGTH: integerFromEnv(500).default(6_000),
    COVERAGE_TARGET: z.coerce.number().positive().default(3),
    INGEST_BATCH_SIZE: integerFromEnv(1).default(20),
    MONGODB_CONNECT_TIMEOUT_MS: integerFromEnv(100).default(10_000),
    GDPR_SOURCE_URL: z.string().url().default("https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng"),
    EU_AI_ACT_SOURCE_URL: z.string().url().default("https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng"),
    LEGAL_SOURCE_ALLOWED_HOSTS: z.string().min(1).default("eur-lex.europa.eu"),
    SCRAPE_TIMEOUT_MS: integerFromEnv(1_000).default(30_000),
    SCRAPE_DATA_DIR: z.string().min(1).default("./data"),
  })
  .superRefine((value, context) => {
    if (value.TOP_K > value.VECTOR_TOP_K_MAX) {
      context.addIssue({
        code: "custom",
        path: ["TOP_K"],
        message: "must be less than or equal to VECTOR_TOP_K_MAX",
      });
    }
    if (value.RERANK_CANDIDATE_COUNT > value.VECTOR_TOP_K_MAX) {
      context.addIssue({
        code: "custom",
        path: ["RERANK_CANDIDATE_COUNT"],
        message: "must be less than or equal to VECTOR_TOP_K_MAX",
      });
    }
    if (value.VECTOR_NUM_CANDIDATES < value.VECTOR_TOP_K_MAX) {
      context.addIssue({
        code: "custom",
        path: ["VECTOR_NUM_CANDIDATES"],
        message: "must be greater than or equal to VECTOR_TOP_K_MAX",
      });
    }
    const allowedHosts = value.LEGAL_SOURCE_ALLOWED_HOSTS.split(",").map((host) => host.trim());
    for (const key of ["GDPR_SOURCE_URL", "EU_AI_ACT_SOURCE_URL"] as const) {
      const url = new URL(value[key]);
      if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "must use HTTPS and an allowed legal-source host",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid backend configuration: ${details}`);
}

const values = parsed.data;

export const env = Object.freeze({
  ...values,
  corsAllowedOrigins: values.CORS_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  legalSourceAllowedHosts: values.LEGAL_SOURCE_ALLOWED_HOSTS.split(",")
    .map((host) => host.trim())
    .filter(Boolean),
});

export type Environment = typeof env;
