# Frontend Architecture — `bug-tracker/` Dashboard

React 19 + TypeScript, Vite, deployed to Vercel as a pure SPA (catch-all rewrite to `index.html`).

## Auth flow

Two layers of identity:

1. **Clerk** — the actual OAuth/identity provider (`@clerk/clerk-react`), configured in `main.tsx` (`<ClerkProvider afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">`). `LoginPage.tsx` uses Clerk's prebuilt modal components.
2. **Backend session bridge** — `src/components/ClerkSync.tsx`, mounted invisibly at the app root. On Clerk sign-in, it calls `POST /auth/clerk-sync` to get an internal Mongo `user_id` + JWT, fetches `GET /orgs` to populate the org list, auto-selects the first org if none chosen, and persists everything to `localStorage` (`session: {user, token}`, `currentOrgId`). On sign-out, clears the Zustand store.

Every page's manual `fetch` calls read `localStorage.session` directly for the `Authorization: Bearer <token>` and the current org for `x-org-id` — rather than going through a shared client. A formal `apiClient` (axios, with interceptors incl. 401→redirect) exists in `services/api.ts` but is barely used; most pages bypass it. This duplication (header construction, session parsing) is repeated per-page rather than centralized.

## Routing (`src/App.tsx`)

**Public:** `/` (Landing), `/login`, `/docs`, `*` → redirect to `/`.

**Protected** (wrapped in `ProtectedRoute`): `/dashboard`, `/members`, `/project/:id`, `/project/:id/performance`, `/error/:fingerprint`, `/tickets`, `/settings`, `/superadmin`.

`ProtectedRoute` waits for both Zustand (`isLoading`) and Clerk to finish initializing, shows a sync error screen on backend-sync failure, and redirects to `/login` if Clerk reports signed-out.

Note: `/superadmin` has **no route-level guard** — access control is only a sidebar-link visibility check (`user.email === '29jainprashuk@gmail.com'`); real protection comes entirely from the backend's email allowlist on `/admin/*`. Also note `GitHubCallbackPage.tsx` exists but is unregistered/dead code (no route points to it).

## State management

Single Zustand store (`src/store/auth.ts`):
```
user, session, organizations, currentOrgId (persisted to localStorage), isLoading, error
```
`@tanstack/react-query` is installed and `QueryClientProvider` wraps the app, but **no query/mutation hooks are used anywhere** — dead infrastructure. Everything else (projects, errors, members, alert configs, AI insights, pagination, modal state) lives in per-page `useState`; there's no shared cache, so navigating between pages always re-fetches.

## Pages

| Route | Purpose |
|---|---|
| `/` | Marketing landing page |
| `/login` | Clerk sign-in/up |
| `/docs` | Static in-app documentation (hardcoded content, tab-synced to `?section=`) |
| `/dashboard` | Org-scoped project list, aggregate stats, AI org summary, error-per-project chart, live alert center, pending invites |
| `/members` | Org team management: invite, role change, remove, pending invitations |
| `/project/:id` | Project detail: issues table, AI health summary, API key, rename/delete, generate ticket, link to performance, team modal |
| `/project/:id/performance` | Web Vitals dashboard: per-route and per-API charts, AI performance insight |
| `/error/:fingerprint` | Error deep-dive: stack trace, breadcrumbs, request/response, screenshot, AI root-cause analysis |
| `/tickets` | Cross-project list of generated OpenProject tickets |
| `/settings` | Per-project OpenProject integration config + alert notification config |
| `/superadmin` | Platform-wide admin console (stats, email log, AI usage log, role designer, org/project drill-down) |

## Components of note

- **`Sidebar.tsx`** — persistent nav, org switcher, live `/health` polling (60s), logout.
- **`ClerkSync.tsx`** — the critical Clerk→backend session bridge (see Auth flow above).
- **`AIInsightCard.tsx`** — reusable card powering all 4 Gemini-backed insight surfaces; supports manual refresh (`force_refresh=true`), handles 403 ("AI features restricted to Admins").
- **`OrgSwitcher.tsx` / `CreateOrgModal.tsx`** — org list dropdown + creation flow.
- **`CreateProjectModal.tsx`** — 3-step wizard (General → Ticketing → Alerts) for project creation.
- **`ProjectTeamModal.tsx`** — per-project member/role management, distinct from org membership.
- **`PendingInvites.tsx`** — polls invitations every 30s, accept/decline inline.
- **`ui.tsx`** — shared design-system primitives (Button, Card, Input, Badge, Skeleton, StatCard, Tabs, etc.) — note `DashboardLayout.tsx` itself is a no-op (`<Outlet/>` only); every page independently renders its own `<Sidebar/>` + layout wrapper rather than sharing a chrome shell.

## Permission-aware UI

The dashboard reads `my_role`/`my_permissions` (org-level, from `GET /orgs/`) and `my_project_role` (project-level override, from `GET /projects`) to gate buttons/sections. See [03-permissions-and-orgs.md](./03-permissions-and-orgs.md#frontend-enforcement-ui-side-defense-in-depth-only--server-is-authoritative) for the full breakdown of what's gated where.

## Notable details

- The dashboard **self-instruments with its own SDK** (`bug-tracker-sdk`) in `App.tsx` — including a hardcoded API key checked into source — meaning the dashboard reports its own errors back to a BugTrace project. Useful "dogfooding" feature, but also a hardcoded-secret smell worth fixing.
- Client-side AES-256-CBC encryption (`crypto-js`, `src/utils/crypto.ts`) is used to encrypt OpenProject integration secrets before sending to the backend; falls back to a hardcoded key if `VITE_ENCRYPTION_KEY` is unset (another secret-in-source smell).
- No websockets/SSE — all "live" UI (alert center, health indicator, pending invites) is polling- or refresh-button-driven, not push-based.
- `VERIFICATION_CHECKLIST.md` describes an older Google-OAuth + `Bearer {user_id}` auth pattern that predates the current Clerk + clerk-sync flow — treat it as historical, not current behavior.
