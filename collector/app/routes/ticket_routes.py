from fastapi import APIRouter, HTTPException
from app.services.db import errors_collection
from app.services.openproject_service import create_openproject_ticket
import os
from bson import ObjectId
from app.services.db import projects_collection

router = APIRouter()


@router.post("/tickets/openproject/{fingerprint}")
async def create_ticket_from_error(fingerprint: str):

    # 💡 P1: Await async find
    error = await errors_collection.find_one({"fingerprint": fingerprint})

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    if error.get("is_ticket_generated"):
        raise HTTPException(status_code=400, detail="Ticket already generated")

    project_id = error.get("project_id")
    project = await projects_collection.find_one({"_id": project_id})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    op_config = project.get("integrations", {}).get("openproject")

    if not op_config:
        raise HTTPException(status_code=400, detail="OpenProject not configured")

    try:
        result = await create_openproject_ticket(error, op_config)

        ticket_id = result.get("id")
        ticket_url = f"{op_config['base_url']}/work_packages/{ticket_id}"

        # 💡 P1: Await async update
        await errors_collection.update_one(
            {"fingerprint": fingerprint},
            {
                "$set": {
                    "is_ticket_generated": True,
                    "ticket_url": ticket_url
                }
            }
        )

        return {
            "status": "success",
            "ticket_url": ticket_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/projects/{project_id}/tickets")
async def get_project_tickets(project_id: str):

    # 💡 P1: Await async find + to_list
    tickets = await errors_collection.find(
        {
            "project_id": ObjectId(project_id),
            "is_ticket_generated": True
        },
        {
            "_id": 0,
            "fingerprint": 1,
            "ticket_url": 1,
            "event_type": 1,
            "last_seen": 1
        }
    ).to_list(length=100)

    return tickets