let apiKey = null;
let collectorUrl = null;
let queue = [];
let flushTimer = null;
const MAX_BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds
const STORAGE_KEY = 'bugtrace_retry_queue';

import { getBreadcrumbs } from "./breadcrumbs.js";

let isInitialized = false;

let perfQueue = [];
let perfFlushTimer = null;

export function sendPerformance(payload) {
  if (!apiKey || !collectorUrl) return;

  perfQueue.push(payload);

  if (perfQueue.length >= MAX_BATCH_SIZE) {
    flushPerformance();
  } else if (!perfFlushTimer) {
    perfFlushTimer = setTimeout(flushPerformance, FLUSH_INTERVAL);
  }
}

async function flushPerformance() {
  if (perfFlushTimer) {
    clearTimeout(perfFlushTimer);
    perfFlushTimer = null;
  }
  
  if (perfQueue.length === 0) return;

  const batch = [...perfQueue];
  perfQueue = [];

  try {
    await fetch(`${collectorUrl}/report/performance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(batch),
      keepalive: true
    });
  } catch (err) {
    console.warn("⚠️ BugTrace: Performance batch send failed");
  }
}

export function setConfig(config) {
  apiKey = config.apiKey;
  collectorUrl = config.collectorUrl;
  
  if (isInitialized) return;
  isInitialized = true;
  
  // 💡 P1 FIX: Added 'Jitter' to stagger retries across clients.
  const jitterDelay = 1000 + Math.random() * 4000;
  setTimeout(tryFlushPersistentQueue, jitterDelay);
}



const recentErrors = new Map();
const COOLDOWN_MS = 5000;

/**
 * Public entry point for sending errors.
 */
export function sendError(payload) {
  if (!payload.breadcrumbs) {
    payload.breadcrumbs = getBreadcrumbs();
  }

  // 💡 P1 FIX: Added Local Cooldown / Deduplication
  // Prevents spamming the server if the same error happens in a loop
  const errorKey = `${payload.error?.message}-${payload.error?.stack}`;
  const now = Date.now();
  
  if (recentErrors.has(errorKey)) {
    const lastSeen = recentErrors.get(errorKey);
    if (now - lastSeen < COOLDOWN_MS) {
      console.warn("⚠️ BugTrace: Duplicate error suppressed (Local Cooldown)");
      return;
    }
  }
  
  recentErrors.set(errorKey, now);

  queue.push(payload);

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL);
  }
}

async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.length === 0) return;

  const batch = [...queue];
  queue = [];

  try {
    const success = await sendBatch(batch);
    if (!success) {
      persistToStorage(batch);
    }
  } catch (err) {
    persistToStorage(batch);
  }
}

async function sendBatch(batch) {
  // 💡 P0 FIX: True Server-Side Batching
  // Instead of individual calls, we send the entire array at once.
  try {
    const res = await fetch(`${collectorUrl}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(batch)
    });
    return res.ok;
  } catch (err) {
    console.error("⚠️ BugTrace: Batch send failed", err);
    return false;
  }
}

function persistToStorage(failedBatch) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = [...existing, ...failedBatch].slice(-50); // Keep last 50 only
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // LocalStorage full or private mode
  }
}

async function tryFlushPersistentQueue() {
  if (!apiKey || !collectorUrl) return;

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (stored.length === 0) return;

    localStorage.removeItem(STORAGE_KEY);
    
    // Process them through the normal queue
    stored.forEach(item => sendError(item));
  } catch (e) {}
}