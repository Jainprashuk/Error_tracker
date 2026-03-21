import httpx
import json
import os
from app.utils.ticket_generate import generate_title, build_description


async def create_openproject_ticket(error: dict, op_config: dict):

    url = f"{op_config['base_url'].rstrip('/')}/api/v3/workspaces/{op_config['op_project_id']}/work_packages"

    title = generate_title(error)

    clean_payload = dict(error)
    if "payload" in clean_payload:
        clean_payload["payload"] = dict(clean_payload["payload"])
        clean_payload["payload"].pop("screenshot", None)

    description = build_description(clean_payload)

    payload = {
        "subject": title,
        "description": {
            "raw": description
        },
        "_links": {
            "type": {
                "href": "/api/v3/types/1"
            }
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {op_config['api_key']}",
                "Content-Type": "application/json"
            },
            json=payload
        )

    if response.status_code not in [200, 201]:
        raise Exception(response.text)

    return response.json()