# Backend Deployment Checklist

## Configuration

- Inject all values documented in `.env.example` through the deployment secret/configuration system.
- Never ship a secret-bearing `.env` file in an image or frontend bundle.
- Set `NODE_ENV=production`, explicit `CORS_ALLOWED_ORIGINS`, and the correct `TRUST_PROXY_HOPS` for the platform.
- Use distinct MongoDB databases, credentials, and provider keys for development, test, and production.
- Keep `MONGODB_VECTOR_DIMENSIONS=1024` for the configured `mistral-embed` corpus.

## MongoDB Atlas

- Allow network access only from the backend deployment environment.
- Grant the application only the collection and search-index privileges it needs.
- Confirm both vector search indexes become queryable before ingestion/retrieval traffic.
- Re-embed all active clauses and rebuild indexes before changing the embedding model or dimension.

## Runtime

- Terminate TLS at the platform boundary and forward only trusted proxy headers.
- Configure liveness at `/api/v1/health` and readiness at `/api/v1/health/ready`.
- Collect JSON logs and retain them according to the approved audit policy.
- Alert on `5xx`, dependency errors, repeated fallbacks, latency, and rate-limit saturation.
- Run `npm ci`, `npm run check`, and `npm start` from the `backend` directory.

## Release verification

- Scrape both configured official sources and review article counts.
- Ingest twice to confirm the second run reports unchanged clauses rather than duplicates.
- Test one GDPR and one EU AI Act retrieval, including canonical links and excerpts.
- Simulate Groq failure and verify vector-only results state `rerankingApplied: false`.
- Confirm responses and logs contain no credentials, internal prompts, or full sensitive requirements.
