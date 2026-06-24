# Feature List

Organized by user-facing capability.

## Error tracking
- Automatic capture of unhandled JS exceptions, failed `fetch`/`axios` calls, and manual reports via the SDK.
- Deduplication/grouping of repeat occurrences into a single "error" via fingerprinting (event type + endpoint + message + stack signature).
- Per-error: occurrence count, first/last seen, stack trace viewer, request/response payloads, client info (browser/screen), breadcrumb trail (clicks + navigation leading up to the error), optional screenshot.
- Manual bug reporting: a floating, customizable feedback widget (configurable form schema) embeddable in any app via the SDK, or programmatic `captureError()`.

## Performance monitoring
- Page-load Web Vitals (page load time, DOM content loaded, first paint, first contentful paint, TTFB, DNS/TCP timings) captured automatically on `window.load`.
- Per-API-call latency/status tracking via the fetch/axios interceptors.
- Dashboard charts: per-route averages/p75, per-API endpoint averages/p75 + success rate, over selectable time ranges (24h/7d/30d/90d).

## Alerting
- Per-project email alert rules: trigger on first-ever sighting of a new error signature, or on a spike (N new occurrences since last notification).
- Configurable cooldown (minutes) to prevent alert spam per fingerprint.
- Alert delivery audit log (`alert_logs`) and a "Live Alert Center" widget on the dashboard.
- Email-only today (the config schema is structured to allow more channels, but only `email` is implemented).

## AI intelligence (Gemini-powered)
- Root-cause analysis per error (multimodal — uses the screenshot if available), returns `{problem, solution}`.
- Project health summary (3-sentence SRE-style report).
- Org-wide executive overview, highlighting the worst-performing project.
- Performance optimization suggestions per project.
- All four are cached (configurable TTL, default 24h) and usage-logged for audit (no spend/credit limiting enforced — visibility only).

## Issue → Ticket workflow
- Optional per-project OpenProject integration (base URL + API key, encrypted at rest).
- One-click "Generate Ticket" from an error, building a rich Markdown ticket (summary, client info, metadata, full payload, screenshot link).
- Cross-project Tickets page listing every ticket generated across the org.

## Organizations, teams & permissions
- Multi-tenant orgs, auto-created on first login.
- Email-based invite flow (invitee must already have an account) with accept/decline.
- Dynamic, editable roles (`admin`/`dev`/`viewer` by default) with a granular permission-string system.
- Org-level role plus optional per-project role override — lets a `viewer` be elevated to `admin` on one specific project without org-wide elevation, or vice versa.
- SuperAdmin console (hardcoded email allowlist) for platform-wide visibility: global stats, all orgs/projects/users, AI usage audit, email send audit (with rendered HTML preview), and a live role/permission designer.

## Lifecycle / onboarding emails
- Welcome email on first signup.
- 2-hour "integrate the SDK" reminder if a project has received no traffic yet.
- 72-hour "hail mary" final nudge if still not integrated.
- One-shot flags ensure each email fires at most once per project/user.

## Dashboard UX
- Org switcher, project cards with integration-status indicator and copyable API key.
- Aggregate stats (total errors, active projects, errors in last 24h).
- Recharts-based visualizations for error volume and performance trends.
- Live backend health indicator (polled every 60s).
- The dashboard dogfoods its own SDK — it is itself instrumented and reports its own errors.

## SDK capabilities (customer-installed)
See [05-sdk-reference.md](./05-sdk-reference.md) for full detail. Summary: one-line init, automatic capture of unhandled exceptions / failed network calls, opt-in performance tracking, opt-in screenshot capture, breadcrumb trail (always on), manual error reporting API, customizable feedback widget, client-side batching with offline retry for errors (not for performance pings).
