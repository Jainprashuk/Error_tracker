# API Reference — Collector Backend

Base URL (prod): `https://bugtracker.jainprashuk.in`. No global route prefix except `/orgs`, `/members`, `/admin`.

**Auth conventions:**
- `JWT` = `Authorization: Bearer <token>` issued by `POST /auth/clerk-sync`.
- `x-org-id` = 24-char Mongo ObjectId string, required on virtually all org-scoped routes.
- `x-api-key` = per-project key, used only for SDK ingestion endpoints.

## Health / root

| Method & path | Auth | Notes |
|---|---|---|
| `GET /` | none | liveness message |
| `GET /health` | none | pings MongoDB, returns `{status, db, timestamp}` |

## Auth

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /auth/clerk-sync` | none | `{clerk_id, email, name}` | Creates/looks up user; on first login auto-creates an org (`"{name}'s Org"`) + admin membership, sends welcome email. Returns `{user_id, email, name, token}` |
| `GET /auth/verify` | JWT | — | Returns `{id, email, name}` |

## Error ingestion & query

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /report` | `x-api-key` | single `ErrorPayload` or array | Rejects `event_type=="performance"` (use `/report/performance`). Processed async per item. Returns `{status:"received", batch_size}`. Marks project `is_integrated=true` on first call. |
| `GET /projects/{project_id}/errors?page=&limit=` | JWT + org RBAC (`admin/dev/viewer`) | — | Paginated grouped error list + `total` |
| `GET /errors/{fingerprint}` | JWT + org RBAC (`admin/dev/viewer`) | — | Error group doc + latest raw event payload attached as `error.payload` |

## Performance ingestion & query

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /report/performance` | `x-api-key` | single or array `PerformancePayload` | Pure insert, no dedup/alerting |
| `GET /projects/{project_id}/performance?days=7` | RBAC `PERFORMANCE_VIEW` | — | Avg/p75 per route & per API endpoint |
| `GET /projects/{project_id}/performance/route?route=&days=7` | RBAC `PERFORMANCE_VIEW` | — | Time-series for one route (chart data) |

## Projects

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /projects` | RBAC `PROJECT_CREATE` | `{name}` | Generates API key, creator becomes project-level `admin`. Returns `{project_id, api_key, org_id}` |
| `GET /projects` | RBAC `PROJECT_VIEW` | — | Org's projects; attaches `my_project_role`; masks `api_key` unless caller has `API_KEY_VIEW` |
| `GET /projects/stats` | RBAC `PROJECT_VIEW` | — | Per-project `{errorCount, lastSeen, count24h}` for the whole org in one aggregation (replaces the dashboard's old N+1 per-project fetch) |
| `GET /projects/trends?days=14` | RBAC `PROJECT_VIEW` | — | Daily error-event counts (zero-filled buckets), org-wide + per-project — powers the dashboard trend chart and project-card sparklines |
| `GET /projects/top-errors?limit=5` | RBAC `PROJECT_VIEW` | — | Most recently active error fingerprints across all org projects, with project names attached |
| `PATCH /projects/{project_id}` | RBAC `PROJECT_EDIT` | `{name}` | Rename only |
| `DELETE /projects/{project_id}` | RBAC `PROJECT_DELETE` | — | Cascading delete (errors/events/performance_metrics/project_members/alert_configs/alert_logs + project doc) — see [08-known-issues.md](./08-known-issues.md) for a cascade bug |

## Organizations (`/orgs`)

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `GET /orgs/` | JWT | — | Orgs the user belongs to, with `my_role` + `my_permissions` |
| `POST /orgs/` | JWT | `{name}` | Creates org + caller becomes admin |

## Members & invitations (`/members`)

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `GET /members/org` | RBAC `ORG_VIEW` | — | Org members enriched with name/email |
| `POST /members/org/role` | RBAC `ROLE_CHANGE` | `{user_id, role}` | Cannot change own role |
| `POST /members/org` | RBAC `ORG_MANAGE` | `{email, role="viewer"}` | Creates a pending invitation; invitee must already have an account |
| `GET /members/invitations` | JWT | — | Current user's pending invitations |
| `POST /members/invitations/{invitation_id}/respond?accept=bool` | JWT | — | Accept creates `org_members` row; decline updates status |
| `GET /members/org/invitations` | RBAC (`admin`/`dev`) | — | Invitations sent from the org |
| `DELETE /members/org/invitations/{invitation_id}` | RBAC `ORG_MANAGE` | — | Cancels a still-pending invitation (404 if already responded/missing) |
| `GET /members/project/{project_id}` | RBAC `PROJECT_VIEW` | — | Project-assigned members |
| `POST /members/project` | RBAC `TEAM_MANAGE` | `{user_id, project_id, role="viewer"}` | Upserts a project-level role override; target must already be an org member |
| `DELETE /members/project/{project_id}/{user_id}` | RBAC `TEAM_MANAGE` | — | Removes project assignment |
| `DELETE /members/org/{user_id}` | RBAC `MEMBER_REMOVE` | — | Removes org membership + cascades from all `project_members` in that org. Cannot remove self |

## Alerts

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `GET /projects/{project_id}/alert-config` | RBAC `ALERT_VIEW` | — | Returns config, creating a default if missing |
| `PUT /projects/{project_id}/alert-config` | RBAC `ALERT_MANAGE` | `{projectId, channels, triggers:{newError, spike:{enabled, threshold}}, cooldown}` | Upsert |
| `GET /projects/{project_id}/alerts/logs` | RBAC `ALERT_VIEW` | — | Last 50 alert log entries, newest first |

## Tickets (OpenProject)

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /tickets/openproject/{fingerprint}` | RBAC `TICKET_CREATE` | — | Creates a ticket from an error; 400 if already generated or integration missing |
| `GET /projects/{project_id}/tickets` | RBAC (`admin/dev/viewer`) | — | Lists errors with `is_ticket_generated=true` |

## Integrations

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /projects/{project_id}/integrations/openproject` | RBAC `INTEGRATIONS_MANAGE` | `{base_url, api_key, project_id}` | `api_key` arrives client-encrypted, is decrypted then re-encrypted server-side for storage |
| `POST /integrations/openproject/test` | RBAC `INTEGRATIONS_MANAGE` | same shape | Connectivity check; returns `{status: success|failed|error}` |

## AI intelligence (Gemini)

| Method & path | Auth | Body / Params | Notes |
|---|---|---|---|
| `POST /ai/analyze-error` | RBAC `PROJECT_VIEW` | `{error_id}` (fingerprint or ObjectId) | Multimodal (uses screenshot if present); cached `AI_CACHE_TTL_HOURS` (default 24h); returns `{problem, solution}` |
| `GET /ai/project-summary/{project_id}?force_refresh=` | RBAC `PROJECT_VIEW` | — | 3-sentence health summary |
| `GET /ai/global-overview?force_refresh=` | RBAC `ADMIN` | — | Org-wide executive summary, highlights "bad actor" project |
| `GET /ai/performance-insights/{project_id}?force_refresh=` | RBAC `PROJECT_VIEW` | — | Performance optimization suggestions |

## SuperAdmin (`/admin`) — gated by hardcoded email allowlist, not org RBAC

`SUPER_ADMIN_EMAILS = ["29jainprashuk@gmail.com"]` in `admin_routes.py`.

| Method & path | Notes |
|---|---|
| `GET /admin/stats` | Global counts: orgs, users, projects, total_events |
| `GET /admin/roles` | Lists/seeds default RBAC roles |
| `POST /admin/roles` | Upserts a role's permission list; invalidates role cache |
| `GET /admin/orgs` | All organizations |
| `GET /admin/org/{org_id}/members` | Members of any org |
| `POST /admin/org/{org_id}/member-role` | Force-set a member's org role |
| `GET /admin/org/{org_id}/projects` | Projects for any org |
| `GET /admin/projects` | All projects platform-wide |
| `GET /admin/users` | All users |
| `GET /admin/project/{project_id}/members` | Project members for any project |
| `POST /admin/project/{project_id}/member-role` | Force-set a project member's role |
| `GET /admin/ai-usage?user_id=&org_id=&project_id=&page=&page_size=` | Paginated AI usage/credit logs |
| `GET /admin/email-logs?type=&recipient=&page=&page_size=` | Paginated email audit log, with regex filter on recipient |

## Payload shapes (SDK → collector)

See [05-sdk-reference.md](./05-sdk-reference.md#payload-shapes) for the exact `ErrorPayload`/`PerformancePayload` envelopes sent by the SDK.
