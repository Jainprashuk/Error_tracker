import { sendError } from "./sender.js";
import { takeScreenshot } from "./takeScreenshot.js";
import { createBasePayload } from "./utils/normalizer.js";

export function setupAxiosInterceptor(axios , takeScreenshots = false) {

  axios.interceptors.response.use(

    (response) => response,

    async (error) => {

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