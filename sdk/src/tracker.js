/**
 * Global error tracking module.
 * Captures uncaught JavaScript errors AND unhandled promise rejections,
 * then sends them to the collector.
 */

import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";
import { createBasePayload } from "./utils/normalizer.js";

export function initGlobalErrorTracking(options = {}) {
  if (typeof window === "undefined") return;

  const maybeScreenshot = async () => {
    if (!options.takeScreenshots) return null;
    try {
      return await takeScreenshot();
    } catch (_) {
      return null;
    }
  };

  // --- Uncaught exceptions ---------------------------------------------------
  // Chain to any pre-existing handler instead of silently replacing it, so a
  // host app's own window.onerror keeps working.
  const previousOnError = window.onerror;

  window.onerror = function (message, source, lineno, colno, error) {
    (async () => {
      const screenshot = await maybeScreenshot();
      const payload = createBasePayload({
        event_type: "unhandled_exception",
        error: {
          message: (error && error.message) || message,
          stack: error && error.stack ? error.stack : null,
          type: (error && error.name) || "Error"
        },
        screenshot
      });
      sendError(payload);
    })();

    if (typeof previousOnError === "function") {
      return previousOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // --- Unhandled promise rejections ------------------------------------------
  window.addEventListener("unhandledrejection", async (event) => {
    const reason = event ? event.reason : undefined;
    const isErr = reason instanceof Error;
    const screenshot = await maybeScreenshot();

    const payload = createBasePayload({
      event_type: "unhandled_rejection",
      error: {
        message: isErr
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
        stack: isErr ? reason.stack : null,
        type: isErr ? reason.name : "UnhandledRejection"
      },
      screenshot
    });

    sendError(payload);
  });
}
