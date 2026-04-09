import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";
import { createBasePayload } from "./utils/normalizer.js";

export function setupFetchInterceptor(takeScreenshots = false) {
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
    if (url && url.includes("/report")) {
      return originalFetch(...args);
    }

    try {
      const response = await originalFetch(...args);

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