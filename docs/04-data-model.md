# Data Model — MongoDB Collections

No ODM is used; schema below is implicit from code (`collector/app/services/db.py` defines indexes; models live across `app/models/*.py` and inline dict construction in routes/services).

## ER summary

```
Organization 1───* OrgMember *───1 User
Organization 1───* Project
Project 1───* ProjectMember *───1 User
Project 1───* Error (group, keyed by fingerprint)
Error 1───* Event (raw occurrences)
Project 1───* PerformanceMetric
Project 1───1 AlertConfig
Project 1───* AlertLog
Organization 1───* OrgInvitation *───1 User
```

## Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Dashboard user accounts | `_id, clerk_id, email, name, created_at, welcome_blast_sent?` (legacy: `password` from seed script only) |
| `organizations` | Tenants | `_id, name, slug, owner_id, logo_url, created_at` |
| `org_members` | Org-level RBAC membership | `org_id(string), user_id(string), role, created_at, updated_at` |
| `project_members` | Project-level RBAC override | `project_id(string), user_id(string), role, created_at, updated_at` |
| `org_invitations` | Pending org invites | `org_id, user_id, email, role, invited_by, status(pending\|accepted\|declined), created_at, responded_at` |
| `roles` | Dynamic RBAC role definitions | `name, permissions[], description` |
| `projects` | Tenant-scoped monitored apps | `_id, name, org_id(ObjectId), api_key(unique idx), created_at, is_integrated, integrated_at, integration_reminder_sent, hail_mary_sent, user_id(legacy owner), integrations.openproject{base_url, api_key(encrypted), op_project_id}` |
| `errors` | Deduplicated error *groups*, one per fingerprint | `_id, project_id(ObjectId), fingerprint(idx w/ project_id), event_type, message, location{file,line,column}, screenshot_url, occurrences, first_seen, last_seen, is_ticket_generated, ticket_url, lastNotifiedAt, notifiedCount` |
| `events` | Raw individual occurrences, **TTL 30 days** | `_id, project_id, fingerprint, payload(full original event incl. request/response/breadcrumbs/screenshot), screenshot_url, created_at(TTL idx)` |
| `performance_metrics` | Raw perf telemetry, **TTL 90 days** | `_id, project_id, route, page_url, timestamp, created_at, metrics{...}, client{browser,screen}` |
| `alert_configs` | Per-project alert rules | `_id, projectId(ObjectId), channels.email{enabled, recipients[]}, triggers{newError, spike{enabled, threshold}}, cooldown(minutes)` |
| `alert_logs` | Alert delivery audit trail | `_id, projectId, fingerprint, type(NEW_ERROR\|SPIKE\|PENDING), detail, createdAt` |
| `pending_alerts` | Retry queue for failed email sends — **write-only, no drain job exists** | `_id, projectId, fingerprint, payload, recipients, retry_count, created_at` |
| `email_logs` | All outbound email audit log | `_id, recipient, subject, type(alert\|lifecycle), status(sent\|failed), error, content(html), timestamp` |
| `ai_insights` | Cache of Gemini AI outputs | `key, type(error_analysis\|project_summary\|global_overview\|performance_insights), content, generated_at` |
| `ai_usage_logs` | AI usage/credit audit trail | `user_id, org_id, project_id, type, model, prompt, response, timestamp` |

## Indexes (created at startup, `init_db`)

- `errors`: compound `(project_id, fingerprint)` — the core dedup lookup
- `events`: TTL index on `created_at`, expires after 30 days
- `projects`: unique index on `api_key`; plain index on `org_id`
- `performance_metrics`: compound `(project_id, route)`; TTL index on `created_at`, expires after 90 days

## Fingerprinting (the dedup key)

`app/utils/fingerprint.py::generate_fingerprint` — SHA-256 hash over:
```
event_type | status | normalized_endpoint | normalized_message | stack_signature | project_id
```
- `normalize_endpoint`: strips query string; replaces numeric path segments with `:id`, hex/UUID segments with `:uuid`.
- `normalize_message`: strips digits and quoted string literals, collapsing variable error messages into one signature.
- `stack_signature`: top 3 non-`node_modules` stack frames, with line/column numbers and bundler query hashes stripped, joined with `|`.

All events sharing a fingerprint roll up into a single `errors` document; raw per-occurrence detail is preserved separately in `events`.

## Type definitions used by the frontend (`bug-tracker/src/types/index.ts`)

```ts
Project { id, name, apiKey, createdAt, orgId, errorCount, lastSeen, my_project_role?, isIntegrated? }
Error { fingerprint, message?, stack?, occurrences, firstSeen, lastSeen, errorType?, location?{file,line?,column?}, request?{url,method,payload?}, response?{status,data?}, client?{url,browser}, payload? }
ErrorDetail extends Error { projectId, screenshot_url?, performance?, metadata?, breadcrumbs?[] }
User { id, name, email, image? }
Session { user: User, expires }
```

Note: actual API responses are snake_case (`_id`, `api_key`, `created_at`, `org_id`, `last_seen`, `event_type`, `my_permissions`, `my_role`); pages manually remap or just use untyped `any` for most fetched data (members, invitations, tickets, alert config, AI insights, admin stats/logs). These formal types are partial/aspirational relative to actual runtime shapes.
