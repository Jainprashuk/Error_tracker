# System Design

## Tech stack

**Collector (backend API)** — `collector/`
- FastAPI 0.135 + Starlette + Uvicorn (ASGI)
- MongoDB via Motor (async) + PyMongo — no ODM; schema is implicit, enforced only by Pydantic on inbound payloads
- PyJWT (HS256) for dashboard session tokens
- APScheduler (`AsyncIOScheduler`) for background jobs, run inside FastAPI's `lifespan`
- `google-genai` (Gemini) for AI insights
- `boto3` against Cloudflare R2 (S3-compatible) for screenshot storage
- `httpx` for outbound calls (Resend email API, OpenProject API)
- `cryptography` for AES-256-CBC encryption of integration secrets at rest
- `structlog` for structured logging
- Python 3.11.9 (`runtime.txt`)

**Dashboard (frontend)** — `bug-tracker/`
- React 19 + TypeScript 5.8, Vite 7
- Routing: `react-router-dom` 6 (client-side `BrowserRouter`, SPA)
- State: Zustand (single auth/org store) — `@tanstack/react-query` is installed but unused (dead dependency)
- Auth: Clerk (`@clerk/clerk-react`) for OAuth/identity, bridged to a custom Mongo-backed session
- HTTP: a mix of `axios` (lightly used formal client) and raw `fetch` (dominant pattern, used directly in most pages)
- Charts: `recharts`; Styling: Tailwind CSS; Icons: `lucide-react`; Dropdowns: Radix UI
- Client-side AES-256-CBC (`crypto-js`) to encrypt integration secrets before sending to the backend

**SDK** — `sdk/` (npm package `bug-tracker-sdk`)
- Vanilla JS, zero framework dependency, one runtime dependency (`html2canvas` for screenshots)
- Built with `tsup` to dual ESM/CJS output
- Two public exports: `initBugTracker(config)`, `captureError(error, metadata)`

**Playground** — `playground/` — React + Vite demo app that links the SDK locally (`file:../sdk`) and exercises every capture path with dedicated demo buttons; used as a manual SDK test harness, not shipped.

## Deployment

- Both `collector` and `bug-tracker` deploy to **Vercel**.
  - Collector: `vercel.json` routes all paths to a serverless entrypoint; runs as Python 3.11.
  - Dashboard: `vercel.json` is a single SPA rewrite (`/(.*) → /index.html`).
- A `Procfile` exists in `collector/` but appears vestigial (likely left over from an earlier Heroku-style deployment plan).
- CORS allowed origins (collector): `http://localhost:3000`, `http://localhost:5173`, `https://bugtrace.jainprashuk.in` (configurable via `ALLOWED_ORIGINS` env var).
- Production API base: `https://bugtracker.jainprashuk.in`; production dashboard: `https://bugtrace.jainprashuk.in`.

## Request flow: error ingestion

1. SDK auto-captures an error (global `window.onerror`, fetch/axios interceptor failure, manual `captureError()`, or the manual bug-report widget) or a performance sample.
2. SDK batches events client-side (flush at 10 events or every 5s) and POSTs to `{collectorUrl}/report` (errors) or `/report/performance` (perf), authenticated with `x-api-key` (the project's API key — no JWT involved).
3. `SecurityGuard` middleware in `main.py` enforces a 500KB body cap and a 100 req/min per-API-key rate limit (in-memory, not distributed — resets per instance/cold start).
4. Each error item is processed as a FastAPI background task (`ParseError` in `ticket_service.py`):
   - Optional screenshot upload to Cloudflare R2.
   - Stack trace parsing → `{file, line, column}`.
   - **Fingerprint** computed (SHA-256 over normalized event type + endpoint + message + top stack frames + project id) — this is the dedup/grouping key.
   - Raw event always inserted into `events` (30-day TTL); the `errors` group document is upserted (increment `occurrences`, update `last_seen`, or create new on first sighting).
   - Alert rule evaluated (`alert_service.should_send_alert`); if triggered, an email is sent via Resend and logged to `alert_logs`/`email_logs`.
5. Dashboard queries (`GET /projects/{id}/errors`, `GET /errors/{fingerprint}`) read from the grouped `errors` collection, with the latest raw `events` payload attached for detail views.

## Background jobs

Single APScheduler job, `check_pending_integrations`, runs every 15 minutes (`scheduler_service.py`), driving a two-stage lifecycle email nurture sequence per project:

1. **2-hour reminder** — projects 2–72h old, not yet integrated (no SDK traffic received) → "Action Required: Integrate the BugTrace SDK" email to the project owner.
2. **72-hour "Hail Mary"** — projects >72h old, still not integrated → final nudge email.

Both stages are guarded by one-shot flags (`integration_reminder_sent`, `hail_mary_sent`) on the project document so they never re-fire. Owner lookup uses a legacy single-owner `project.user_id` field, which doesn't account for multi-membership — see [08-known-issues.md](./08-known-issues.md).

There is **no scheduled job** draining the `pending_alerts` retry queue (failed alert emails accumulate there but are never replayed automatically).

## Third-party integrations

| Service | Purpose | Notes |
|---|---|---|
| Clerk | Dashboard identity/OAuth provider | Backend trusts whatever `/auth/clerk-sync` is posted with — no server-side Clerk signature/webhook verification |
| Resend | Transactional email (alerts + lifecycle emails) | All sends logged to `email_logs` |
| Google Gemini (`google-genai`) | AI root-cause analysis, project/org summaries, performance insights | Model configurable via `GEMINI_MODEL`; usage logged to `ai_usage_logs` for audit (no enforcement/credit limiting implemented) |
| Cloudflare R2 (boto3/S3 API) | Screenshot storage | Bucket `bugtracker-screenshots`, public via `R2_PUBLIC_URL` |
| OpenProject | Optional per-project issue tracker integration — one-click ticket creation from an error | API key encrypted at rest (AES-256-CBC); also encrypted client-side before transit |

No billing/payments (Stripe etc.) and no chat-ops integrations (Slack/Discord) exist anywhere in the codebase — alerting is email-only.

## Security model summary

- Two credential types: dashboard JWT (`Authorization: Bearer`, HS256, expires after `ACCESS_TOKEN_EXPIRE_HOURS`, default 24h, no refresh-token flow — re-auth via Clerk on expiry) and per-project `x-api-key` for SDK ingestion (plaintext-stored, not hashed).
- Org/project-scoped authorization is enforced server-side via `verify_org_membership` (see [03-permissions-and-orgs.md](./03-permissions-and-orgs.md)); the SuperAdmin console is gated by a hardcoded email allowlist, not the RBAC system.
- Request body size capped at 500KB; ingestion rate-limited 100/min per API key (process-local).
