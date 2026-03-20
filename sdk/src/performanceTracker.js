import { sendError } from "./sender.js";
import { createBasePayload } from "./utils/normalizer.js";

export function initPerformanceTracking() {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    setTimeout(() => {
      const perf = performance.getEntriesByType("navigation")[0];

      const paintEntries = performance.getEntriesByType("paint");

      let firstPaint = null;
      let firstContentfulPaint = null;

      paintEntries.forEach((entry) => {
        if (entry.name === "first-paint") {
          firstPaint = entry.startTime;
        }

        if (entry.name === "first-contentful-paint") {
          firstContentfulPaint = entry.startTime;
        }
      });

      // ✅ FIX: define these
      const pageLoadTime = perf?.loadEventEnd - perf?.startTime;
      const domContentLoaded =
        perf?.domContentLoadedEventEnd - perf?.startTime;

      const payload = createBasePayload({
        event_type: "performance",

        performance: {
          pageLoadTime,
          domContentLoaded,
          firstPaint,
          firstContentfulPaint,
        },
      });

      sendError(payload);
    }, 0);
  });
}