export function createBasePayload(overrides = {}) {
  return {
    event_type: null,
    timestamp: new Date().toISOString(),

    error: {
      message: null,
      stack: null,
      type: null
    },

    request: {
      url: null,
      method: null,
      payload: null
    },

    response: {
      status: null,
      data: null
    },

    performance: null,

    client: {
      url: typeof window !== "undefined" ? window.location.href : null,
      browser: typeof navigator !== "undefined" ? navigator.userAgent : null,
      screen:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : null
    },

    metadata: {},

    screenshot: null,

    ...overrides
  };
}