# Compliance Hub Frontend

React, TypeScript, and Vite frontend for the internal GDPR and EU AI Act compliance workflow.

## Environment

Create `frontend/.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5001/api/v1
```

Only the public backend base URL belongs in the frontend environment. MongoDB, Mistral, Groq, and other credentials must remain in the backend environment.

Development and tests may use the localhost default. Production builds require an explicit `VITE_API_BASE_URL`.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
```

The centralized API layer is under `src/api`. UI components must use those typed functions rather than calling `fetch` directly.
