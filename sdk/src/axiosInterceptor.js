/**
 * Axios HTTP client interceptor module.
 * Monitors Axios HTTP requests and captures errors.
 */

import { sendError } from "./sender.js";

/**
 * Setup error interception for Axios HTTP client.
 * 
 * This intercepts all Axios HTTP requests and captures any errors that occur.
 * When an HTTP request fails, it sends detailed error information to the collector.
 * 
 * @param {Object} axios - The Axios instance to intercept
 * @param {string} project - Name of the project
 * 
 * How it works:
 * 1. Register a response interceptor on the Axios instance
 * 2. If response is successful, pass it through unchanged
 * 3. If response fails (error), capture error details and send to collector
 * 4. Include request info (URL, method, payload) and response info (status, data)
 * 5. Re-throw the error so the app can handle it normally
 * 
 * @example
 * import axios from 'axios';
 * import { setupAxiosInterceptor } from 'bug-tracker-sdk';
 * 
 * setupAxiosInterceptor(axios, 'my-app');
 * // Now all Axios errors will be automatically tracked
 */
export function setupAxiosInterceptor(axios, project) {

  // Register an interceptor on Axios response handler
  axios.interceptors.response.use(
    // Success case - response is successful (status 2xx)
    res => res,  // Just pass the response through unchanged
    
    // Error case - response failed (status 4xx, 5xx, or network error)
    error => {

      // Build detailed error payload with request and response information
      const payload = {
        // Project identifier
        project: project,
        // Timestamp of when error occurred
        timestamp: new Date().toISOString(),

        // HTTP request details (what we tried to send)
        request: {
          url: error.config?.url,  // URL of the request
          method: error.config?.method,  // HTTP method (GET, POST, etc.)
          payload: error.config?.data  // Request body/payload
        },

        // HTTP response details (what we got back)
        response: {
          status: error.response?.status,  // HTTP status code (404, 500, etc.)
          data: error.response?.data  // Response body/error message from server
        },

        // Error details
        error: {
          message: error.message,  // Error message
          stack: error.stack  // Stack trace
        }
      };

      // Send the error to the collector service
      sendError(payload);

      // Re-throw the error so the application can catch and handle it
      return Promise.reject(error);
    }
  );

}