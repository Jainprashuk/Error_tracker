# SDK Reference — `bug-tracker-sdk`

npm package `bug-tracker-sdk` (currently v1.0.21), installed by customers into *their own* web apps to report errors/performance back to the collector. Vanilla JS, one runtime dependency (`html2canvas`), built with `tsup` (dual ESM/CJS).

> **Caveat**: `dist/index.d.ts` / `dist/index.d.cts` currently contain bundled JS, not real type declarations (a build defect in the `tsup --dts` step) — don't advertise full TypeScript support without fixing this.

## Public API

Only two named exports from `bug-tracker-sdk`:

```js
import { initBugTracker, captureError } from "bug-tracker-sdk";
```

### `initBugTracker(config)`

Idempotent (subsequent calls no-op via a `window.__BUGTRACE_INITIALIZED__` guard) and SSR-safe (no-ops if `window` is undefined). Call once, as early as possible in app bootstrap.

```js
initBugTracker({
  apiKey: "proj_xxxxxxxxxxxx",       // required — project API key from the dashboard
  collectorUrl: "https://bugtracker.jainprashuk.in", // optional, default shown
  axios: axiosInstance,               // optional — pass your app's axios instance to enable axios interceptor
  features: {
    captureScreenshots: {
      fetchErrors: true,    // default true
      axiosErrors: true,    // default true
      consoleErrors: true,  // default true
    },
    capturePerformance: false,  // default false
    manualBugReport: null,      // default disabled; set an object to enable the floating widget
  },
});
```

### `captureError(error, metadata = {})`

Manual reporting from app code (e.g. inside a `catch` block):

```js
try {
  doSomethingRisky();
} catch (err) {
  captureError(err, { tags: ["checkout"], user: currentUser.id });
}
```
- `error`: an `Error` object (or anything with `.message`/`.stack`/`.name`).
- `metadata`: arbitrary object merged into the payload's `metadata`; `metadata.type` can override `event_type` (defaults to `"manual"`).
- Sent immediately, batched/queued like everything else.

## Auto-capture features

| Feature | Mechanism | Notes |
|---|---|---|
| Global JS errors | Overwrites `window.onerror` (does **not** chain to a pre-existing handler) | `event_type: "unhandled_exception"` |
| Unhandled promise rejections | **Not implemented** | No `unhandledrejection` listener exists despite README/playground implying otherwise — known gap |
| `fetch` failures | Monkey-patches `window.fetch`; skips URLs containing `/report` or `/performance` to avoid self-loops | Non-OK response → `event_type:"api_error", error.type:"fetch_error"`; thrown/network exception → `error.type:"fetch_exception"` (re-throws after capturing) |
| `axios` failures | Only installed if an axios instance is passed into `initBugTracker({ axios })` | `event_type:"api_error", error.type:"axios"`; rejects normally after capturing (doesn't swallow) |
| Breadcrumbs | Always on, not feature-gated. Ring buffer, max 50 entries | Tracks UI clicks (filtered to meaningful elements) and SPA navigation (patches `history.pushState` + `popstate`) |
| Performance (page load) | `window.load` listener, reads Navigation Timing + Paint Timing APIs | Only if `features.capturePerformance: true` |
| Performance (per request) | Emitted from both fetch and axios interceptors | Same flag as above |

## Manual bug-report widget

Set `features.manualBugReport` to enable a floating feedback button (Shadow-DOM isolated, so host page CSS can't break it):

```js
manualBugReport: {
  captureScreenshot: true,
  floatingButton: () => myCustomButtonElement, // optional, replaces the default "🐞 Report Bug" button
  modalSchema: {
    title: "Report an Issue",
    fields: [
      { name: "title", type: "text", label: "Issue Summary" },
      { name: "description", type: "textarea", label: "What happened?" },
      { name: "priority", type: "select", label: "Severity", options: ["Low", "Medium", "High"] },
    ],
  },
}
```
Field `type` supports: `text`, `textarea`, `select`, `radio`, `checkbox` (the latter three take an `options: string[]`). On submit, builds `event_type:"manual", error.type:"user_report"` with all form fields in `metadata`, optionally with a screenshot.

## Screenshot capture (`takeScreenshot()`, internal)

Uses `html2canvas` against `document.body`; downscales if viewport width > 1280px; exports as JPEG at 60% quality (base64 data URI), fails silently (returns `null`) on error. Triggered by: global error handler (if `consoleErrors`), fetch/axios interceptor errors (if their respective flags), and the manual report modal (if `captureScreenshot: true`). Can be expensive on large/complex DOMs — disable unused screenshot flags on high-traffic apps.

## Data transmission

Two independent in-memory queues (module-level singletons), both batching at **max 10 events or every 5000ms**, whichever comes first:

- **Errors** → `POST {collectorUrl}/report`, headers `Content-Type: application/json`, `x-api-key`. Client-side dedup: identical `${message}-${stack}` within a 5s cooldown is dropped (console-warned, not sent). On batch failure, persists up to the last 50 entries to `localStorage["bugtrace_retry_queue"]`, retried with jitter (1-5s) on the next page load's `initBugTracker` call.
- **Performance** → `POST {collectorUrl}/report/performance`, same headers/batch size, separate queue/timer. Uses `fetch(..., {keepalive:true})` so pings survive page unload. **No retry/offline persistence** for performance data — failures are just dropped.

## Payload shapes

**Error envelope** (`createBasePayload`, used by interceptors/manual reporter/`captureError`):
```js
{
  event_type: "api_error" | "manual" | "unhandled_exception" | "performance" | ...,
  timestamp: "<ISO8601>",
  error: { message, stack, type },
  request: { url, method, payload },
  response: { status, data },
  client: { url, browser, screen },   // location.href, navigator.userAgent, "{w}x{h}"
  metadata: {},
  screenshot: "<base64 jpeg>" | null,
  breadcrumbs: [ ... ],                // auto-attached from the 50-entry ring buffer
}
```
> Caveat: the raw `window.onerror` global handler builds its own smaller ad-hoc object (`{project, timestamp, event_type:"unhandled_exception", error:{message,stack}, client:{url,browser}, screenshot}`) — missing `request`/`response`/`metadata`. Not every error payload has the full envelope shape.

**Performance payload — page load:**
```js
{ event_type: "performance", timestamp, route, page_url, client,
  metrics: { pageLoadTime, domContentLoaded, firstPaint, firstContentfulPaint, ttfb, dnsLookupTime, tcpConnectionTime, requestTime } }
```

**Performance payload — per API call** (from interceptors):
```js
{ event_type: "performance", timestamp, route,
  metrics: { apiRoute, apiMethod, apiStatus, apiDuration } }
```

## Canonical integration example (from `playground/src/App.jsx`)

```js
import { initBugTracker, captureError } from 'bug-tracker-sdk';

initBugTracker({
  apiKey: "proj_xxxxxxxxxxxx",
  collectorUrl: "http://localhost:8000",   // omit/leave default in production
  features: {
    captureScreenshots: { fetchErrors: true, axiosErrors: true, consoleErrors: true },
    capturePerformance: true,
    manualBugReport: {
      captureScreenshot: true,
      modalSchema: {
        title: "Got a bug? Let us know!",
        fields: [
          { name: "title", type: "text", label: "Issue Summary" },
          { name: "description", type: "textarea", label: "What happened?" },
          { name: "priority", type: "select", label: "How bad is it?", options: ["Low", "Medium", "High"] },
        ],
      },
    },
  },
});
```
Call this once at module scope, before your app mounts. The playground app (`playground/`) is a runnable demo with buttons that exercise every capture path (unhandled exception, reference error, failed fetch, manual capture, etc.) — use it as a local test harness when developing against the SDK.
