from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

class EmailChannel(BaseModel):
    enabled: bool = True
    recipients: List[EmailStr] = []

class SpikeTrigger(BaseModel):
    enabled: bool = False
    threshold: int = 10

class Triggers(BaseModel):
    newError: bool = True
    spike: SpikeTrigger = SpikeTrigger()

class AlertConfigSchema(BaseModel):
    projectId: str
    channels: Dict[str, Any] = {
        "email": {
            "enabled": True,
            "recipients": []
        }
    }
    triggers: Triggers = Triggers()
    cooldown: int = 60  # in minutes
