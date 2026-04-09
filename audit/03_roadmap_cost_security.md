# BugTrace System Audit — Part 3: Roadmap, Cost, Security & Verdict

---

## 6. Performance Optimization Roadmap

### P0 — Must Fix Before Scale (Week 1-2)

These are **system-down risks** at even moderate traffic (100 events/sec).

| # | Issue | Fix | Effort | Impact |
|---|-------|-----|--------|--------|
| P0-1 | **Secrets in `.env` committed to Git** | Rotate ALL credentials immediately. Add `.env` to `.gitignore`. Use Vercel env vars | 2h | 🔴 Security |
| P0-2 | **No rate limiting on `/report`** | Add API-key-based rate limiting (in-memory token bucket, then Redis) | 4h | 🔴 Availability |
| P0-3 | **Screenshot upload in hot path** | Remove base64 from JSON payload. Either: (a) store URL reference + background upload, or (b) SDK uploads directly to R2 via presigned URL | 1d | 🔴 Latency |
| P0-4 | **Email sending in hot path** | Store alert decision in a `pending_alerts` collection. Run a 10-second interval background task (or separate worker) to send emails | 1d | 🔴 Latency |
| P0-5 | **Missing critical indexes** | Add indexes on `projects.api_key` (unique), `errors.fingerprint` (unique), `users.email` (unique), `alert_configs.projectId` (unique) | 1h | 🔴 Query Perf |
| P0-6 | **No pagination** on error list endpoints | Add `skip`/`limit` params with default page size of 50. Add `.sort("last_seen", -1)` | 2h | 🟡 Memory/UX |
| P0-7 | **CORS wide open** | Restrict `allow_origins` to your actual domains: `bugtrace.jainprashuk.in`, `bugtracker.jainprashuk.in` | 30m | 🟡 Security |
| P0-8 | **Index creation on every cold start** | Move `create_index()` out of module-level. Run as a one-time migration script | 30m | 🟡 Cold Start |

**Estimated total effort**: 3-4 days for one developer.

### P1 — Important Improvements (Week 3-6)

| # | Issue | Fix | Effort | Impact |
|---|-------|-----|--------|--------|
| P1-1 | **Sync pymongo blocks event loop** | Switch to `motor` (async MongoDB driver). Update all `find_one()` → `await collection.find_one()` | 2d | 🔴 Throughput |
| P1-2 | **No SDK batching** | Implement ring buffer + flush timer in `sender.js`. Batch POST to `/ingest/batch` endpoint | 2d | 🔴 Network |
| P1-3 | **No SDK retry/backoff** | Add exponential backoff with jitter. `localStorage` persistence for unsent batches | 1d | 🟡 Reliability |
| P1-4 | **No SDK rate limiting** | Token bucket rate limiter: 30 errors/min per error type, 100/min total | 1d | 🟡 Reliability |
| P1-5 | **Separate error groups from events** | New schema: `error_groups` (metadata) + `events` (individual occurrences). TTL index on events | 3d | 🟡 Data |
| P1-6 | **Move off Vercel Serverless** | Deploy to Railway/Fly.io/Render with persistent uvicorn process. Eliminates cold starts and connection pooling issues | 1d | 🔴 Latency |
| P1-7 | **Add structured logging** | Replace all `print()` with `structlog`. JSON format for log aggregation | 1d | 🟡 Operations |
| P1-8 | **Health check endpoint** | `/health` that verifies MongoDB and R2 connectivity | 2h | 🟡 Operations |
| P1-9 | **Payload size enforcement** | SDK: max 100KB per event. Server: FastAPI middleware to reject >500KB requests | 4h | 🟡 Reliability |
| P1-10 | **Add Redis caching** | Cache `project_by_api_key` (5min TTL) and `alert_config` (1min TTL). Eliminates 2 DB calls per event | 1d | 🔴 Throughput |

### P2 — Long-Term Architecture (Month 2-6)

| # | Issue | Fix | Effort | Impact |
|---|-------|-----|--------|--------|
| P2-1 | **Decouple ingestion from processing** | Introduce Redis Streams or Kafka. Ingestion API returns `202 Accepted`. Workers process in background | 2w | 🔴 Scale |
| P2-2 | **Bulk write pipeline** | Workers batch MongoDB operations: `bulk_write([UpdateOne, InsertOne, ...])` every 100 events or 1 second | 1w | 🔴 Throughput |
| P2-3 | **Time-series aggregation pipeline** | Pre-compute hourly/daily error counts. Store in ClickHouse or TimescaleDB for dashboard analytics | 2w | 🟡 Query Perf |
| P2-4 | **Cold storage archival** | Cron job to archive events >30 days to R2 as compressed JSONL. Implement on-demand retrieval API | 1w | 🟡 Cost |
| P2-5 | **SDK payload compression** | GZip compression via `CompressionStream` API. Reduces network payload by ~70% | 3d | 🟡 Network |
| P2-6 | **Multi-region deployment** | Deploy collector to edge regions (Fly.io multi-region). Reduce SDK→collector latency globally | 1w | 🟡 Latency |
| P2-7 | **Tenant-aware quotas & billing** | Plan tiers with event limits. Enforce in real-time via Redis counters. Usage dashboard for customers | 2w | 🔴 Business |
| P2-8 | **Source map support** | SDK submits source maps. Backend de-obfuscates stack traces for minified code | 2w | 🟡 UX |

### Implementation Order Visualization

```mermaid
gantt
    title BugTrace Scale Roadmap
    dateFormat  YYYY-MM-DD
    section P0 (Must Fix)
    Rotate secrets & fix .gitignore     :p01, 2026-04-09, 1d
    Add rate limiting on /report        :p02, after p01, 1d
    Move screenshots off hot path       :p03, after p01, 2d
    Move email off hot path             :p04, after p01, 2d
    Add missing indexes                 :p05, after p01, 1d
    Add pagination                      :p06, after p05, 1d
    Fix CORS & cold start index         :p07, after p01, 1d

    section P1 (Important)
    Switch pymongo → motor              :p11, after p07, 3d
    SDK batching                        :p12, after p07, 3d
    SDK retry + rate limit              :p13, after p12, 2d
    Separate groups/events schema       :p14, after p11, 4d
    Move off Vercel Serverless          :p15, after p11, 2d
    Add Redis caching                   :p16, after p15, 2d
    Structured logging + health check   :p17, after p15, 2d

    section P2 (Long-term)
    Ingestion queue (Redis Streams)     :p21, after p16, 10d
    Bulk write pipeline                 :p22, after p21, 5d
    Time-series aggregation             :p23, after p22, 10d
    Cold storage archival               :p24, after p23, 5d
```

---

## 8. Cost vs Performance Tradeoffs

### 8.1 Where Infrastructure Cost Will Explode

| Component | Current Cost | Cost at 10K events/sec | Cost at 100K events/sec |
|-----------|-------------|------------------------|-------------------------|
| **MongoDB Atlas** | Free tier / M10 ($57/mo) | M30 (~$500/mo) or M50 (~$1,500/mo) | M60+ with sharding (~$5,000-15,000/mo) |
| **Vercel Serverless** | Free tier | Pro ($20/mo) + overages (~$200/mo) | Not viable. Must migrate. |
| **Cloudflare R2** | Free tier (10M req/mo) | ~$50/mo | ~$500/mo |
| **Resend Email** | Free (100/day) | Pro ($20/mo, 50K/mo) | Business (~$100/mo) |
| **Total** | ~$0-60/mo | ~$800-2,000/mo | ~$6,000-16,000/mo |

### 8.2 Smart Optimizations

| Optimization | Saves | Effort | When |
|-------------|-------|--------|------|
| **Client-side dedup** | 40-60% of events never reach server | Low | P0 |
| **SDK batching** | 90% reduction in HTTP requests | Medium | P1 |
| **GZip compression** | 70% reduction in bandwidth costs | Low | P1 |
| **Redis caching for project lookups** | 90% reduction in MongoDB reads for hot path | Low | P1 |
| **TTL + cold storage** | 80% reduction in MongoDB storage costs | Medium | P2 |
| **Hourly rollups** | Dashboard queries hit aggregated data, not raw events | Medium | P2 |
| **Event sampling** at high volume | 50-90% reduction in storage for errors with >1000 occurrences | Medium | P2 |

### 8.3 What NOT to Over-Engineer Early

| Don't Build Yet | Why |
|----------------|-----|
| ❌ Kafka / full event streaming | Redis Streams is sufficient until 50K events/sec. Kafka adds significant operational complexity |
| ❌ Kubernetes / complex orchestration | A single Railway/Fly.io process with 2-4 workers handles 10K events/sec easily |
| ❌ ClickHouse for analytics | MongoDB aggregation pipeline works fine for dashboards until 100M+ events. Add ClickHouse when MongoDB aggregation becomes slow |
| ❌ Multi-region from day 1 | Single region with a CDN edge (Cloudflare) for the frontend and a well-placed collector is fine until you have paying international customers |
| ❌ Custom alerting engine | Your current simple threshold-based alerting is fine. Don't build anomaly detection or ML-based alerting yet |
| ❌ RBAC / fine-grained permissions | Simple user → projects ownership is fine. Add team management when you have paying team customers |

---

## 9. Security & Multi-Tenancy

### 9.1 Critical Security Issues Found

#### 🔴 SEC-1: Production Secrets Committed to Git

**This is the top priority issue in this entire audit.**

```
# collector/.env (COMMITTED TO GIT)
mongo_uri=mongodb+srv://29jainprashuk_db_user:injXHAgs69WOrIeE@cluster0...
CF_ACCOUNT_ID=8e0d30d3f3b85f632090edb2439b6527
CF_ACCESS_KEY_ID=0ed9ee67bf00fdbce934031fc99f7dbb
CF_SECRET_ACCESS_KEY=3a1d151c494702683d1a3cbdc32436289092026c...
ENCRYPTION_KEY=VbK3Fk-HlsP6Kx8GZ7p7b_Q-n_hUaM2iXk9D9VcFvTQ=
RESEND_API_KEY=re_7TEagguM_2DptoFNmABv19KsUZRBxdMYx
JWT_SECRET_KEY=your-secret-key-change-in-production-to-something-random
```

**Anyone with access to your Git repo can:**
- Read/write/delete your entire MongoDB database
- Access/delete all Cloudflare R2 screenshots
- Send emails from your Resend account
- Forge JWT tokens and impersonate any user
- Decrypt all encrypted API keys stored in the database

> [!CAUTION]
> **IMMEDIATE ACTION REQUIRED:**
> 1. **Rotate ALL credentials** — every single one listed above. The old ones are compromised the moment they touched Git history.
> 2. Add `.env` to `.gitignore` (it's already in the root `.gitignore`, but the collector's `.env` is still tracked).
> 3. Use `git filter-branch` or `BFG Repo Cleaner` to purge `.env` from Git history.
> 4. Set all secrets via your deployment platform's environment variable UI (Vercel, Railway, etc.).

#### 🔴 SEC-2: JWT Secret is a Default String

```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
```

The fallback value is a guessable string that's also **visible in the source code**. If the env var isn't set, anyone can forge JWT tokens.

#### 🔴 SEC-3: No Authentication on Ingestion Endpoint

```python
@router.post("/report")
async def report_error(payload: ErrorPayload, request: Request):
    api_key = request.headers.get("x-api-key")
    project = projects_collection.find_one({"api_key": api_key})
```

The API key is the **only** authentication. API keys are:
- Sent in plaintext headers
- Visible in browser DevTools of any user of the client app
- Not rotatable without breaking all client SDKs
- Not scoped (an API key gives full ingestion access)

**Any user inspecting network traffic in a client app can extract the API key and:**
- Flood your system with fake events
- Exhaust the tenant's event quota
- Pollute error data with garbage

This is inherent to client-side SDKs (Sentry has the same limitation), but you need:
- Rate limiting per API key
- Anomaly detection on event patterns
- Ability to revoke/rotate API keys

#### 🟡 SEC-4: No Input Sanitization

```python
payload_dict = payload.model_dump()
# ...
"payload": payload   # Stored directly in MongoDB
```

The raw payload is stored in MongoDB without sanitization. Potential attacks:
- **NoSQL injection** via `$` operators in field names (mitigated by Pydantic, but `extra = "allow"` allows arbitrary fields)
- **Storage bomb**: Send payloads with deeply nested objects or extremely long strings to bloat the database
- **XSS via stored payload**: If the dashboard renders any payload field as HTML, an attacker can inject scripts

#### 🟡 SEC-5: CORS Allows All Origins

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
)
```

`allow_origins=["*"]` with `allow_credentials=True` is a dangerous combination. While it doesn't directly affect the SDK (which doesn't use cookies), it means:
- Any website can make authenticated API calls to your dashboard endpoints
- CSRF attacks are possible on dashboard routes

### 9.2 Tenant Isolation Strategy

| Level | Current State | Recommended |
|-------|--------------|-------------|
| **Data isolation** | None. All tenants share `errors` collection | Compound index on `project_id`. All queries MUST filter by `project_id`. Add middleware to enforce this |
| **Resource isolation** | None. One tenant can saturate the whole system | Redis-based rate limiter per API key. Hard limit: 1,000 events/sec per project |
| **Query isolation** | None. A slow query by one tenant blocks others | Maximum query timeout: `maxTimeMS=5000` on all MongoDB queries |
| **Cost isolation** | None. No usage tracking | Track events per project in Redis. Monthly usage aggregation for billing |
| **Network isolation** | SDK API keys are public | Rate limiting + anomaly detection. API key rotation capability |

### 9.3 API Abuse Prevention Checklist

```python
# Middleware to add to FastAPI
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Request size limit (reject >500KB)
        content_length = request.headers.get("content-length", "0")
        if int(content_length) > 500_000:
            return JSONResponse(status_code=413, content={"detail": "Payload too large"})
        
        # 2. Rate limit by API key (using Redis)
        api_key = request.headers.get("x-api-key")
        if api_key and request.url.path == "/report":
            if not await check_rate_limit(api_key, limit=100, window=60):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded"},
                    headers={"Retry-After": "60"}
                )
        
        # 3. Request timeout
        # (handled at reverse proxy level)
        
        response = await call_next(request)
        return response
```

---

## 10. Final Verdict

### System Readiness Scorecard

| Category | Score | Assessment |
|----------|-------|------------|
| **SDK Resilience** | 2/10 | Fire-and-forget, no batching, no retry, payload bombs. Will cause data loss and performance issues in production |
| **Backend Throughput** | 2/10 | Synchronous DB in async handlers, 6+ DB calls per event, screenshots & emails in hot path. ~2 events/sec effective throughput |
| **Data Architecture** | 3/10 | Wrong schema for the use case. No TTL, no partitioning, missing indexes, unbounded document growth |
| **Failure Resilience** | 1/10 | Zero backpressure, zero rate limiting, zero circuit breaking. Any traffic spike takes down all tenants |
| **Security** | 1/10 | Production secrets in Git (critical). Default JWT secret. No rate limiting. Wide-open CORS |
| **Observability** | 1/10 | Print statements only. No metrics, no structured logging, no health checks, no alerting on self |
| **Multi-Tenancy** | 2/10 | No tenant isolation, no rate limiting, no usage tracking, total noisy-neighbor vulnerability |
| **Cost Efficiency** | 3/10 | Serverless with cold starts. Full payloads stored. No compression. Will hit $10K+/mo at 10K events/sec |
| **Deployment** | 3/10 | Vercel serverless with 10s timeout, cold starts, connection pooling issues. Not suitable for event ingestion |
| **Overall** | **2/10** | **This is a working prototype. It absolutely cannot handle production traffic without the P0 fixes.** |

### Top 5 Actions (This Week)

1. **Rotate all secrets** and purge from Git history. This is not negotiable.
2. **Add rate limiting** on `/report` per API key. Use in-memory dict with TTL as a stopgap for 30 minutes, then Redis.
3. **Add missing database indexes** (`projects.api_key`, `errors.fingerprint`, `users.email`).
4. **Move screenshot upload and email sending off the hot path**. Accept the event, ACK immediately, process asynchronously.
5. **Migrate off Vercel Serverless** to a persistent process (Railway free tier works) with proper connection pooling.

### The 80/20 Insight

With just the P0 fixes (3-4 days of work), your system can handle **1,000 events/sec reliably**. That's enough for ~50 small-to-medium client applications sending errors simultaneously.

With P0 + P1 (3-4 weeks), you reach **10,000 events/sec** — enough for a SaaS with 500+ customers.

P2 is optional until you've validated product-market fit and have revenue to justify the infrastructure investment.

> [!IMPORTANT]
> **The architecture is not wrong — it's just early-stage.** Every system at Sentry, Datadog, and LogRocket started simpler than this. The key is knowing what to fix before you scale, and this audit gives you that roadmap. Ship the P0 fixes, get customers, then iterate.
