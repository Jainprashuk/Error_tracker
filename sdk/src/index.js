import { initGlobalErrorTracking } from "./tracker.js";
import { setupAxiosInterceptor } from "./axiosInterceptor.js";
import { setupFetchInterceptor } from "./fetchInterceptor.js";
import { setConfig } from "./sender.js";

export function initBugTracker(config) {

  const {
    apiKey,
    collectorUrl = "https://bugtracker.jainprashuk.in",
    axios
  } = config;

  setConfig({ apiKey, collectorUrl });

  initGlobalErrorTracking();

  setupFetchInterceptor();

  if (axios) {
    setupAxiosInterceptor(axios);
  }
}