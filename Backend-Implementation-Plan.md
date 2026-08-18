# Backend Implementation Plan

## Phase 1 — API Foundation

- Create the Node.js, Express, and TypeScript backend.
- Validate configuration at startup and support `backend/.env` with a root `.env` fallback.
- Add `/api/v1`, request IDs, structured logs, CORS, body limits, success/error envelopes, and health endpoints.
- Establish unit/API test tooling and CI-ready scripts.

Exit criteria: clean type-check/build/tests and a runnable `GET /api/v1/health` endpoint.

## Phase 2 — Domain and Persistence

- Implement legal-clause domain types and MongoDB connection lifecycle.
- Add GDPR/EU AI Act repositories, compound indexes, and Atlas vector-index compatibility checks.
- Implement active-version queries and idempotent versioned writes using `standard + clauseId + version`.

Exit criteria: repository integration tests cover create, unchanged, changed, inactive, and current-version behavior.

## Phase 3 — Manual Scraping

- Implement configured official-source registry and outbound URL allowlist.
- Add GDPR and EU AI Act scraper/normalizer adapters.
- Persist validated normalized staging artifacts and expose manual scrape endpoints.

Exit criteria: fixture-based normalizer tests and traceable scrape summaries for both standards.

## Phase 4 — Manual Ingestion and Embeddings

- Add the Mistral embedding adapter and 1024-dimension compatibility checks.
- Batch embeddings and implement content-hash-based versioned ingestion.
- Expose manual ingestion endpoints with partial-failure reporting.

Exit criteria: repeated ingestion creates no duplicates; changed clauses produce one new active version.

## Phase 5 — Vector Retrieval API

- Validate the unified compliance request contract.
- Embed requirements and execute filtered Atlas vector search.
- Apply bounded Top-K overrides and similarity thresholds.
- Return source-traceable vector-only results and explicit failure envelopes.

Exit criteria: `/api/v1/compliance/retrieve` passes API and MongoDB integration tests without Groq.

## Phase 6 — Groq Reranking and Scoring

- Implement the isolated Groq reranking adapter with prompt-injection boundaries.
- Validate structured LLM output and reject unknown/duplicate clause IDs.
- Apply the documented final-score and coverage-score formulae.
- Fall back to vector ranking with explicit provenance when reranking fails.

Exit criteria: valid, malformed, timeout, and provider-failure scenarios are covered by tests.

## Phase 7 — Hardening and Delivery

- Complete redaction, rate limits, timeouts, readiness checks, and observability.
- Add Postman collection/environments and deployment documentation.
- Run unit, integration, API, configuration, and failure-path test suites.

Exit criteria: production checklist passes with no secrets in source, responses, or logs.