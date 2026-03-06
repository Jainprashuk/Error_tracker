/**
 * Fetch API interceptor module.
 * Monitors native Fetch API calls and captures network errors.
 */

import { sendError } from "./sender.js";

/**
 * Setup error interception for native Fetch API.
 * 
 * This module replaces the native window.fetch() with a wrapped version
 * that captures HTTP errors and network failures.
 * 
 * Errors captured:
 * 1. Network errors (failed connections, timeouts, etc.)
 * 2. Non-2xx HTTP response codes (4xx, 5xx errors)
 * 
 * @param {string} project - Name of the project
 * 
 * How it works:
 * 1. Save reference to original fetch function
 * 2. Replace window.fetch with a wrapper function
 * 3. Wrapper tries to make the original fetch call
 * 4. If successful but response is not OK (status >= 400), send error to collector
 * 5. If network error occurs, catch it and send error to collector
 * 6. Always return response or re-throw error so app can handle it normally
 * 
 * @example
 * // Automatically called by initBugTracker()
 * // Tracks all fetch() calls without any additional code needed
 */
export function setupFetchInterceptor(project) {

  // Check if we're in a browser environment (window object exists)
  if (typeof window === "undefined") {
    return;
  }

  // Store reference to the original native fetch function
  // We need this to make actual fetch calls
  const originalFetch = window.fetch;

  // Replace the global fetch with our wrapped version
  window.fetch = async (...args) => {

    // Extract the URL from fetch arguments (first argument)
    const url = args[0];

    try {

      // Make the actual fetch request using the original function
      const response = await originalFetch(...args);

      // Check if the response is not OK (status code 4xx, 5xx, etc.)
      // response.ok is false when status is >= 400
      if (!response.ok) {

        // Build error payload for HTTP error responses
        const payload = {
          project: project,
          timestamp: new Date().toISOString(),

          // Request information
          request: {
            url: url,  // URL being fetched
            method: "fetch"  // Indicates this is from Fetch API
          },

          // Response information
          response: {
            status: response.status  // HTTP status code (404, 500, etc.)
          },

          // Error details
          error: {
            message: "Fetch API Error"  // Generic message for HTTP errors
          }
        };

        // Send the error to the collector service
        sendError(payload);

      }

      // Return the response so the app can use it (even if it's an error response)
      return response;

    } catch (err) {

      // Network error occurred (connection failed, timeout, etc.)
      const payload = {
        project: project,
        timestamp: new Date().toISOString(),

        // Request information
        request: {
          url: url,
          method: "fetch"
        },

        // Error details from the caught exception
        error: {
          message: err.message,  // Error message (e.g., "Network request failed")
          stack: err.stack  // Stack trace
        }
      };

      // Send the network error to the collector service
      sendError(payload);

      // Re-throw the error so the application can catch and handle it
      throw err;

    }

  };

}