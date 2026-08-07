# BugTrace — Comprehensive Technical Documentation

> **BugTrace** is a self-hosted, multi-tenant **error tracking & monitoring SaaS** — a lightweight Sentry-style alternative — built as a monorepo with a Python/FastAPI backend, a React dashboard, and a zero-dependency JavaScript SDK that customers embed in their own web apps.
>
> *Document generated 2026-07-23 from a full read of the source tree (including uncommitted working-tree changes).*

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [System Architecture & Data Flow](#2-system-architecture--data-flow)
3. [Technology Stack](#3-technology-stack)
4. [The Collector (Backend API)](#4-the-collector-backend-api)
5. [The SDK (`bug-tracker-sdk`)](#5-the-sdk-bug-tracker-sdk)
6. [The Dashboard (Frontend)](#6-the-dashboard-frontend)
7. [Identity, Multi-Tenancy & RBAC](#7-identity-multi-tenancy--rbac)
8. [Data Model (MongoDB)](#8-data-model-mongodb)
9. [Complete Feature Catalog](#9-complete-feature-catalog)
10. [Complete API Reference](#10-complete-api-reference)
11. [Technical Achievements](#11-technical-achievements)
12. [Security Model](#12-security-model)
13. [Deployment & Operations](#13-deployment--operations)
14. [Known Issues & Tech Debt](#14-known-issues--tech-debt)

---

## 1. Monorepo Structure

| Folder | What it is | Stack |
|---|---|---|
| `collector/` | Backend API: ingests errors/performance data from the SDK, serves the dashboard, runs background jobs, AI analysis, alerting, ticketing | Python 3.11, FastAPI, MongoDB (Motor/PyMongo), APScheduler |
| `bug-tracker/` | Customer-facing dashboard web app | React 19 + TypeScript 5.8, Vite 7, Zustand, Clerk, Tailwind CSS |
| `sdk/` | NPM package **`bug-tracker-sdk`** (v1.0.21) that customers install in *their own* web apps to report errors back to the collector | Vanilla JS, html2canvas, tsup (dual ESM/CJS) |
| `playground/` | Demo app that links the SDK locally (`file:../sdk`) and exercises every capture path — a manual SDK test harness, not shipped | React + Vite |

Supporting assets: `docs/` (modular internal docs 00–08), `start_dev.sh` (local dev bootstrap), per-package `vercel.json` deployment configs.

---

## 2. System Architecture & Data Flow

```
Customer's web app (instrumented with bug-tracker-sdk)
   │  window.onerror / fetch & axios interceptors / manual reports / perf timing
   │  client-side batching (10 events or 5s) + offline retry queue
   ▼
POST /report, /report/performance     (auth: x-api-key, per-project)
   ▼
collector (FastAPI on Vercel)
   ├── SecurityGuard middleware: 500KB body cap + 100 req/min per-API-key rate limit
   ├── fingerprints + dedups error → "errors" collection (grouped)
   │                               + "events" collection (raw, 30-day TTL)
   ├── evaluates alert rules → email via Resend → alert_logs / email_logs
   ├── (on demand) Gemini AI root-cause analysis / summaries / perf insights
   └── (on demand) creates OpenProject tickets from errors
   ▼
bug-tracker dashboard (React SPA, Clerk-authenticated, JWT + x-org-id)
   org/project switcher · issue list · error deep-dive · performance charts
   team & permission management · alerts/integrations · superadmin console
```

### Error ingestion pipeline (step by step)

1. The SDK auto-captures an error (global `window.onerror`, fetch/axios interceptor failure, `captureError()`, or the manual bug-report widget) or a performance sample.
2. Events are **batched client-side** (flush at 10 events or every 5 s) and POSTed to `{collectorUrl}/report` (errors) or `/report/performance` (perf), authenticated with the project's `x-api-key` — no JWT involved in ingestion.
3. `SecurityGuard` middleware enforces a **500 KB body cap** and a **100 req/min per-API-key rate limit** (in-process).
4. Each error item runs as a FastAPI **background task** (`ParseError` in `ticket_service.py`):
   - Optional screenshot upload to **Cloudflare R2**.
   - Stack-trace parsing → `{file, line, column}`.
   - **Fingerprint** computed (SHA-256 over normalized event type + endpoint + message + top stack frames + project id) — the dedup/grouping key.
   - Raw event inserted into `events` (30-day TTL); the `errors` group doc is **upserted** (increment `occurrences`, update `last_seen`, or create on first sighting).
   - Alert rules evaluated (`alert_service.should_send_alert`); triggered alerts email via **Resend** and are logged to `alert_logs`/`email_logs`.
   - First-ever report flips the project's `is_integrated` flag (drives onboarding-email suppression and dashboard status badges).
5. Dashboard queries read from the grouped `errors` collection, with the latest raw `events` payload attached for detail views.

---

## 3. Technology Stack

### Collector (`collector/`)
- **FastAPI 0.135** + Starlette + Uvicorn (ASGI)
- **MongoDB** via Motor (async) + PyMongo — no ODM; schema implicit, Pydantic validates inbound payloads
- **PyJWT** (HS256) for dashboard session tokens
- **APScheduler** (`AsyncIOScheduler`) for background jobs inside FastAPI's `lifespan`
- **google-genai** (Gemini) for AI insights; model configurable via `GEMINI_MODEL`
- **boto3** against **Cloudflare R2** (S3-compatible) for screenshot storage
- **httpx** for outbound calls (Resend, OpenProject)
- **cryptography** for AES-256-CBC encryption of integration secrets at rest
- **structlog** for structured logging

### Dashboard (`bug-tracker/`)
- **React 19** + **TypeScript 5.8**, **Vite 7**, deployed as a pure SPA
- **react-router-dom 6** client-side routing
- **Zustand** single auth/org store (persisted to `localStorage`)
- **Clerk** (`@clerk/clerk-react`) for OAuth/identity, bridged to a custom Mongo-backed session
- **Recharts** for charts, **Tailwind CSS**, **lucide-react** icons, **Radix UI** dropdowns
- **crypto-js** for client-side AES-256-CBC encryption of integration secrets pre-transit

### SDK (`sdk/`)
- Vanilla JS, zero framework dependency, one runtime dependency (**html2canvas**)
- Built with **tsup** → dual ESM/CJS output
- Two public exports: `initBugTracker(config)`, `captureError(error, metadata)`

---

## 4. The Collector (Backend API)

### Module layout

```
collector/app/
├── main.py                    # app factory, CORS, SecurityGuard, lifespan (scheduler + indexes)
├── middleware/org_middleware.py  # verify_token, verify_org_membership (RBAC core)
├── models/                    # Pydantic payload models (error, project, user, alert)
├── routes/
│   ├── auth_routes.py         # Clerk sync → JWT issuance
│   ├── error_routes.py        # /report ingestion + error queries
│   ├── performance_routes.py  # perf ingestion + aggregated analytics
│   ├── project_routes.py      # project CRUD + org-wide stats/trends/top-errors aggregations
│   ├── organization_routes.py # org list/create
│   ├── member_routes.py       # org/project membership, invitations
│   ├── alert_routes.py        # alert config + logs
│   ├── ticket_routes.py       # OpenProject ticket generation
│   ├── integration_routes.py  # OpenProject config + connectivity test
│   ├── ai_routes.py           # 4 Gemini-backed insight endpoints
│   └── admin_routes.py        # SuperAdmin console (email-allowlist gated)
├── services/
│   ├── db.py                  # Motor client, collections, index creation (init_db)
│   ├── ticket_service.py      # ParseError ingestion pipeline
│   ├── alert_service.py       # rule evaluation, cooldowns
│   ├── email_service.py       # Resend integration, HTML templates, audit logging
│   ├── ai_service.py          # Gemini prompting, caching, usage logging
│   ├── openproject_service.py # OpenProject API client
│   ├── scheduler_service.py   # 15-min lifecycle-email job
│   └── r2.py                  # Cloudflare R2 client
└── utils/                     # fingerprint, stack_parser, api_key, encryption, s3upload, ticket_generate
```

### Key backend subsystems

**Fingerprinting engine** (`utils/fingerprint.py`) — the heart of dedup. SHA-256 over:
```
event_type | status | normalized_endpoint | normalized_message | stack_signature | project_id
```
- `normalize_endpoint`: strips query strings; numeric path segments → `:id`, hex/UUID segments → `:uuid`
- `normalize_message`: strips digits and quoted string literals so variable messages collapse into one signature
- `stack_signature`: top 3 non-`node_modules` frames, line/column numbers and bundler query hashes stripped

**Alerting engine** (`alert_service.py`) — per-project rules:
- **New-error trigger**: fires on first-ever sighting of a fingerprint
- **Spike trigger**: fires when N new occurrences accumulate since last notification (configurable threshold)
- **Cooldown** (minutes) per fingerprint prevents alert spam; `lastNotifiedAt`/`notifiedCount` tracked on the error group
- Failed sends queue into `pending_alerts`; all sends audited in `alert_logs` + `email_logs`

**AI service** (`ai_service.py`) — Gemini-powered, four surfaces:
1. **Error root-cause analysis** — multimodal (attaches the screenshot when present), returns structured `{problem, solution}`
2. **Project health summary** — 3-sentence SRE-style report
3. **Org-wide executive overview** — highlights the worst-performing ("bad actor") project
4. **Performance insights** — optimization suggestions from perf telemetry

All four are cached in `ai_insights` (TTL `AI_CACHE_TTL_HOURS`, default 24 h) with `force_refresh` bypass, and every call is logged to `ai_usage_logs` for audit.

**Scheduler** (`scheduler_service.py`) — one APScheduler job every 15 min (`check_pending_integrations`) driving a two-stage onboarding email nurture:
1. **2-hour reminder** — projects 2–72 h old with no SDK traffic → "Integrate the BugTrace SDK" email
2. **72-hour "Hail Mary"** — final nudge for still-unintegrated projects

Both guarded by one-shot flags (`integration_reminder_sent`, `hail_mary_sent`) so they never re-fire.

**Dashboard aggregation endpoints** (recent addition, `project_routes.py`) — three single-query MongoDB aggregation pipelines that replaced an N+1 per-project fetch pattern on the dashboard:
- `GET /projects/stats` — error count, last-seen, and 24 h activity for every org project in **one** `$group` aggregation
- `GET /projects/trends?days=14` — daily error-event counts, org-wide and per-project, powering the trend chart, the 24h-vs-yesterday delta, and per-card sparklines (real counts, zero-filled day buckets)
- `GET /projects/top-errors?limit=5` — most recently active fingerprints across the org for the at-a-glance error feed

---

## 5. The SDK (`bug-tracker-sdk`)

npm package (v1.0.21), vanilla JS, one runtime dependency (`html2canvas`), dual ESM/CJS build via tsup.

### Public API

```js
import { initBugTracker, captureError } from "bug-tracker-sdk";

initBugTracker({
  apiKey: "proj_xxxxxxxxxxxx",                        // required
  collectorUrl: "https://bugtracker.jainprashuk.in",  // optional (default shown)
  axios: axiosInstance,                                // optional — enables the axios interceptor
  features: {
    captureScreenshots: { fetchErrors: true, axiosErrors: true, consoleErrors: true },
    capturePerformance: false,     // default off
    manualBugReport: null,         // set an object to enable the floating widget
  },
});
```

- `initBugTracker` is **idempotent** (`window.__BUGTRACE_INITIALIZED__` guard) and **SSR-safe** (no-ops without `window`).
- `captureError(error, metadata)` — manual reporting from `catch` blocks; `metadata.type` can override `event_type` (default `"manual"`).

### Auto-capture matrix

| Feature | Mechanism | Notes |
|---|---|---|
| Global JS errors | Overrides `window.onerror` | `event_type: "unhandled_exception"` |
| `fetch` failures | Monkey-patches `window.fetch`; skips its own `/report`/`/performance` URLs to avoid self-loops | Non-OK response → `fetch_error`; thrown/network exception → `fetch_exception` (re-thrown after capture) |
| `axios` failures | Response interceptor on the instance passed to init | Rejects normally after capture — never swallows errors |
| Breadcrumbs | Always on; 50-entry ring buffer | Tracks meaningful UI clicks + SPA navigation (patches `history.pushState` + `popstate`) |
| Page-load performance | `window.load` + Navigation/Paint Timing APIs | Gated by `capturePerformance` |
| Per-request performance | Emitted from fetch/axios interceptors | apiRoute, method, status, duration |

### Manual bug-report widget

A floating, **Shadow-DOM-isolated** feedback button (host page CSS cannot break it) with a **fully customizable form schema**:

```js
manualBugReport: {
  captureScreenshot: true,
  floatingButton: () => myCustomButtonElement,   // optional custom trigger
  modalSchema: {
    title: "Report an Issue",
    fields: [
      { name: "title",       type: "text",     label: "Issue Summary" },
      { name: "description", type: "textarea", label: "What happened?" },
      { name: "priority",    type: "select",   label: "Severity", options: ["Low","Medium","High"] },
    ],
  },
}
```
Field types: `text`, `textarea`, `select`, `radio`, `checkbox`. Submissions become `event_type: "manual"`, `error.type: "user_report"` events with form fields in `metadata` and an optional screenshot.

### Screenshot capture

`html2canvas` against `document.body`; downscales viewports wider than 1280 px; exports JPEG at 60 % quality as a base64 data URI; **fails silently** (returns `null`) so it can never break the host app.

### Transmission, batching & resilience

Two independent in-memory queues, both flushing at **10 events or every 5000 ms**:

- **Errors** → `POST /report`. Client-side dedup: identical `${message}-${stack}` within a 5 s cooldown is dropped. On batch failure, up to the last **50 entries persist to `localStorage`** (`bugtrace_retry_queue`) and are retried with 1–5 s jitter on the next page load.
- **Performance** → `POST /report/performance` with `fetch(..., {keepalive: true})` so pings survive page unload (no retry persistence — perf failures are dropped by design).

### Payload envelope

```js
{
  event_type: "api_error" | "manual" | "unhandled_exception" | "performance" | ...,
  timestamp: "<ISO8601>",
  error:    { message, stack, type },
  request:  { url, method, payload },
  response: { status, data },
  client:   { url, browser, screen },        // location.href, userAgent, "{w}x{h}"
  metadata: {},
  screenshot: "<base64 jpeg>" | null,
  breadcrumbs: [ /* last 50 clicks + navigations */ ],
}
```

---

## 6. The Dashboard (Frontend)

React 19 + TypeScript SPA (Vite), deployed to Vercel with a catch-all rewrite to `index.html`.

### Auth flow (two-layer)

1. **Clerk** handles OAuth/identity (`<ClerkProvider>`, prebuilt sign-in components on `/login`).
2. **`ClerkSync.tsx`** (mounted invisibly at the app root) bridges Clerk → backend: on sign-in it calls `POST /auth/clerk-sync` to obtain an internal Mongo `user_id` + JWT, fetches `GET /orgs`, auto-selects the first org, and persists `{session, currentOrgId}` to `localStorage`. Sign-out clears the Zustand store.

Every API call carries `Authorization: Bearer <jwt>` + `x-org-id: <current org>`.

### Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | LandingPage | Marketing page (animated hero, typewriter/count-up/in-view hooks) |
| `/login` | LoginPage | Clerk sign-in/up |
| `/docs` | DocsPage | In-app SDK/product documentation, section-tabbed via `?section=`, mirrored in the sidebar as sub-tabs |
| `/dashboard` | DashboardPage | Org overview: project cards with sparklines, aggregate stats, 24h delta, trend chart, top-errors feed, AI org summary, live alert center, pending invites |
| `/members` | MembersPage | Org team: invite (modal), role change, remove, pending + sent invitations with cancel |
| `/project/:id` | ProjectPage | Issue table, AI health summary, API key, rename/delete, ticket generation, team modal |
| `/project/:id/performance` | ProjectPerformancePage | Web Vitals: per-route & per-API charts, p75s, success rates, AI perf insight |
| `/error/:fingerprint` | ErrorDetailPage | Deep dive: stack trace, breadcrumbs, request/response, screenshot, AI root-cause |
| `/tickets` | TicketsPage | Cross-project list of generated OpenProject tickets |
| `/settings` | SettingsPage | Per-project OpenProject integration + alert configuration |
| `/superadmin` | SuperAdminPage | Platform console: global stats, email/AI audit logs, role designer, org/project drill-down |

All non-public routes wrap in `ProtectedRoute`, which waits for Clerk + Zustand hydration and redirects to `/login` when signed out.

### State & components

- **Zustand** store (`store/auth.ts`): `user, session, organizations, currentOrgId, isLoading, error` — `currentOrgId` persisted.
- **`Sidebar.tsx`** — persistent nav with **grouped, collapsible sections** (Workspace / Manage / Resources; collapse state persisted to `localStorage`, active section auto-expands), mobile drawer, org switcher, live `/health` polling (60 s), Docs sub-tabs, logout.
- **`AIInsightCard.tsx`** — one reusable card powering all four Gemini surfaces, with manual `force_refresh` and 403 handling.
- **`CreateProjectModal.tsx`** — 3-step wizard (General → Ticketing → Alerts).
- **`InviteMemberModal.tsx`** — email + role invitation modal.
- **`ProjectTeamModal.tsx`** — per-project role overrides, distinct from org membership.
- **`PendingInvites.tsx`** — polls invitations every 30 s, inline accept/decline.
- **`ui.tsx`** — shared design-system primitives (Button, Card, Input, Badge, Skeleton, StatCard, Tabs…).
- **`utils/time.ts`** — relative-date formatting (`Today`, `3d ago`, `2w ago`…) shared across cards/feeds.
- **`utils/crypto.ts`** — client-side AES-256-CBC for integration secrets.

### Permission-aware UI

The dashboard reads `my_role` / `my_permissions` (from `GET /orgs/`) and `my_project_role` (from `GET /projects`) and gates controls accordingly — delete/edit buttons on `PROJECT_DELETE`/`PROJECT_EDIT`, integration forms on `INTEGRATIONS_MANAGE`, alert sections on `ALERT_VIEW`/`ALERT_MANAGE`, team management on org-admin role. The server remains authoritative; UI gating is defense-in-depth.

### Dogfooding

The dashboard instruments **itself** with `bug-tracker-sdk` in `App.tsx` — BugTrace reports its own errors to a BugTrace project.

---

## 7. Identity, Multi-Tenancy & RBAC

### Hierarchy

```
Organization
  └── Project (one per monitored app, own api_key)
        ├── Error groups → Events (raw occurrences)
        ├── Performance metrics
        └── Alert config / logs
```

A user can belong to **multiple organizations** (`org_members`) and can hold a **different effective role per project** (`project_members` override).

### Roles & permissions

Roles are **dynamic** — stored in MongoDB (`roles` collection, 60 s in-process cache) and live-editable via the SuperAdmin Role Designer. Defaults:

| Role | Permissions |
|---|---|
| `admin` | `*` (everything) |
| `dev` | `ORG_VIEW, PROJECT_VIEW, PROJECT_CREATE, ERROR_VIEW, ERROR_RESOLVE, PERFORMANCE_VIEW, API_KEY_VIEW, INTEGRATIONS_MANAGE` |
| `viewer` | `ORG_VIEW, PROJECT_VIEW, ERROR_VIEW, PERFORMANCE_VIEW` |

Permission catalog: `*`, `ORG_VIEW`, `ORG_MANAGE`, `PROJECT_VIEW`, `PROJECT_CREATE`, `PROJECT_EDIT`, `PROJECT_DELETE`, `TEAM_MANAGE`, `MEMBER_REMOVE`, `ROLE_CHANGE`, `ERROR_VIEW`, `ERROR_RESOLVE`, `PERFORMANCE_VIEW`, `ALERT_VIEW`, `ALERT_MANAGE`, `TICKET_CREATE`, `TICKET_VIEW`, `API_KEY_VIEW`, `INTEGRATIONS_MANAGE`, `ADMIN`.

### Authorization resolution (server-side, `org_middleware.py`)

`verify_org_membership(required_permission=None, allowed_roles=None)`:

1. Requires a valid JWT + `x-org-id` header (24-char ObjectId).
2. Loads the user's **org-level role** from `org_members` — 403 if not a member; missing role defaults to `viewer`.
3. If a `project_id` is supplied and the org role isn't `admin`, a **project-level override** from `project_members` replaces the org role *for that project only*.
4. `required_permission` checked against the resolved role's permission list (`*` matches anything).
5. Legacy `allowed_roles` list also honored; `admin` always bypasses role-list checks.

### Lifecycle flows

- **First login** → `POST /auth/clerk-sync` auto-creates `"{name}'s Org"`, makes the user its `admin`, sends a welcome email.
- **Invitations** → `POST /members/org` (requires `ORG_MANAGE`, invitee must already have an account) creates a pending `org_invitations` row → invitee accepts/declines via `POST /members/invitations/{id}/respond`; the org can **cancel a pending invite** via `DELETE /members/org/invitations/{id}`.
- **Project creation** → generates `proj_` + 24-hex api_key; creator auto-added as project `admin`.
- **Per-project elevation** → `POST /members/project` lets a `viewer` be `admin` on one project without org-wide elevation (or vice versa). Org admins implicitly have full access everywhere (UI shows "ORG ADMIN").
- **Member removal** → cascades out of all `project_members` rows in that org; self-removal blocked.

### SuperAdmin (separate, parallel system)

**Not part of org RBAC.** `verify_superadmin` checks the JWT's email against a hardcoded allowlist (`SUPER_ADMIN_EMAILS`). It bypasses org/project scoping entirely — platform-wide stats, all orgs/users/projects, force role-set, AI-usage and email audit logs, and the live Role Designer, all under `/admin/*`.

---

## 8. Data Model (MongoDB)

No ODM — schema is implicit; indexes are created at startup (`db.py::init_db`).

### ER summary

```
Organization 1──* OrgMember *──1 User
Organization 1──* Project
Project 1──* ProjectMember *──1 User
Project 1──* Error (group, keyed by fingerprint)
Error   1──* Event (raw occurrences, TTL 30d)
Project 1──* PerformanceMetric (TTL 90d)
Project 1──1 AlertConfig
Project 1──* AlertLog
Organization 1──* OrgInvitation *──1 User
```

### Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Dashboard accounts | `clerk_id, email, name, created_at` |
| `organizations` | Tenants | `name, slug, owner_id, logo_url, created_at` |
| `org_members` | Org RBAC membership | `org_id(str), user_id(str), role` |
| `project_members` | Project RBAC override | `project_id(str), user_id(str), role` |
| `org_invitations` | Pending invites | `org_id, user_id, email, role, invited_by, status(pending\|accepted\|declined)` |
| `roles` | Dynamic role definitions | `name, permissions[], description` |
| `projects` | Monitored apps | `name, org_id(ObjectId), api_key(unique), is_integrated, integrated_at, integration_reminder_sent, hail_mary_sent, integrations.openproject{base_url, api_key(encrypted), op_project_id}` |
| `errors` | **Deduplicated error groups** (one per fingerprint) | `project_id, fingerprint, event_type, message, location{file,line,column}, screenshot_url, occurrences, first_seen, last_seen, is_ticket_generated, ticket_url, lastNotifiedAt, notifiedCount` |
| `events` | Raw occurrences — **TTL 30 days** | `project_id, fingerprint, payload(full envelope), screenshot_url, created_at` |
| `performance_metrics` | Raw perf telemetry — **TTL 90 days** | `project_id, route, page_url, metrics{...}, client{browser,screen}` |
| `alert_configs` | Per-project alert rules | `projectId, channels.email{enabled, recipients[]}, triggers{newError, spike{enabled, threshold}}, cooldown` |
| `alert_logs` | Alert delivery audit | `projectId, fingerprint, type(NEW_ERROR\|SPIKE\|PENDING), detail, createdAt` |
| `pending_alerts` | Failed-email retry queue | `projectId, fingerprint, payload, recipients, retry_count` |
| `email_logs` | All outbound email audit | `recipient, subject, type(alert\|lifecycle), status, content(html), timestamp` |
| `ai_insights` | Gemini output cache | `key, type, content, generated_at` |
| `ai_usage_logs` | AI usage audit trail | `user_id, org_id, project_id, type, model, prompt, response, timestamp` |

### Indexes

- `errors`: compound `(project_id, fingerprint)` — the core dedup lookup
- `events`: TTL on `created_at` (30 d)
- `performance_metrics`: compound `(project_id, route)` + TTL on `created_at` (90 d)
- `projects`: unique `api_key`; plain `org_id`

---

## 9. Complete Feature Catalog

### Error tracking
- Automatic capture of unhandled JS exceptions, failed `fetch`/`axios` calls, and manual reports.
- **Intelligent dedup/grouping** via multi-signal fingerprinting (normalized endpoint + message + stack signature) — repeat occurrences roll up into one issue with an occurrence counter.
- Per-error detail: occurrence count, first/last seen, stack-trace viewer, request/response payloads, client info, **breadcrumb trail** (clicks + SPA navigation leading up to the error), optional **screenshot of the moment of failure**.
- Manual bug reporting: customizable floating feedback widget (schema-driven form) or programmatic `captureError()`.

### Performance monitoring
- Page-load Web Vitals: page load time, DOMContentLoaded, first paint, FCP, TTFB, DNS/TCP/request timings.
- Per-API-call latency & status via the interceptors.
- Dashboard analytics: per-route and per-endpoint averages + **p75**, API success rates, selectable ranges (24 h / 7 d / 30 d / 90 d), time-series charts.

### Alerting
- Per-project email rules: **new-error** trigger and **spike** trigger (threshold-based), with per-fingerprint **cooldown**.
- Full delivery audit (`alert_logs`) + Live Alert Center widget on the dashboard.
- Channel schema is extensible; email (Resend) is the implemented channel.

### AI intelligence (Gemini)
- **Multimodal root-cause analysis** per error (screenshot-aware) → `{problem, solution}`.
- Project health summary, org-wide executive overview (flags the worst project), performance optimization insights.
- 24 h caching with force-refresh; complete usage audit trail.

### Issue → Ticket workflow
- Per-project **OpenProject** integration (API key encrypted at rest *and* in transit).
- One-click ticket generation from an error — rich Markdown ticket with summary, client info, metadata, full payload, screenshot link.
- Cross-project Tickets page.

### Organizations, teams & permissions
- Multi-tenant orgs, auto-provisioned on first login; users can belong to many orgs.
- Invitation flow with accept / decline / **cancel-pending**.
- **Dynamic, live-editable roles** with granular permission strings; org role + per-project override.
- SuperAdmin console: global stats, all orgs/projects/users drill-down, AI usage audit, email audit (with rendered HTML preview), live Role Designer.

### Lifecycle & onboarding emails
- Welcome email on signup; 2-hour SDK-integration reminder; 72-hour final nudge — all one-shot guarded, all audited.

### Dashboard UX
- Org switcher; project cards with integration-status badge, copyable API key, **per-project error sparklines** and relative last-seen times.
- Aggregate stats with **24h-vs-yesterday trend delta**, org-wide daily error trend chart, cross-project **top-errors feed** — all served by single-aggregation endpoints (no N+1).
- Grouped collapsible sidebar with persisted state, mobile drawer, live backend-health indicator (60 s poll).
- In-app documentation page with sidebar-synced section tabs.
- Self-instrumented (dogfooding) with its own SDK.

---

## 10. Complete API Reference

Base URL (prod): `https://bugtracker.jainprashuk.in`.
Auth legend: **JWT** = `Authorization: Bearer` (from `/auth/clerk-sync`) + `x-org-id` header on org-scoped routes; **API key** = `x-api-key` (SDK ingestion only); **SA** = SuperAdmin email allowlist.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /` , `GET /health` | none | Liveness / DB ping |
| `POST /auth/clerk-sync` | none | Create/lookup user, auto-provision first org, issue JWT |
| `GET /auth/verify` | JWT | Validate token → `{id, email, name}` |
| `POST /report` | API key | Ingest error(s), single or batch; async processing |
| `POST /report/performance` | API key | Ingest performance sample(s) |
| `GET /projects/{id}/errors?page=&limit=` | JWT + RBAC | Paginated grouped error list |
| `GET /errors/{fingerprint}` | JWT + RBAC | Error group + latest raw event payload |
| `GET /projects/{id}/performance?days=` | `PERFORMANCE_VIEW` | Avg/p75 per route & API endpoint |
| `GET /projects/{id}/performance/route?route=&days=` | `PERFORMANCE_VIEW` | Time-series for one route |
| `POST /projects` | `PROJECT_CREATE` | Create project → `{project_id, api_key}` |
| `GET /projects` | `PROJECT_VIEW` | Org's projects (+`my_project_role`; api_key masked without `API_KEY_VIEW`) |
| `GET /projects/stats` | `PROJECT_VIEW` | Per-project error count / last-seen / 24 h count (single aggregation) |
| `GET /projects/trends?days=` | `PROJECT_VIEW` | Daily error counts, org-wide + per-project |
| `GET /projects/top-errors?limit=` | `PROJECT_VIEW` | Most recently active errors across the org |
| `PATCH /projects/{id}` | `PROJECT_EDIT` | Rename |
| `DELETE /projects/{id}` | `PROJECT_DELETE` | Cascading delete |
| `GET /orgs/` | JWT | User's orgs with `my_role` + `my_permissions` |
| `POST /orgs/` | JWT | Create org (caller becomes admin) |
| `GET /members/org` | `ORG_VIEW` | Org members (enriched) |
| `POST /members/org` | `ORG_MANAGE` | Invite member by email |
| `POST /members/org/role` | `ROLE_CHANGE` | Change a member's org role |
| `DELETE /members/org/{user_id}` | `MEMBER_REMOVE` | Remove member (cascades project roles) |
| `GET /members/invitations` | JWT | My pending invitations |
| `POST /members/invitations/{id}/respond?accept=` | JWT | Accept/decline |
| `GET /members/org/invitations` | RBAC | Invitations sent from the org |
| `DELETE /members/org/invitations/{id}` | `ORG_MANAGE` | Cancel a pending invitation |
| `GET /members/project/{project_id}` | `PROJECT_VIEW` | Project-assigned members |
| `POST /members/project` | `TEAM_MANAGE` | Upsert project-level role override |
| `DELETE /members/project/{pid}/{uid}` | `TEAM_MANAGE` | Remove project assignment |
| `GET /projects/{id}/alert-config` | `ALERT_VIEW` | Get (or create default) alert config |
| `PUT /projects/{id}/alert-config` | `ALERT_MANAGE` | Upsert alert config |
| `GET /projects/{id}/alerts/logs` | `ALERT_VIEW` | Last 50 alert log entries |
| `POST /tickets/openproject/{fingerprint}` | `TICKET_CREATE` | Generate OpenProject ticket |
| `GET /projects/{id}/tickets` | RBAC | Errors with tickets generated |
| `POST /projects/{id}/integrations/openproject` | `INTEGRATIONS_MANAGE` | Save integration (encrypted key) |
| `POST /integrations/openproject/test` | `INTEGRATIONS_MANAGE` | Connectivity check |
| `POST /ai/analyze-error` | `PROJECT_VIEW` | Multimodal root-cause analysis |
| `GET /ai/project-summary/{id}` | `PROJECT_VIEW` | Health summary |
| `GET /ai/global-overview` | `ADMIN` | Org-wide executive summary |
| `GET /ai/performance-insights/{id}` | `PROJECT_VIEW` | Performance suggestions |
| `GET /admin/stats` | SA | Global platform counts |
| `GET/POST /admin/roles` | SA | List / live-edit RBAC roles |
| `GET /admin/orgs` · `/admin/users` · `/admin/projects` | SA | Platform-wide listings |
| `GET /admin/org/{id}/members` · `/projects` | SA | Per-org drill-down |
| `POST /admin/org/{id}/member-role` · `/admin/project/{id}/member-role` | SA | Force-set roles |
| `GET /admin/ai-usage` · `/admin/email-logs` | SA | Paginated, filterable audit logs |

---

## 11. Technical Achievements

1. **End-to-end observability platform built from scratch** — SDK instrumentation → ingestion → dedup → alerting → AI analysis → ticketing, spanning three codebases (JS SDK, Python backend, React dashboard) in one coherent product.
2. **Multi-signal error fingerprinting** with endpoint/message/stack normalization (IDs → `:id`, UUIDs → `:uuid`, digit/literal stripping, bundler-hash stripping) — variable error messages and dynamic routes collapse into stable issue groups, the same core problem Sentry solves.
3. **Dual-storage ingestion design**: grouped `errors` documents for fast dashboard queries + raw `events` with a 30-day TTL for forensic detail, joined lazily on the detail view — combining cheap aggregate reads with full-fidelity drill-down and automatic data expiry (90-day TTL on perf metrics).
4. **Resilient, non-invasive SDK**: idempotent + SSR-safe init, batching (10 events / 5 s), client-side dedup with cooldown, `localStorage` offline retry queue with jittered replay, `keepalive` fetch for unload-surviving perf pings, self-loop protection in the fetch patch, silent screenshot failure, and error re-throw semantics that never alter host-app behavior.
5. **Shadow-DOM-isolated feedback widget** with a schema-driven form builder (5 field types) — embeddable in any site without CSS collisions.
6. **Automatic breadcrumb trail** — history-API patching + filtered click tracking in a bounded ring buffer, giving every error a "what the user did before it broke" timeline.
7. **Dynamic RBAC with two-level role resolution** — DB-stored, live-editable roles + granular permission strings; org-level role with per-project override, resolved in a single FastAPI dependency; permission-aware UI mirroring server enforcement.
8. **Multi-tenant architecture** with auto-provisioned orgs, header-scoped tenancy (`x-org-id`), per-project API-key ingestion auth fully decoupled from dashboard JWT auth.
9. **Multimodal AI integration** — Gemini analysis that reads the error *screenshot* alongside the stack trace; four cached, audited insight surfaces (error / project / org / performance) with TTL + force-refresh semantics.
10. **Single-pass aggregation endpoints** (`/projects/stats`, `/trends`, `/top-errors`) — MongoDB `$group` pipelines with zero-filled day buckets replacing an N+1 dashboard fetch pattern (one query for N projects instead of N+1 requests).
11. **Rule-based alerting engine** with new-error and spike triggers, per-fingerprint cooldowns, retry queueing, and a complete delivery audit trail — plus an automated two-stage onboarding email nurture driven by APScheduler with one-shot idempotency flags.
12. **Layered secret protection** for integrations: AES-256-CBC client-side before transit *and* server-side at rest.
13. **Defense-in-depth ingestion hardening**: body-size caps, per-API-key rate limiting, and background-task processing so ingestion latency stays flat regardless of pipeline work (screenshots, alerts, R2 uploads).
14. **Dogfooding** — the dashboard monitors itself with its own SDK.
15. **Serverless deployment** of both API (FastAPI on Vercel Python runtime) and SPA, with S3-compatible object storage (Cloudflare R2) for screenshots.

---

## 12. Security Model

- **Two credential planes**: dashboard JWT (HS256, default 24 h expiry, re-auth via Clerk) vs per-project `x-api-key` for ingestion — a compromised SDK key can only write events to its own project, never read anything.
- **Server-authoritative RBAC** via `verify_org_membership` on every org-scoped route; UI gating is cosmetic defense-in-depth.
- **SuperAdmin isolation**: platform admin is a separate email-allowlist mechanism, deliberately outside tenant RBAC.
- **Tenancy scoping**: every project-bearing collection is scoped by `project_id` → `org_id`; no cross-org read path exists outside `/admin/*`.
- **Ingestion guardrails**: 500 KB body cap, 100 req/min per API key.
- **Secrets at rest**: OpenProject API keys AES-256-CBC-encrypted server-side (and encrypted client-side pre-transit).
- Known hardening gaps are catalogued in [§14](#14-known-issues--tech-debt) (Clerk sync trust boundary, plaintext API-key storage, hardcoded frontend fallback keys).

---

## 13. Deployment & Operations

- **Both collector and dashboard deploy to Vercel** — collector as a Python 3.11 serverless function (all routes → single entrypoint), dashboard as a static SPA (catch-all rewrite).
- **Prod endpoints**: API `https://bugtracker.jainprashuk.in`, dashboard `https://bugtrace.jainprashuk.in`.
- **CORS**: `localhost:3000`, `localhost:5173`, prod dashboard origin (configurable via `ALLOWED_ORIGINS`).
- **Key env vars**: `MONGO_URI`, `JWT_SECRET`, `ACCESS_TOKEN_EXPIRE_HOURS`, `GEMINI_API_KEY`/`GEMINI_MODEL`, `AI_CACHE_TTL_HOURS`, `RESEND_API_KEY`, R2 credentials + `R2_PUBLIC_URL`, `ENCRYPTION_KEY`; frontend: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`, `VITE_ENCRYPTION_KEY`.
- **Background jobs** run in-process via APScheduler within FastAPI's lifespan (15-min lifecycle-email job).
- **Observability**: structlog structured logging; `email_logs`/`alert_logs`/`ai_usage_logs` provide full audit trails; `/health` pings MongoDB.
- **Local dev**: `start_dev.sh`; the `playground/` app is the manual SDK test harness against a local collector.

---

## 14. Known Issues & Tech Debt

A condensed inventory (full detail in [docs/08-known-issues.md](docs/08-known-issues.md)):

**Backend**
- Project-delete cascade queries child collections by *string* `project_id` while they store `ObjectId` — likely orphans data on delete.
- `pending_alerts` retry queue is write-only (no drain job).
- Role seed lists differ between `org_middleware.py` and `admin_routes.py`.
- Mixed `allowed_roles` vs `required_permission` auth styles across routes.
- `org_id`/`user_id`/`project_id` stored as strings in membership collections but ObjectId in `projects` — latent bug source.
- `/auth/clerk-sync` trusts the posted `{clerk_id, email, name}` without verifying a Clerk signature.
- Scheduler owner lookup uses legacy single-owner `project.user_id`.
- Rate limiting is in-memory per instance (not distributed); API keys stored plaintext (not hashed).
- No AI spend enforcement (audit-only); no billing system.

**Frontend**
- `@tanstack/react-query` installed & wired but unused; every page does manual `fetch` + `useState`.
- Session/header construction duplicated per page instead of using the shared `apiClient` (whose 401 interceptor therefore never applies).
- `/superadmin` has no route-level guard (backend allowlist is the real protection).
- Hardcoded secrets in source: dashboard's own SDK API key in `App.tsx`; AES fallback key in `utils/crypto.ts`.
- Dead code: `GitHubCallbackPage.tsx` (unrouted); `DashboardLayout.tsx` is a no-op.
- `types/index.ts` shapes are aspirational (camelCase) vs actual snake_case API responses.

**SDK**
- Unhandled promise rejections **not** captured (no `unhandledrejection` listener) despite docs/demo implying so.
- `dist/index.d.ts` contains bundled JS, not real type declarations (`tsup --dts` defect).
- `window.onerror` handler overwrites pre-existing handlers and emits a smaller ad-hoc payload missing `request`/`response`/`metadata`.
- `recentErrors` dedup map never pruned (slow memory growth in long sessions).

**Suggested priority**: fix the delete-cascade bug, implement (or un-document) unhandled-rejection capture, remove hardcoded frontend secrets, fix the `.d.ts` build.

---

*Cross-references: modular deep-dives live in [docs/](docs/) — [00-PROJECT-OVERVIEW](docs/00-PROJECT-OVERVIEW.md) · [01-system-design](docs/01-system-design.md) · [02-api-reference](docs/02-api-reference.md) · [03-permissions-and-orgs](docs/03-permissions-and-orgs.md) · [04-data-model](docs/04-data-model.md) · [05-sdk-reference](docs/05-sdk-reference.md) · [06-frontend-architecture](docs/06-frontend-architecture.md) · [07-features](docs/07-features.md) · [08-known-issues](docs/08-known-issues.md).*
