"""
Performance metrics ingestion and query routes.
Completely separate from the error pipeline — no fingerprinting,
no alerts, no tickets. Just raw perf telemetry grouped by project & route.
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from app.services.db import performance_collection, projects_collection
from bson import ObjectId
from datetime import datetime, timedelta

router = APIRouter()


class ClientInfo(BaseModel):
    browser: Optional[str] = None
    screen: Optional[str] = None


class PerfMetrics(BaseModel):
    pageLoadTime: Optional[float] = None
    domContentLoaded: Optional[float] = None
    firstPaint: Optional[float] = None
    firstContentfulPaint: Optional[float] = None
    ttfb: Optional[float] = None
    dnsLookupTime: Optional[float] = None
    tcpConnectionTime: Optional[float] = None
    requestTime: Optional[float] = None
    apiRoute: Optional[str] = None
    apiMethod: Optional[str] = None
    apiStatus: Optional[int] = None
    apiDuration: Optional[float] = None


class PerformancePayload(BaseModel):
    event_type: str = "performance"
    timestamp: str
    route: Optional[str] = "/"
    page_url: Optional[str] = None
    client: Optional[ClientInfo] = None
    metrics: PerfMetrics

    class Config:
        extra = "allow"


# ─── Ingest ─────────────────────────────────────────────────────────────────

@router.post("/report/performance")
async def ingest_performance(
    payload: Union[PerformancePayload, List[PerformancePayload]],
    request: Request
):
    """
    Dedicated ingestion endpoint for performance metrics.
    Validates API key and stores the telemetry. Supports batching.
    """
    api_key = request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(status_code=401, detail="API key missing")

    project = await projects_collection.find_one({"api_key": api_key})
    if not project:
        raise HTTPException(status_code=401, detail="Invalid API key")

    project_id = project["_id"]

    items = payload if isinstance(payload, list) else [payload]
    docs = []

    for item in items:
        route = item.route or "/"
        docs.append({
            "project_id": project_id,
            "route": route,
            "page_url": item.page_url,
            "timestamp": item.timestamp,
            "created_at": datetime.utcnow(),
            "metrics": item.metrics.model_dump(exclude_none=True),
            "client": item.client.model_dump(exclude_none=True) if item.client else {},
        })

    if docs:
        await performance_collection.insert_many(docs)

    return {"status": "ok", "batch_size": len(docs)}


# ─── Query: project-level summary ───────────────────────────────────────────

@router.get("/projects/{project_id}/performance")
async def get_project_performance(project_id: str, days: int = 7):
    """
    Returns per-route performance averages for a project over the last N days.
    Response shape:
    {
      "routes": [
        {
          "route": "/dashboard",
          "sample_count": 42,
          "avg": { "pageLoadTime": 1234, "fcp": 800, ... },
          "p75": { ... }
        },
        ...
      ],
      "total_samples": 150,
      "period_days": 7
    }
    """
    try:
        pid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id")

    since = datetime.utcnow() - timedelta(days=days)

    cursor = performance_collection.find(
        {"project_id": pid, "created_at": {"$gte": since}},
        {"_id": 0, "route": 1, "metrics": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5000)

    samples = await cursor.to_list(length=5000)

    # Group by route and by API
    grouped: Dict[str, List[dict]] = {}
    api_grouped: Dict[str, List[dict]] = {}
    for s in samples:
        m = s.get("metrics", {})
        if m.get("apiDuration") is not None:
             api_r = m.get("apiRoute", "Unknown API")
             api_grouped.setdefault(api_r, []).append(m)
        else:
             r = s.get("route", "/")
             grouped.setdefault(r, []).append(m)

    routes_summary = []
    api_summary = []
    metric_keys = ["pageLoadTime", "domContentLoaded", "firstPaint", "firstContentfulPaint", "ttfb", "dnsLookupTime", "tcpConnectionTime", "requestTime"]

    for route, metrics_list in grouped.items():
        n = len(metrics_list)
        avgs: Dict[str, Optional[float]] = {}
        p75s: Dict[str, Optional[float]] = {}

        for key in metric_keys:
            values = sorted(
                [m[key] for m in metrics_list if m.get(key) is not None]
            )
            if values:
                avgs[key] = round(sum(values) / len(values), 1)
                p75_idx = int(len(values) * 0.75)
                p75s[key] = values[min(p75_idx, len(values) - 1)]
            else:
                avgs[key] = None
                p75s[key] = None

        routes_summary.append({
            "route": route,
            "sample_count": n,
            "avg": avgs,
            "p75": p75s,
        })

    for route, metrics_list in api_grouped.items():
         n = len(metrics_list)
         durations = sorted([m["apiDuration"] for m in metrics_list])
         avg_dur = round(sum(durations) / n, 1)
         p75_dur = durations[min(int(n*0.75), n - 1)]
         status_codes = [m.get("apiStatus", 0) for m in metrics_list]
         success_rate = round(sum(1 for s in status_codes if 200 <= s < 300) / n * 100, 1) if n > 0 else 0
         
         api_summary.append({
             "apiRoute": route,
             "sample_count": n,
             "avgDuration": avg_dur,
             "p75Duration": p75_dur,
             "successRate": success_rate,
             "method": metrics_list[0].get("apiMethod", "GET")
         })

    # Sort routes by sample count desc
    routes_summary.sort(key=lambda x: x["sample_count"], reverse=True)
    api_summary.sort(key=lambda x: x["sample_count"], reverse=True)

    return {
        "routes": routes_summary,
        "api_routes": api_summary,
        "total_samples": len(samples),
        "period_days": days,
    }


# ─── Query: time-series for a specific route ────────────────────────────────

@router.get("/projects/{project_id}/performance/route")
async def get_route_performance_timeseries(
    project_id: str,
    route: str = "/",
    days: int = 7
):
    """
    Returns raw time-series data for a specific route.
    Useful for charts that show performance over time.
    """
    try:
        pid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id")

    since = datetime.utcnow() - timedelta(days=days)

    cursor = performance_collection.find(
        {"project_id": pid, "route": route, "created_at": {"$gte": since}},
        {"_id": 0, "metrics": 1, "timestamp": 1, "created_at": 1}
    ).sort("created_at", 1).limit(500)

    samples = await cursor.to_list(length=500)

    # Flatten for chart consumption
    points = []
    for s in samples:
        point = {"timestamp": s.get("timestamp") or s["created_at"].isoformat()}
        point.update(s.get("metrics", {}))
        points.append(point)

    return {
        "route": route,
        "data": points,
        "period_days": days,
    }
