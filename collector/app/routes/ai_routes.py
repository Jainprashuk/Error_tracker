import os
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timedelta
from app.services.ai_service import ai_service
from app.services.db import (
    errors_collection, 
    events_collection, 
    projects_collection, 
    performance_collection,
    ai_insights_collection,
    ai_usage_collection
)
from app.middleware.org_middleware import verify_org_membership
import structlog

logger = structlog.get_logger()
router = APIRouter(tags=["AI Intelligence"])

# Cache duration in hours, defaulted to 24 (1 day)
AI_CACHE_TTL_HOURS = int(os.getenv("AI_CACHE_TTL_HOURS", 24))

class AnalyzeErrorRequest(BaseModel):
    error_id: str

async def log_ai_usage(user_id: str, org_id: str, project_id: str, ai_type: str, model: str, prompt: str = "", response: str = ""):
    """
    Logs actual Gemini API hits for credit management.
    """
    try:
        await ai_usage_collection.insert_one({
            "user_id": user_id,
            "org_id": org_id,
            "project_id": project_id,
            "type": ai_type,
            "model": model,
            "prompt": prompt,
            "response": response,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        logger.error("log_ai_usage_failed", error=str(e))

async def get_cached_insight(key: str, insight_type: str, force_refresh: bool = False):
    if force_refresh:
        return None
    cache_entry = await ai_insights_collection.find_one({"key": key, "type": insight_type})
    if cache_entry:
        generated_at = cache_entry.get("generated_at")
        if generated_at and (datetime.utcnow() - generated_at) < timedelta(hours=AI_CACHE_TTL_HOURS):
            return cache_entry.get("content")
    return None

async def save_insight_to_cache(key: str, insight_type: str, content: any):
    await ai_insights_collection.update_one(
        {"key": key, "type": insight_type},
        {"$set": {"content": content, "generated_at": datetime.utcnow()}},
        upsert=True
    )

@router.post("/ai/analyze-error")
async def analyze_incident(
    request: AnalyzeErrorRequest,
    force_refresh: bool = Query(False),
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    try:
        # 1. Check Cache
        cached = await get_cached_insight(request.error_id, "error_analysis", force_refresh)
        if cached:
            return cached

        # 2. Get Error Group
        query = {}
        if ObjectId.is_valid(request.error_id):
            query["_id"] = ObjectId(request.error_id)
        else:
            query["fingerprint"] = request.error_id
            
        error_group = await errors_collection.find_one(query)
        if not error_group:
            raise HTTPException(status_code=404, detail="Error not found")

        project_id = str(error_group.get("project_id"))
        latest_event = await events_collection.find_one(
            {"fingerprint": error_group["fingerprint"]},
            sort=[("created_at", -1)]
        )
        
        # 💡 P0 FIX: Breadcrumbs are inside the payload object. Handle null payload safely.
        payload = (latest_event.get("payload") if latest_event else {}) or {}
        breadcrumbs = payload.get("breadcrumbs", [])
        
        # 💡 P0 FIX: Attach payload data (stack trace, message) to error_group for AI visibility
        if latest_event and "payload" in latest_event:
            error_group.update(latest_event["payload"] or {})

        # 3. Call AI Service and Log Usage
        analysis_data = await ai_service.analyze_error(error_group, breadcrumbs)
        analysis = analysis_data.get("result")
        
        # LOG USAGE
        await log_ai_usage(
            user_id=str(org_membership["user_id"]),
            org_id=x_org_id,
            project_id=project_id,
            ai_type="error_analysis",
            model=ai_service.model_name,
            prompt=analysis_data.get("prompt", ""),
            response=analysis_data.get("response", "")
        )
        
        await save_insight_to_cache(request.error_id, "error_analysis", analysis)
        return analysis
    except Exception as e:
        logger.error("ai_endpoint_error", error=str(e))
        return {"problem": "AI Analysis failed", "solution": f"Internal Error: {str(e)}"}

@router.get("/ai/project-summary/{project_id}")
async def project_health_summary(
    project_id: str,
    force_refresh: bool = Query(False),
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    cached = await get_cached_insight(project_id, "project_summary", force_refresh)
    if cached:
        return cached

    # 💡 P0 FIX: Wrap project_id in ObjectId for correct MongoDB lookup
    p_oid = ObjectId(project_id)
    error_count = await errors_collection.count_documents({"project_id": p_oid})
    performance_docs = await performance_collection.find({"project_id": p_oid}).to_list(length=50)
    
    project = await projects_collection.find_one({"_id": p_oid})
    project_name = project.get("name", "Unknown") if project else "Unknown"

    # Fetch more granular data for better AI insights
    top_errors = await errors_collection.find({"project_id": p_oid}).sort([("occurrences", -1)]).to_list(length=5)
    
    error_signatures = []
    for e in top_errors:
        msg = e.get("message")
        if not msg:
            # Fallback to latest event if legacy error group lacks 'message' field
            latest = await events_collection.find_one({"fingerprint": e["fingerprint"]}, sort=[("created_at", -1)])
            msg = latest.get("payload", {}).get("error", {}).get("message", "Unknown Incident") if latest else "Unknown"
        
        error_signatures.append({
            "message": msg, 
            "count": e.get("occurrences"), 
            "last_seen": str(e.get("last_seen"))
        })

    detailed_perf = []
    if performance_docs:
        # Group by route and calculate simple averages
        route_map = {}
        for p in performance_docs:
            r = p.get("route", "unknown")
            lat = p.get("metrics", {}).get("pageLoadTime", 0)
            if r not in route_map: route_map[r] = []
            route_map[r].append(lat)
        
        for r, lats in route_map.items():
            detailed_perf.append({"route": r, "avg_load_ms": sum(lats)/len(lats), "samples": len(lats)})

    summary_data = await ai_service.get_project_summary(
        project_name, 
        error_signatures, 
        {"top_routes": sorted(detailed_perf, key=lambda x: x['avg_load_ms'], reverse=True)[:5]}
    )
    summary_text = summary_data.get("result")
    
    # LOG USAGE
    await log_ai_usage(
        user_id=str(org_membership["user_id"]),
        org_id=x_org_id,
        project_id=project_id,
        ai_type="project_summary",
        model=ai_service.model_name,
        prompt=summary_data.get("prompt", ""),
        response=summary_data.get("response", "")
    )

    result = {"summary": summary_text}
    await save_insight_to_cache(project_id, "project_summary", result)
    return result

@router.get("/ai/global-overview")
async def global_executive_summary(
    force_refresh: bool = Query(False),
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="ADMIN"))
):
    cached = await get_cached_insight(x_org_id, "global_overview", force_refresh)
    if cached:
        return cached

    projects = await projects_collection.find({"org_id": ObjectId(x_org_id)}).to_list(length=20)
    org_stats = []
    for p in projects:
        p_oid = p["_id"]
        e_count = await errors_collection.count_documents({"project_id": p_oid})
        # Get the top error message with fallback for legacy data
        top_error = await errors_collection.find_one({"project_id": p_oid}, sort=[("occurrences", -1)])
        top_msg = "None"
        if top_error:
            top_msg = top_error.get("message")
            if not top_msg:
                latest = await events_collection.find_one({"fingerprint": top_error["fingerprint"]}, sort=[("created_at", -1)])
                top_msg = latest.get("payload", {}).get("error", {}).get("message", "Unknown") if latest else "None"
        
        org_stats.append({
            "name": p["name"], 
            "error_count": e_count, 
            "most_frequent_signature": top_msg
        })
        
    overview_data = await ai_service.get_global_overview(org_stats)
    summary_text = overview_data.get("result")
    
    # LOG USAGE
    await log_ai_usage(
        user_id=str(org_membership["user_id"]),
        org_id=x_org_id,
        project_id="global",
        ai_type="global_overview",
        model=ai_service.model_name,
        prompt=overview_data.get("prompt", ""),
        response=overview_data.get("response", "")
    )

    result = {"summary": summary_text}
    await save_insight_to_cache(x_org_id, "global_overview", result)
    return result

@router.get("/ai/performance-insights/{project_id}")
async def performance_intelligence(
    project_id: str,
    force_refresh: bool = Query(False),
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    cached = await get_cached_insight(project_id, "performance_insights", force_refresh)
    if cached:
        return cached

    # 💡 P0 FIX: Wrap project_id in ObjectId for correct MongoDB lookup
    p_oid = ObjectId(project_id)
    perf_data = await performance_collection.find({"project_id": p_oid}).to_list(length=50)
    formatted_perf = [
        {"route": p.get("route"), "page_load": p.get("metrics", {}).get("pageLoadTime")} 
        for p in perf_data if p.get("metrics")
    ]
    
    intelligence_data = await ai_service.get_performance_insights(formatted_perf)
    insights_text = intelligence_data.get("result")

    # LOG USAGE
    await log_ai_usage(
        user_id=str(org_membership["user_id"]),
        org_id=x_org_id,
        project_id=project_id,
        ai_type="performance_insights",
        model=ai_service.model_name,
        prompt=intelligence_data.get("prompt", ""),
        response=intelligence_data.get("response", "")
    )

    result = {"insights": insights_text}
    await save_insight_to_cache(project_id, "performance_insights", result)
    return result
