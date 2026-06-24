# BugTrace — Project Overview

BugTrace is a self-hosted, multi-tenant **error tracking & monitoring SaaS** (a lightweight Sentry-style alternative), composed of four parts in this monorepo:

| Folder | What it is | Stack |
|---|---|---|
| `collector/` | Backend API: ingests errors/performance data from the SDK, serves the dashboard, runs background jobs, AI analysis, alerting, ticketing | Python, FastAPI, MongoDB (Motor/PyMongo), APScheduler |
| `bug-tracker/` | Customer-facing dashboard web app | React 19 + TypeScript, Vite, Zustand, Clerk, Tailwind |
| `sdk/` | NPM package (`bug-tracker-sdk`) that customers install in *their own* web apps to report errors back to the collector | Vanilla JS, html2canvas, tsup build |
| `playground/` | Demo app used to manually exercise/test the SDK against a local collector | React + Vite |

## High-level data flow

```
Customer's web app (instrumented with bug-tracker-sdk)
   │  window.onerror / fetch & axios interceptors / manual reports / perf timing
   ▼
POST /report, /report/performance   (auth: x-api-key, per-project)
   ▼
collector (FastAPI)
   ├── fingerprints + dedups error → "errors" collection (grouped) + "events" (raw, 30d TTL)
   ├── evaluates alert rules → emails via Resend, logs to alert_logs/email_logs
   ├── (on demand) Gemini AI root-cause analysis / summaries
   └── (on demand) creates OpenProject tickets from errors
   ▼
bug-tracker dashboard (React, Clerk-authenticated)
   - org/project switcher, issue list, error detail, performance charts,
     team & permission management, alerts/integrations settings, superadmin console
```

## Identity & tenancy model (one-paragraph version)

End users authenticate via **Clerk** in the dashboard. On first login, the collector auto-provisions an **Organization** and makes that user its `admin`. Every dashboard request carries a backend-issued JWT (`Authorization: Bearer`) *and* an `x-org-id` header identifying which org's data to scope to. Inside an org, **Projects** (one per monitored app) get their own `api_key` used by the SDK for ingestion — no JWT is needed for ingestion. Roles cascade: org-level role (`admin`/`dev`/`viewer`) is the default, optionally overridden per-project via `project_members`. See [03-permissions-and-orgs.md](./03-permissions-and-orgs.md).

## Where to look next

- [01-system-design.md](./01-system-design.md) — architecture, deployment, tech stack, background jobs
- [02-api-reference.md](./02-api-reference.md) — every collector endpoint
- [03-permissions-and-orgs.md](./03-permissions-and-orgs.md) — org/project/role model in full
- [04-data-model.md](./04-data-model.md) — MongoDB collections & ER relationships
- [05-sdk-reference.md](./05-sdk-reference.md) — `bug-tracker-sdk` public API & payload shapes
- [06-frontend-architecture.md](./06-frontend-architecture.md) — dashboard app structure
- [07-features.md](./07-features.md) — full feature list, organized by user-facing capability
- [08-known-issues.md](./08-known-issues.md) — bugs, inconsistencies, and tech debt discovered while documenting

## Generated context

This documentation set was generated on 2026-06-24 by reading the full source of `collector/`, `bug-tracker/`, `sdk/`, and `playground/`. It reflects the state of the code at that point in time (latest commits: `fc8874d`, `ee691a6`, `681016f`). Re-derive from source rather than trusting this snapshot if significant time has passed or these areas have since changed.
