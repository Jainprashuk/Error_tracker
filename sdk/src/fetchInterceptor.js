import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";
import { createBasePayload } from "./utils/normalizer.js";
import { sendPerformance } from "./sender.js";

export function setupFetchInterceptor(takeScreenshots = false, capturePerformance = false) {
  if (typeof window === "undefined" || window.fetch.__BUGTRACE_WRAPPED__) return;
  
  // 💡 MANDATORY FIX: Set flag IMMEDIATELY to prevent double wrapping during fast re-renders
  window.fetch.__BUGTRACE_WRAPPED__ = true;

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const input = args[0];
    const init = args[1] || {};

    const url = typeof input === "string" ? input : input?.url;
    const method = init?.method || "GET";

    // 🚫 Prevent infinite loop (self reporting)
    if (url && (url.includes("/report") || url.includes("/performance"))) {
      return originalFetch(...args);
    }

    const startTime = Date.now();

    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;

      // ⚡️ Send Performance Metrics if enabled
      if (capturePerformance) {
        sendPerformance({
          event_type: "performance",
          timestamp: new Date().toISOString(),
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          metrics: {
            apiRoute: url,
            apiMethod: method,
            apiStatus: response.status,
            apiDuration: duration
          }
        });
      }

      if (!response.ok) {
        let screenshot = null;
        if (takeScreenshots) {
          try {
            screenshot = await takeScreenshot();
          } catch (_) {}
        }

        const payload = createBasePayload({
          event_type: "api_error",
          error: {
            message: `Request failed with status ${response.status}`,
            type: "fetch_error",
          },
          request: { url, method, payload: init?.body || null },
          response: { status: response.status, data: null },
          screenshot,
        });

        sendError(payload);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (capturePerformance) {
        sendPerformance({
          event_type: "performance",
          timestamp: new Date().toISOString(),
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          metrics: {
            apiRoute: url,
            apiMethod: method,
            apiStatus: 0, // 0 for network failure
            apiDuration: duration
          }
        });
      }

      let screenshot = null;
      if (takeScreenshots) {
        try {
          screenshot = await takeScreenshot();
        } catch (_) {}
      }

      const payload = createBasePayload({
        event_type: "api_error",
        error: {
          message: error.message,
          stack: error.stack,
          type: "fetch_exception",
        },
        request: { url, method, payload: init?.body || null },
        response: null,
        screenshot,
      });

      sendError(payload);
      throw error;
    }
  };
}