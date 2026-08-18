# Development Workflow

## Project structure

- `frontend/` — React and Vite user interface.
- `backend/` — Node.js API, retrieval pipeline, and integrations.
- `postman/` — API collection and local environment for manual verification.
- `docs/` — product and implementation documentation.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and supply the required server-side credentials.
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL`.
3. Install dependencies separately:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Start the API with `cd backend && npm run dev`.
5. Start the UI with `cd frontend && npm run dev`.

## Before committing

Run the relevant checks before opening a pull request:

```bash
cd backend && npm run check
cd frontend && npm run check
```

Do not commit `.env` files, `node_modules`, generated build output, logs, or local scrape data. The root `.gitignore` protects these paths; only `.env.example` files belong in source control.

## Git workflow

1. Branch from the current integration branch using a descriptive name, for example `feature/speech-input` or `fix/retrieval-status`.
2. Keep each commit focused and use an imperative subject, such as `feat: add activity-log tooltip`.
3. Push the branch and open a pull request with a short description, verification results, and any configuration changes.
4. Require review and passing checks before merging. Do not merge secrets or production credentials.

## API verification

Use the collection and local environment in `postman/` to verify health, readiness, scraping, ingestion, retrieval, transcription, and activity endpoints. Confirm the backend is running and MongoDB is reachable before testing dependent operations.
