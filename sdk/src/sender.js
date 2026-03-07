let apiKey = null;
let collectorUrl = null;

export function setConfig(config) {
  apiKey = config.apiKey;
  collectorUrl = config.collectorUrl;
}

export function sendError(payload) {

  fetch(`${collectorUrl}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(payload)
  }).catch(() => {});
}