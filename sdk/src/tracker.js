/**
 * Global error tracking module.
 * Captures uncaught JavaScript errors and sends them to the collector.
 */

import { sendError } from "./sender.js";

/**
 * Initialize global error tracking for uncaught errors.
 * 
 * Sets up a window.onerror handler that catches any uncaught JavaScript exceptions
 * and sends them to the error collector service.
 * 
 * @param {string} project - Name of the project to associate with errors
 * 
 * How it works:
 * 1. window.onerror is called whenever an uncaught error occurs
 * 2. We collect error details including message, stack trace, and source information
 * 3. Add client information like URL and browser user agent
 * 4. Send everything to the collector service via sendError()
 */
export function initGlobalErrorTracking(project) {

  // Check if we're in a browser environment (not Node.js or other non-browser JS)
  // This is important because window object doesn't exist in Node.js
  if (typeof window === "undefined") {
    return;
  }

  // Set the global error handler for uncaught errors
  window.onerror = function(message, source, lineno, colno, error) {

    // Build the error payload to send to the collector
    const payload = {
      // Project identifier to track which app reported the error
      project: project,
      // ISO timestamp of when the error occurred
      timestamp: new Date().toISOString(),
      error_type: "unhandled_exception",

      // Error details
      error: {
        message: message,  // Error message text
        stack: error?.stack  // Stack trace (where in the code the error happened)
      },

      // Client/browser information for context
      client: {
        url: window.location?.href,  // Current page URL
        browser: navigator?.userAgent  // Browser/device information
      }
    };

    // Send the error payload to the collector service
    sendError(payload);
  };

}