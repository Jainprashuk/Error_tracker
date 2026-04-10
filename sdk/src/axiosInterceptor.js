import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";
import { createBasePayload } from "./utils/normalizer.js";
import { sendPerformance } from "./sender.js";

export function setupAxiosInterceptor(axios, takeScreenshots = false, capturePerformance = false) {

  axios.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    return config;
  });

  axios.interceptors.response.use(
    (response) => {
      if (capturePerformance && response.config?.metadata?.startTime) {
        const duration = Date.now() - response.config.metadata.startTime;
        sendPerformance({
          event_type: "performance",
          timestamp: new Date().toISOString(),
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          metrics: {
            apiRoute: response.config.url,
            apiMethod: response.config.method?.toUpperCase(),
            apiStatus: response.status,
            apiDuration: duration
          }
        });
      }
      return response;
    },
    async (error) => {
      if (capturePerformance && error.config?.metadata?.startTime) {
        const duration = Date.now() - error.config.metadata.startTime;
        sendPerformance({
          event_type: "performance",
          timestamp: new Date().toISOString(),
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          metrics: {
            apiRoute: error.config.url,
            apiMethod: error.config.method?.toUpperCase(),
            apiStatus: error.response?.status || 0,
            apiDuration: duration
          }
        });
      }

      let screenshot = null;
      if(takeScreenshots){
        screenshot = await takeScreenshot();
      }

      const payload = createBasePayload({
  event_type: "api_error",

  error: {
    message: error.message,
    stack: error.stack,
    type: "axios"
  },

  request: {
    url: error.config?.url,
    method: error.config?.method,
    payload: error.config?.data
  },

  response: {
    status: error.response?.status,
    data: error.response?.data
  },

  screenshot
});

      sendError(payload);

      return Promise.reject(error);
    }
  );
}