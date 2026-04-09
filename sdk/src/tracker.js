/**
 * Global error tracking module.
 * Captures uncaught JavaScript errors and sends them to the collector.
 */

import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";

export function initGlobalErrorTracking(options = {}) {
  if (typeof window === "undefined") return;

  window.onerror = async function(message, source, lineno, colno, error) {
    let screenshot = null;
    
    if (options.takeScreenshots) {
      try {
        screenshot = await takeScreenshot();
      } catch (_) {}
    }

    const payload = {
      project: options.project || true,
      timestamp: new Date().toISOString(),
      event_type: "unhandled_exception",
      error: {
        message: message,
        stack: error?.stack
      },
      client: {
        url: window.location?.href,
        browser: navigator?.userAgent
      },
      screenshot
    };

    sendError(payload);
  };
}