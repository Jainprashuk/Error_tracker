import { initGlobalErrorTracking } from "./tracker.js";
import { setupAxiosInterceptor } from "./axiosInterceptor.js";
import { setupFetchInterceptor } from "./fetchInterceptor.js";
import { setConfig, sendError } from "./sender.js";
import { initPerformanceTracking } from "./performanceTracker.js";
import { initManualBugReporter } from "./manualBugReporter.js";
import { initBreadcrumbTracking, addBreadcrumb } from "./breadcrumbs.js";
import { createBasePayload } from "./utils/normalizer.js";

/**
 * YOUR ORIGINAL INIT STYLE
 */
export function initBugTracker(config = {}) {
  if (typeof window !== "undefined" && window.__BUGTRACE_INITIALIZED__) {
    return;
  }
  if (typeof window !== "undefined") {
    window.__BUGTRACE_INITIALIZED__ = true;
  }

  const defaultFeatures = {
    captureScreenshots: {
      fetchErrors: true,
      axiosErrors: true,
      consoleErrors: true,
    },
    capturePerformance: false,
    manualBugReport: null
  };

  const {
    apiKey,
    collectorUrl = "http://localhost:8000", 
    axios,
    features = {}
  } = config;

  const mergedFeatures = {
    ...defaultFeatures,
    ...features,

    captureScreenshots: {
      ...defaultFeatures.captureScreenshots,
      ...(features.captureScreenshots || {})
    }
  };

  setConfig({ apiKey, collectorUrl });

  /* ---------- BREADCRUMB TRACKING ---------- */
  initBreadcrumbTracking();

  /* ---------- ERROR TRACKING ---------- */
  initGlobalErrorTracking({
    project: config.project || true,
    takeScreenshots: mergedFeatures.captureScreenshots.consoleErrors
  });
  setupFetchInterceptor(
    mergedFeatures.captureScreenshots.fetchErrors,
    mergedFeatures.capturePerformance
  );

  if (axios) {
    setupAxiosInterceptor(
      axios,
      mergedFeatures.captureScreenshots.axiosErrors,
      mergedFeatures.capturePerformance
    );
  }

  /* ---------- PERFORMANCE TRACKING ---------- */
  if (mergedFeatures.capturePerformance) {
    initPerformanceTracking();
  }

  /* ---------- MANUAL BUG REPORT ---------- */
  if (mergedFeatures.manualBugReport) {
    initManualBugReporter(mergedFeatures.manualBugReport);
  }
}

/**
 * Adding a helper to manually send errors (staying with your flat function style)
 */
export function captureError(error, metadata = {}) {
  const payload = createBasePayload({
    event_type: metadata.type || "manual",
    error: {
      message: error.message || error,
      stack: error.stack || null,
      type: error.name || "Error"
    },
    metadata: metadata
  });

  sendError(payload);
}