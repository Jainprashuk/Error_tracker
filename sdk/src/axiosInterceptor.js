import { sendError } from "./sender.js";

export function setupAxiosInterceptor(axios) {

  axios.interceptors.response.use(

    (response) => response,

    (error) => {

      const payload = {
        timestamp: new Date().toISOString(),
        error_type: "api_error",
        request: {
          url: error.config?.url,
          method: error.config?.method,
          payload: error.config?.data
        },

        response: {
          status: error.response?.status,
          data: error.response?.data
        },

        error: {
          message: error.message,
          stack: error.stack
        }
      };

      sendError(payload);

      return Promise.reject(error);
    }
  );
}