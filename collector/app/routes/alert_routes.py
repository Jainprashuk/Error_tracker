from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.services.alert_service import get_project_alert_config, alerts_config_collection, alerts_logs_collection
from app.models.alert_model import AlertConfigSchema
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/projects/{project_id}/alert-config")
async def get_alert_config_endpoint(project_id: str):
    try:
        config = get_project_alert_config(project_id)
        print(config , "fetched config")
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/projects/{project_id}/alert-config")
async def update_alert_config(project_id: str, payload: AlertConfigSchema):
    try:
        updated_data = payload.model_dump()
        # Ensure projectId is stored as ObjectId and NOT popped before upsert
        updated_data["projectId"] = ObjectId(project_id)
        
        result = alerts_config_collection.update_one(
            {"projectId": ObjectId(project_id)},
            {"$set": updated_data},
            upsert=True
        )
        
        return {"status": "success", "message": "Alert configuration updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_id}/alerts/logs")
async def get_alert_logs(project_id: str):
    try:
        logs = list(alerts_logs_collection.find({"projectId": ObjectId(project_id)}).sort("createdAt", -1).limit(50))
        for log in logs:
            log["_id"] = str(log["_id"])
            log["projectId"] = str(log["projectId"])
            log["createdAt"] = log["createdAt"].isoformat()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
