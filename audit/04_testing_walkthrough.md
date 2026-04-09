# BugTrace Scalability Audit — Post-Implementation Walkthrough

This guide will help you manually verify the architectural changes.

---

## 1. Verify "Fast Ingestion" & Background Tasks
Even without the automated test, you can see this in your logs.

1. Start your collector (`uvicorn app.main:app --reload`).
2. Send a report via `curl` with a large dummy screenshot.
3. **Observe:** The `curl` command should return `{"status": "received"}` instantly.
4. **Observe:** Check your terminal logs. You should see the S3 upload and metadata parsing happen **after** the request logs show the `200 OK`.

```bash
curl -X POST http://localhost:8000/report \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "manual_test", "error": {"message": "Test"}, "screenshot": "BASE64..."}'
```

## 2. Verify Data Tiering (Sentry Model)
1. Open your MongoDB GUI (Atlas or Compass).
2. Look at the `events` collection.
3. Trigger the **same error** 3 times from your SDK or via cURL.
4. **Expected Result:**
   - `error_groups` (formerly `errors` collection) should only have **1 document** (count: 3).
   - `events` collection should have **3 distinct documents**, each with its own full payload.

## 3. Verify SDK Batching & Jitter
This requires looking at the Network tab in your browser.

1. Refresh your client app.
2. Trigger 5 errors in rapid succession.
3. **Expected Result:**
   - In the Network Tab, you should see **only 1 request** to `/report` instead of 5, or a small staggered delay before they start flushing.
   - If you refresh exactly at the 5-second mark, you'll see them batched together.

## 4. Verify Database Retention (TTL)
To verify the TTL index is correctly created:

1. In MongoDB Compass, go to the `events` collection.
2. Click the **"Indexes"** tab.
3. Look for an index on `created_at`.
4. It should have a property **"Expire after seconds"** set to `2592000` (which is 30 days).

## 5. Verify Structured Logging
1. Look at your `uvicorn` console.
2. Instead of standard text prints, you should now see structured JSON objects:
   `{"event": "service_startup", "status": "initializing", "timestamp": "2024-..."}`

---

## 6. How to Run Automated Tests
```bash
cd collector
pip install pytest httpx
pytest tests/audit_verification.py
```
