# Organizations, Projects & Permissions

## Hierarchy

```
Organization
  └── Project (one per monitored app, has its own api_key)
        └── Error groups → Events (raw occurrences)
        └── Performance metrics
        └── Alert config / Alert logs
```

A user can belong to multiple organizations (`org_members`), and within an org can have a different effective role per project (`project_members` override).

## Roles

Dynamic, stored in MongoDB (`roles` collection), with a 60-second in-process cache. Defaults seeded automatically if missing:

| Role | Permissions |
|---|---|
| `admin` | `*` (everything) |
| `dev` | `ORG_VIEW`, `PROJECT_VIEW`, `PROJECT_CREATE`, `ERROR_VIEW`, `ERROR_RESOLVE`, `PERFORMANCE_VIEW`, `API_KEY_VIEW`, `INTEGRATIONS_MANAGE` |
| `viewer` | `ORG_VIEW`, `PROJECT_VIEW`, `ERROR_VIEW`, `PERFORMANCE_VIEW` |

> Note: `admin_routes.py`'s seed list for `dev` is a slightly different/older subset (missing `PERFORMANCE_VIEW`/`API_KEY_VIEW`) than the one in `org_middleware.py` — an inconsistency, not an intentional two-tier design. See [08-known-issues.md](./08-known-issues.md).

A SuperAdmin (`/superadmin` page, `/admin/*` routes) can edit role→permission mappings live via the Global Role Designer UI / `POST /admin/roles`.

## Permission catalog

All permission strings observed in route/UI code (documented client-side in `SuperAdminPage.tsx`'s `PERMISSION_GUIDE`):

| Permission | Meaning |
|---|---|
| `*` | All permissions (admin only) |
| `ORG_VIEW` | View organization details/members |
| `ORG_MANAGE` | Invite members, manage org settings |
| `PROJECT_VIEW` | View projects and their data |
| `PROJECT_CREATE` | Create new projects |
| `PROJECT_EDIT` | Rename/edit a project |
| `PROJECT_DELETE` | Delete a project |
| `TEAM_MANAGE` | Assign/remove project-level member roles |
| `MEMBER_REMOVE` | Remove a member from the org |
| `ROLE_CHANGE` | Change another member's org role |
| `ERROR_VIEW` | View error groups/details |
| `ERROR_RESOLVE` | Resolve/dismiss errors |
| `PERFORMANCE_VIEW` | View performance/web-vitals data |
| `ALERT_VIEW` | View alert configuration & logs |
| `ALERT_MANAGE` | Edit alert configuration |
| `TICKET_CREATE` | Generate an OpenProject ticket from an error |
| `TICKET_VIEW` | View generated tickets |
| `API_KEY_VIEW` | See a project's unmasked API key |
| `INTEGRATIONS_MANAGE` | Configure third-party integrations (OpenProject) |
| `ADMIN` | Gate for org-wide AI overview etc. |

## Authorization resolution order (server-side)

Implemented in `collector/app/middleware/org_middleware.py`, dependency factory `verify_org_membership(required_permission=None, allowed_roles=None)`:

1. Requires JWT (`verify_token`) + `x-org-id` header (validated as a 24-char ObjectId string).
2. Loads the user's **org-level role** from `org_members` for `(org_id, user_id)`. 403 ("Not a member of this organization") if no row exists. Missing `role` field defaults to `viewer`.
3. If a `project_id` is also supplied and the org role isn't `admin`, looks up a **project-level override role** from `project_members` for `(project_id, user_id)` — this overrides the org role for that specific project only.
4. `required_permission` (if given) is checked against the resolved role's permission list, `*` matches anything. 403 ("Missing capability: {perm}") on failure.
5. Legacy `allowed_roles` list checks (still used by several routes) — role must be in the list, **unless** role is `admin` (admin always bypasses role-list checks).
6. Returns the membership dict (`effective_role` injected) to the route handler.

**SuperAdmin is a separate, parallel system** — not part of org RBAC at all. `verify_superadmin` in `admin_routes.py` checks the JWT's email against a hardcoded list (`SUPER_ADMIN_EMAILS = ["29jainprashuk@gmail.com"]`). It bypasses org/project scoping entirely and can read/write any org's data via `/admin/*`.

## Organization & project lifecycle

- **First login**: `POST /auth/clerk-sync` auto-creates an org named `"{name}'s Org"` and makes the new user its `admin`. There is no flow today for a brand-new user to join an *existing* org by email-invite-to-signup — invites require the invitee already have an account (looked up by email).
- **Creating an org**: `POST /orgs/` — any authenticated user, becomes `admin` of the new org.
- **Inviting to an org**: `POST /members/org` (requires `ORG_MANAGE`) creates a pending `org_invitations` row; the invitee sees it via `GET /members/invitations` and accepts/declines via `POST /members/invitations/{id}/respond`.
- **Creating a project**: `POST /projects` (requires `PROJECT_CREATE`) — scoped to the org in `x-org-id`; generates an `api_key` (`proj_` + 24 hex chars); creator is auto-added as that project's `admin` in `project_members`.
- **Assigning a project role**: `POST /members/project` (requires `TEAM_MANAGE`) — target user must already be an org member; this is how a `viewer`/`dev` org member gets elevated/limited access to one specific project (org `admin`s implicitly have full access to every project and don't need an explicit row — UI shows them as immutable "ORG ADMIN").
- **Removing a member**: `DELETE /members/org/{user_id}` (requires `MEMBER_REMOVE`) cascades to remove that user from all `project_members` rows in that org too. Self-removal is blocked.

## Frontend enforcement (UI-side, defense in depth only — server is authoritative)

The dashboard reads `my_role` and `my_permissions` (array, from `GET /orgs/`) plus per-project `my_project_role` (from `GET /projects`) and gates buttons/sections accordingly:

- `ProjectPage.tsx`: delete/edit buttons gated on `PROJECT_DELETE`/`PROJECT_EDIT`; "Generate ticket" gated on `userRole === 'admin' && TICKET_CREATE`.
- `SettingsPage.tsx`: OpenProject integration form disabled without `INTEGRATIONS_MANAGE`; alert section view/edit gated on `ALERT_VIEW`/`ALERT_MANAGE`.
- `MembersPage.tsx` / `ProjectTeamModal.tsx`: role-change/remove controls only shown to org `admin`s.
- `Sidebar.tsx`: the "Super Admin" nav link is shown only if `user.email === '29jainprashuk@gmail.com'` — a hardcoded check, **not** wired to any permission. The `/superadmin` route itself has no route-level guard in the React Router config; true protection is enforced only because the `/admin/*` backend endpoints it calls re-check the email allowlist server-side.

## Data scoping / multi-tenancy notes

- Every project-bearing collection (`errors`, `events`, `performance_metrics`, `alert_configs`, `alert_logs`) is implicitly scoped by `project_id`, and projects are scoped by `org_id`. There is no cross-org leakage path in normal dashboard routes — only the SuperAdmin routes intentionally cross org boundaries.
- **Data-model wart**: `org_id`/`user_id`/`project_id` are stored as **strings** in membership collections (`org_members`, `project_members`, `org_invitations`) but as **ObjectId** in `projects.org_id`. Code converts at each call site carefully, but this inconsistency is worth knowing about if writing new queries directly against MongoDB.
