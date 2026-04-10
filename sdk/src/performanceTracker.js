import { sendPerformance } from "./sender.js";

/**
 * Captures page-load performance metrics and sends them to the
 * dedicated /report/performance endpoint.
 *
 * Uses the Navigation Timing API + Paint Timing API.
 * Includes the current route (pathname) so the backend can group
 * metrics per-route inside a project.
 */
export function initPerformanceTracking() {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    // Defer until after the browser has painted
    setTimeout(() => {
      const perf = performance.getEntriesByType("navigation")[0];
      const paintEntries = performance.getEntriesByType("paint");

      let firstPaint = null;
      let firstContentfulPaint = null;

      paintEntries.forEach((entry) => {
        if (entry.name === "first-paint") firstPaint = entry.startTime;
        if (entry.name === "first-contentful-paint")
          firstContentfulPaint = entry.startTime;
      });

      const pageLoadTime = perf
        ? Math.round(perf.loadEventEnd - perf.startTime)
        : null;
      const domContentLoaded = perf
        ? Math.round(perf.domContentLoadedEventEnd - perf.startTime)
        : null;
      const ttfb = perf
        ? Math.round(perf.responseStart - perf.startTime)
        : null;
      const dnsLookupTime = perf
        ? Math.round(perf.domainLookupEnd - perf.domainLookupStart)
        : null;
      const tcpConnectionTime = perf
        ? Math.round(perf.connectEnd - perf.connectStart)
        : null;
      const requestTime = perf
        ? Math.round(perf.responseEnd - perf.requestStart)
        : null;

      const payload = {
        event_type: "performance",
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
        page_url: window.location.href,
        client: {
          browser: navigator?.userAgent,
          screen:
            typeof window !== "undefined"
              ? `${window.innerWidth}x${window.innerHeight}`
              : null,
        },
        metrics: {
          pageLoadTime,
          domContentLoaded,
          firstPaint: firstPaint ? Math.round(firstPaint) : null,
          firstContentfulPaint: firstContentfulPaint
            ? Math.round(firstContentfulPaint)
            : null,
          ttfb,
          dnsLookupTime,
          tcpConnectionTime,
          requestTime,
        },
      };

      sendPerformance(payload);
    }, 0);
  });
}