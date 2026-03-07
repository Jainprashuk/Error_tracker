import { sendError } from "./sender.js";

export function setupFetchInterceptor() {

  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {

    const url = args[0];

    try {

      const response = await originalFetch(...args);

      if (!response.ok) {

        sendError({
          timestamp: new Date().toISOString(),
          error_type: "api_error",
          request: {
            url,
            method: "fetch"
          },
          response: {
            status: response.status
          }
        });

      }

      return response;

    } catch (error) {

      sendError({
        timestamp: new Date().toISOString(),
        request: {
          url,
          method: "fetch"
        },
        error: {
          message: error.message,
          stack: error.stack
        }
      });

      throw error;
    }
  };
}