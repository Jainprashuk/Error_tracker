from fastapi import APIRouter, HTTPException
from app.services.db import projects_collection
from bson import ObjectId
import httpx
from app.utils.encryption import encrypt_data

router = APIRouter()


@router.post("/projects/{project_id}/integrations/openproject")
def save_openproject_config(project_id: str, config: dict):

    try:
        project_obj_id = ObjectId(project_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid project_id")

    if not config.get("base_url") or not config.get("api_key"):
        raise HTTPException(status_code=400, detail="Missing required fields")

    encrypted_api_key = encrypt_data(config.get("api_key"))

    update_result = projects_collection.update_one(
        {"_id": project_obj_id},
        {
            "$set": {
                "integrations.openproject": {
                    "base_url": config.get("base_url"),
                    "api_key": encrypted_api_key,
                    "op_project_id": config.get("project_id")  # 🔥 rename
                }
            }
        }
    )

    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"status": "saved"}


@router.post("/integrations/openproject/test")
async def test_openproject(config: dict):

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{config['base_url'].rstrip('/')}/api/v3/projects/{config['project_id']}",
                headers={
                    "Authorization": f"Bearer {config['api_key']}"
                }
            )

        if res.status_code == 200:
            return {"status": "success"}
        else:
            return {"status": "failed", "detail": res.text}

    except Exception as e:
        return {"status": "error", "detail": str(e)}