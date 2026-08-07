from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.models.project_model import CreateProject
from app.services.db import db, projects_collection, project_members_collection, errors_collection, events_collection, performance_collection, alerts_config_collection, alerts_logs_collection
from app.utils.api_key import generate_api_key
from bson import ObjectId
from app.utils.encryption import decrypt_data, encrypt_data
from app.middleware.org_middleware import verify_org_membership

router = APIRouter(tags=["Projects"])

@router.post("/projects")
async def create_project(
    project: CreateProject,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_CREATE"))
):
    api_key = generate_api_key()

    data = {
        "name": project.name,
        "org_id": ObjectId(x_org_id),
        "api_key": api_key,
        "created_at": datetime.utcnow()
    }

    result = await projects_collection.insert_one(data)
    project_id = str(result.inserted_id)

    # Automatically add the creator as an admin of the project
    await project_members_collection.insert_one({
        "project_id": project_id,
        "user_id": org_membership["user_id"],
        "role": "admin",
        "created_at": datetime.utcnow()
    })

    return {
        "project_id": project_id,
        "api_key": api_key,
        "org_id": x_org_id
    }

@router.get("/projects")
async def list_org_projects(
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    user_id = org_membership["user_id"]
    user_role = org_membership.get("role", "viewer")

    # 1. Base query: must belong to the org
    query = {"org_id": ObjectId(x_org_id)}

    # Cache assigned projects for quick role lookup (to determine user's role within each project)
    role_map = {}
    assigned_docs = await project_members_collection.find({"user_id": user_id}).to_list(length=100)
    for doc in assigned_docs:
        role_map[str(doc["project_id"])] = doc.get("role", "viewer")

    projects = await projects_collection.find(query).to_list(length=100)

    def stringify_doc(doc):
        if isinstance(doc, list):
            return [stringify_doc(x) for x in doc]
        if isinstance(doc, dict):
            return {k: stringify_doc(v) for k, v in doc.items()}
        if isinstance(doc, ObjectId):
            return str(doc)
        return doc

    sanitized_projects = []
    for p in projects:
        try:
            pid_str = str(p["_id"])
            p = stringify_doc(p)
            p["id"] = p.get("_id")
            
            # Determine effective role in this project
            effective_role = "admin" if user_role == "admin" else role_map.get(pid_str, "viewer")
            p["my_project_role"] = effective_role

            # 🔐 P0 SECURITY: Strip API Key if no capability
            from app.middleware.org_middleware import check_permission
            has_api_permission = await check_permission(effective_role, "API_KEY_VIEW")
            if not has_api_permission:
                p["api_key"] = "•••••••••••••••• (Restricted)"

            # 📡 P0 FIX: Multi-stream integration tracking with legacy fallback.
            # Check both Errors and Performance collections to handle healthy vs integrated.
            if p.get("is_integrated") is not None:
                p["is_integrated"] = bool(p["is_integrated"])
            else:
                # Legacy fallback: Check both telemetry streams
                # Note: p["_id"] is already stringified here so we must cast it back to ObjectId
                has_errors = await errors_collection.find_one({"project_id": ObjectId(p["_id"])})
                has_perf = await performance_collection.find_one({"project_id": ObjectId(p["_id"])})
                is_integrated = bool(has_errors or has_perf)
                p["is_integrated"] = is_integrated
                
                # Proactively persist for next time
                if is_integrated:
                    await projects_collection.update_one({"_id": ObjectId(p["_id"])}, {"$set": {"is_integrated": True}})

            sanitized_projects.append(p)
        except Exception as e:
            print(f"Error sanitizing project: {e}")
            continue

    return sanitized_projects

@router.get("/projects/stats")
async def get_org_projects_stats(
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    """
    Aggregate error count, last-seen timestamp, and 24h activity for every
    project in the org in a single query. Replaces the dashboard's previous
    N+1 pattern of one /projects/{id}/errors call per project.
    """
    projects = await projects_collection.find(
        {"org_id": ObjectId(x_org_id)}, {"_id": 1}
    ).to_list(length=500)
    project_ids = [p["_id"] for p in projects]

    if not project_ids:
        return {}

    cutoff_24h = datetime.utcnow() - timedelta(hours=24)

    pipeline = [
        {"$match": {"project_id": {"$in": project_ids}}},
        {
            "$group": {
                "_id": "$project_id",
                "errorCount": {"$sum": 1},
                "lastSeen": {"$max": "$last_seen"},
                "count24h": {
                    "$sum": {"$cond": [{"$gte": ["$last_seen", cutoff_24h]}, 1, 0]}
                },
            }
        },
    ]

    results = await errors_collection.aggregate(pipeline).to_list(length=500)

    return {
        str(r["_id"]): {
            "errorCount": r["errorCount"],
            "lastSeen": r["lastSeen"].isoformat() if r["lastSeen"] else None,
            "count24h": r["count24h"],
        }
        for r in results
    }


@router.get("/projects/trends")
async def get_org_error_trends(
    days: int = 14,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    """
    Daily error-event counts for the last `days` days, both org-wide and
    broken out per project, in a single aggregation. Powers the dashboard's
    trend chart, the 24h-vs-yesterday indicator, and each project card's
    sparkline — every bucket here is a real count, not a fabricated one.
    """
    projects = await projects_collection.find(
        {"org_id": ObjectId(x_org_id)}, {"_id": 1}
    ).to_list(length=500)
    project_ids = [p["_id"] for p in projects]

    if not project_ids:
        return {"org": [], "byProject": {}}

    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"project_id": {"$in": project_ids}, "created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": {
                    "project_id": "$project_id",
                    "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                },
                "count": {"$sum": 1},
            }
        },
    ]

    results = await events_collection.aggregate(pipeline).to_list(length=(days + 1) * len(project_ids))

    counts_by_project_day: dict = {}
    for r in results:
        pid = str(r["_id"]["project_id"])
        counts_by_project_day.setdefault(pid, {})[r["_id"]["day"]] = r["count"]

    day_labels = [
        (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(days - 1, -1, -1)
    ]

    by_project = {
        pid: [{"date": day, "count": day_counts.get(day, 0)} for day in day_labels]
        for pid, day_counts in counts_by_project_day.items()
    }

    org_series = [
        {
            "date": day,
            "count": sum(day_counts.get(day, 0) for day_counts in counts_by_project_day.values()),
        }
        for day in day_labels
    ]

    return {"org": org_series, "byProject": by_project}


@router.get("/projects/top-errors")
async def get_org_top_errors(
    limit: int = 5,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    """
    The most recently active error fingerprints across every project in the
    org, for the dashboard's at-a-glance error feed.
    """
    projects = await projects_collection.find(
        {"org_id": ObjectId(x_org_id)}, {"_id": 1, "name": 1}
    ).to_list(length=500)
    project_ids = [p["_id"] for p in projects]
    project_names = {str(p["_id"]): p.get("name", "Unknown") for p in projects}

    if not project_ids:
        return []

    errors = await errors_collection.find(
        {"project_id": {"$in": project_ids}},
        {
            "fingerprint": 1,
            "event_type": 1,
            "message": 1,
            "occurrences": 1,
            "last_seen": 1,
            "project_id": 1,
        }
    ).sort("last_seen", -1).limit(limit).to_list(length=limit)

    return [
        {
            "fingerprint": e.get("fingerprint"),
            "eventType": e.get("event_type"),
            "message": e.get("message"),
            "occurrences": e.get("occurrences", 1),
            "lastSeen": e["last_seen"].isoformat() if e.get("last_seen") else None,
            "projectId": str(e["project_id"]),
            "projectName": project_names.get(str(e["project_id"]), "Unknown"),
        }
        for e in errors
    ]


class UpdateProjectRequest(BaseModel):
    name: str

@router.patch("/projects/{project_id}")
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_EDIT"))
):
    """
    Updates project metadata. Currently supports renaming.
    Restricted to organization managers with PROJECT_EDIT capability.
    """
    # 1. Verify project belongs to org
    project = await projects_collection.find_one({"_id": ObjectId(project_id), "org_id": ObjectId(x_org_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found in this organization.")

    # 2. Update
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"name": request.name}}
    )

    return {"message": "Project updated successfully", "name": request.name}

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_DELETE"))
):
    """
    Permanently deletes a project and all its associated data.
    Restricted to organization managers with PROJECT_DELETE capability.
    """
    # 1. Verify project belongs to org
    project = await projects_collection.find_one({"_id": ObjectId(project_id), "org_id": ObjectId(x_org_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found in this organization.")

    # 2. Cleanup all associated data
    await errors_collection.delete_many({"project_id": project_id})
    await events_collection.delete_many({"project_id": project_id})
    await performance_collection.delete_many({"project_id": project_id})
    await project_members_collection.delete_many({"project_id": project_id})
    await alerts_config_collection.delete_many({"project_id": project_id})
    await alerts_logs_collection.delete_many({"project_id": project_id})

    # 3. Final: Delete the project meta doc
    await projects_collection.delete_one({"_id": ObjectId(project_id)})

    return {"message": f"Project '{project.get('name')}' deleted successfully."}