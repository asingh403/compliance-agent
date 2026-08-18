# Compliance Coverage Agent Backend

## Environment setup

The backend loads configuration in this order without overriding variables already present in the process:

1. `backend/.env`
2. repository-root `.env` (compatibility with the existing project setup)
3. deployment environment variables

Copy `.env.example` to `backend/.env` for an isolated backend setup, then replace placeholder credentials. The existing root `.env` can continue to be used; never commit either secret-bearing file.

The application validates all required settings at startup. `MONGODB_VECTOR_DIMENSIONS` must remain `1024` while `mistral-embed` vectors use that dimension. Changing the embedding model or dimension requires complete re-embedding and vector-index recreation.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

The initial endpoint is `GET http://localhost:5001/api/v1/health`.

## API v1

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Process liveness |
| `GET` | `/api/v1/health/ready` | MongoDB readiness |
| `POST` | `/api/v1/legal-sources/gdpr/scrapes` | Manually scrape GDPR |
| `POST` | `/api/v1/legal-sources/eu-ai-act/scrapes` | Manually scrape EU AI Act |
| `POST` | `/api/v1/legal-sources/gdpr/ingestions` | Manually ingest staged GDPR clauses |
| `POST` | `/api/v1/legal-sources/eu-ai-act/ingestions` | Manually ingest staged EU AI Act clauses |
| `POST` | `/api/v1/compliance/retrieve` | Retrieve and rerank compliance evidence |
| `POST` | `/api/v1/speech/transcriptions` | Transcribe a raw browser audio recording with Sarvam |
| `GET` | `/api/v1/activity` | Query persistent audit activity (defaults to the last 7 days) |

All responses use the architecture's success/error envelopes and carry an `x-request-id` header. Reranking uses Groq first, then Cohere when `CO_API_KEY` is configured. If both rerankers fail after a successful vector search, the API returns vector-only results. Each path includes explicit provider or fallback metadata. Mistral failure is fatal because no compatible query vector can be produced.

## Important environment groups

- Runtime/security: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `CORS_ALLOWED_ORIGINS`, request limits, proxy hops, and rate limits.
- MongoDB: URI, database, two collections, two Atlas vector index names, connection timeout, and 1024 vector dimensions.
- Activity audit: MongoDB collection and retention period. Until authentication is added, records use the non-assertive `Local user` identity.
- Sources: the two official EUR-Lex URLs, allowed hostnames, scrape timeout, and staging directory.
- Mistral: API key, embedding model, and ingestion batch size.
- Groq: API key, reranking model, timeout, candidate count, score threshold, and maximum clause length.
- Cohere fallback: `CO_API_KEY`, `CO_RERANK_MODEL`, and `CO_RERANK_TIMEOUT_MS`.
- Sarvam speech-to-text: server-only API key, model, language, timeout, and maximum audio size. The synchronous endpoint is limited to 30-second recordings.
- Retrieval: Top-K default/maximum, vector candidate count, similarity threshold, and coverage target.

Use `.env.example` as the complete variable contract. The application fails fast with variable names—but never values—when required configuration is invalid.

## Verification

```bash
npm run check
```

Import the collection and local environment from the repository `postman/` directory for manual API verification. See `DEPLOYMENT.md` for the production checklist.
