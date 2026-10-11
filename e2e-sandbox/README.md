# Sandbox end-to-end tests

`npm run e2e:sandbox` (from the repo root) starts three local processes and
runs the Playwright specs in `tests/`:

| Process | What it is |
|---|---|
| backend (`server/serve.mjs`) | The real backend code. `backend/src/lib/supabase.js` is swapped for an in-memory database seeded from `server/seed.mjs` (Node loader hook in `server/register.mjs`). Runs from `server/` with a minimal environment, so no `.env` file or production credential is loaded; it refuses to start with production-like settings. |
| frontend | The real Next.js app (`next dev`) pointed at the sandbox backend. |
| model stub (`server/stub-openai.mjs`) | An OpenAI-compatible stub standing in for the external model only. It deliberately cites a record from another workspace, so the tests prove Narriv drops it. A question containing `FAIL_PROVIDER` returns HTTP 503. |

What this proves: Narriv's own logic end to end (RBAC, workspace isolation,
evidence, citations, keyword and action persistence, empty and error states)
in a real browser. What it does not prove: production data, the real AI model,
Supabase schema details (the in-memory DB resolves relations by naming
convention), or Vercel scheduling. Those are verified separately against
production.

Ports: 3101 (frontend), 4100 (backend), 4199 (stub). Override with
`SANDBOX_FRONTEND_PORT`, `SANDBOX_BACKEND_PORT`, `SANDBOX_STUB_PORT`.
