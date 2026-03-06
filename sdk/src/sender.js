/**
 * Error sender module.
 * Handles sending error payloads to the collector service.
 */

// Global variable to store the collector URL
// Will be set when initBugTracker() is called
let collectorUrl = "";

/**
 * Set the collector URL where errors will be sent.
 * 
 * @param {string} url - The base URL of the error collector service
 * 
 * @example
 * setCollector('https://error-collector.example.com');
 */
export function setCollector(url) {
  collectorUrl = url;
}

/**
 * Send an error payload to the collector service.
 * 
 * Makes a POST request to the collector's /report endpoint with error details.
 * Errors during sending are silently caught to prevent cascading failures.
 * 
 * @param {Object} payload - The error payload to send
 * 
 * How it works:
 * 1. Check if collector URL is configured (if not, do nothing)
 * 2. Use native fetch API to POST the error payload
 * 3. Send Content-Type: application/json header
 * 4. Catch any network errors and log them to console
 */
export function sendError(payload) {
  
  // Return early if collector URL hasn't been configured
  if (!collectorUrl) return;

  // Send error to collector service via POST request
  fetch(collectorUrl + "/report", {
    method: "POST",  // Use POST to send data
    headers: {
      "Content-Type": "application/json"  // Tell server we're sending JSON
    },
    body: JSON.stringify(payload)  // Convert payload object to JSON string
  }).catch(err => {
    // Catch network errors during sending
    // Log to console but don't throw - we don't want error tracking to break the app
    console.error("BugTracker send failed", err);
  });
}