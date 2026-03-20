import { initGlobalErrorTracking } from "./tracker.js";
import { setupAxiosInterceptor } from "./axiosInterceptor.js";
import { setupFetchInterceptor } from "./fetchInterceptor.js";
import { setConfig } from "./sender.js";
import { initPerformanceTracking } from "./performanceTracker.js";
import { initManualBugReporter } from "./manualBugReporter.js";

export function initBugTracker(config = {}) {

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
    collectorUrl = "https://bugtracker.jainprashuk.in",
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

  /* ---------- ERROR TRACKING ---------- */

  initGlobalErrorTracking(
    mergedFeatures.captureScreenshots.consoleErrors
  );

  setupFetchInterceptor(
    mergedFeatures.captureScreenshots.fetchErrors
  );

  if (axios) {
    setupAxiosInterceptor(
      axios,
      mergedFeatures.captureScreenshots.axiosErrors
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