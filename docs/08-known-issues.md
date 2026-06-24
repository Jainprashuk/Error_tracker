# Known Issues, Inconsistencies & Tech Debt

Discovered while reading the full codebase to write this documentation set (2026-06-24). None of these have been fixed — this is an inventory for whoever picks up engineering work next.

## Backend (collector)

1. **Cascading project delete likely leaves orphans.** `DELETE /projects/{project_id}` deletes `errors`/`events`/`performance_metrics` using the raw string `project_id` (`{"project_id": project_id}`), but those collections store `project_id` as an `ObjectId`. The queries likely silently match zero documents, leaving orphaned data after a project is "deleted."
2. **`pending_alerts` is write-only.** Failed alert emails are queued there on send failure, but no scheduled job or code path ever drains/retries it. It will grow unbounded.
3. **Role permission lists are inconsistent across two seed locations.** `org_middleware.py`'s default `dev` role permissions differ from the seed list in `admin_routes.py`'s `GET /admin/roles` (the latter is missing `PERFORMANCE_VIEW`/`API_KEY_VIEW`). Whichever seeds first "wins" depending on call order — should be unified to one source of truth.
4. **Mixed `allowed_roles` vs `required_permission` authorization styles.** Some routes use the legacy role-list check, some use the permission-string check, some use both — inconsistent and worth normalizing to permission-strings only.
5. **`org_id`/`user_id`/`project_id` type inconsistency.** Stored as strings in `org_members`/`project_members`/`org_invitations`, but as `ObjectId` in `projects.org_id`. Code converts carefully at each call site today, but it's a latent bug source for any new query.
6. **Clerk trust boundary.** `/auth/clerk-sync` accepts `{clerk_id, email, name}` with no server-side verification of a Clerk session token/signature — it trusts whatever the frontend posts. Acceptable only if the frontend origin is fully trusted; worth hardening (e.g. verifying a Clerk session JWT) before this app is exposed to less-trusted clients.
7. **Scheduler owner lookup uses a legacy single-owner field.** `check_pending_integrations` resolves the "project owner" via `project.user_id`, which doesn't reflect the multi-membership org model. If absent, the reminder/hail-mary flags are still marked "sent" so the project is never retried through another channel.
8. **In-memory, per-instance rate limiting.** The 100 req/min per-API-key cap in `SecurityGuard` resets on restart/cold start and isn't shared across multiple instances — fine for a single Vercel function instance, not a real distributed rate limit.
9. **Double encryption hop for OpenProject keys.** The frontend encrypts the API key client-side (AES-256-CBC via `crypto-js`), the backend decrypts then re-encrypts with its own server-side key before persisting. Functionally fine, but worth confirming this is the intended design rather than an accidental double-encrypt.
10. **`seed_demo_user.py` creates a plaintext-password demo account** (`demo@example.com` / `password123`) — a test/legacy artifact, not part of the live Clerk-based auth flow. Should not be run against a production database.
11. **No spend/credit enforcement on Gemini AI usage** — usage is logged for audit (`/admin/ai-usage`) but nothing throttles or bills for it.
12. **No billing/payments system at all** — there is no Stripe or subscription logic anywhere in the codebase, despite this being a SaaS-shaped product.

## Frontend (bug-tracker)

1. **`@tanstack/react-query` is installed and wired up (`QueryClientProvider`) but never used** — every page does manual `fetch` + `useState` instead. Either remove the dependency or actually adopt it.
2. **Auth/session access is duplicated across nearly every page** — each page independently does `JSON.parse(localStorage.getItem('session'))` and manually builds `Authorization`/`x-org-id` headers, instead of going through the existing (underused) `apiClient` in `services/api.ts`. The formal `apiClient`'s 401→redirect interceptor doesn't apply to any of these manual `fetch` calls.
3. **`/superadmin` has no route-level guard.** The only client-side gate is a hardcoded email check on the sidebar link's *visibility* (`user.email === '29jainprashuk@gmail.com'`); the route itself renders for any authenticated user who navigates there directly. Real protection is backend-only (the `/admin/*` endpoints re-check the email allowlist) — acceptable since the UI would just show empty/403'd panels, but worth knowing it's not defense-in-depth on the frontend.
4. **Dead code:** `GitHubCallbackPage.tsx` exists (handles a GitHub OAuth callback) but is never registered as a route — unreachable.
5. **`DashboardLayout.tsx` is a no-op** (`<Outlet/>` only) — there's no shared page chrome; every protected page re-implements its own `<Sidebar/>` + layout wrapper, leading to duplicated structural markup.
6. **Hardcoded secrets in source:**
   - `App.tsx` initializes the dashboard's own SDK instrumentation with a hardcoded API key (`proj_1f7fd28940620f612ab9a521`).
   - `src/utils/crypto.ts` falls back to a hardcoded AES key if `VITE_ENCRYPTION_KEY` is unset.
   Both should be moved to environment configuration only, with no fallback default in source.
7. **Formal TypeScript types are aspirational, not authoritative.** `src/types/index.ts` defines camelCase shapes, but actual API responses are snake_case and most fetched data (members, invitations, tickets, alert config, AI insights, admin logs) is untyped `any`. Don't trust the types as ground truth for new code — check the actual API response.
8. **`VERIFICATION_CHECKLIST.md` describes an outdated auth flow** (Google OAuth + `Bearer {user_id}`) that predates the current Clerk + `/auth/clerk-sync` implementation. Treat as historical reference only.
9. **`README.md` is unmodified Vite boilerplate** — not project-specific, could be replaced with real setup instructions (or just point to `docs/`).

## SDK

1. **Unhandled promise rejections are not actually captured**, despite the README and the playground's demo button implying they are. There is no `window.addEventListener('unhandledrejection', ...)` anywhere in source. Either implement it or correct the docs/demo.
2. **`dist/index.d.ts` / `dist/index.d.cts` contain bundled JS, not real type declarations** — a `tsup --dts` build defect. Don't market "TypeScript support" until this is fixed.
3. **Payload shape is not 100% uniform.** The raw `window.onerror` handler builds an ad-hoc smaller object that skips the `request`/`response`/`metadata` fields present in the standard `createBasePayload` envelope used everywhere else.
4. **`window.onerror` overwrites any pre-existing handler** rather than chaining to it — if the host app already sets `window.onerror`, that handler is silently replaced.
5. **In-memory dedup map in `sender.js` (`recentErrors`) is never pruned/capped** — long-running sessions with many distinct error signatures could grow this unboundedly (minor memory leak).
6. **The `project` config option is vestigial** — it only flows into the legacy `window.onerror` payload as a flag, and is not the actual project identifier (that's always `apiKey`). Avoid documenting it as required or meaningful.
7. **Leftover debug `console.log`** in `manualBugReporter.js` before building the actual payload — harmless but should be cleaned up.

## Suggested priority if picking this up

High-value, low-risk fixes first: (a) fix the project-delete cascade bug (#1 backend), (b) fix or remove the unhandled-rejection claim (#1 SDK), (c) remove hardcoded secrets from frontend source (#6 frontend), (d) fix the SDK's broken `.d.ts` build output (#2 SDK). Everything else is either by-design-but-undocumented behavior or non-urgent cleanup.
