/**
 * Main entry point for the Bug Tracker SDK.
 * Initializes all error tracking components.
 */

import { setCollector } from "./sender.js";
import { initGlobalErrorTracking } from "./tracker.js";
import { setupAxiosInterceptor } from "./axiosInterceptor.js";
import { setupFetchInterceptor } from "./fetchInterceptor.js";

/**
 * Initialize the Bug Tracker SDK with configuration.
 * 
 * This function sets up all error tracking mechanisms:
 * - Global error tracking for uncaught errors
 * - Fetch API interception for network errors
 * - Optional Axios interceptor for Axios HTTP client
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.project - Name of the project (required)
 * @param {string} config.collectorUrl - URL of the error collector API (required)
 * @param {Object} config.axios - Optional Axios instance to monitor (if using Axios)
 * 
 * @example
 * import { initBugTracker } from 'bug-tracker-sdk';
 * 
 * initBugTracker({
 *   project: 'my-app',
 *   collectorUrl: 'https://error-collector.example.com',
 *   axios: axiosInstance  // Optional
 * });
 */
export function initBugTracker(config) {

  // Extract configuration parameters
  const { project, collectorUrl, axios } = config;

  // Set the collector URL in the sender module
  // All error reports will be sent to this URL
  setCollector(collectorUrl);

  // Initialize global error tracking for uncaught JavaScript errors
  // This captures errors that occur and aren't caught by try-catch blocks
  initGlobalErrorTracking(project);

  // Setup interception for native Fetch API calls
  // This allows tracking of network errors and failed HTTP requests
  setupFetchInterceptor(project);

  // If an Axios instance is provided, setup interception for Axios HTTP calls
  // This is optional - only needed if the application uses Axios for HTTP requests
  if (axios) {
    setupAxiosInterceptor(axios, project);
  }

}