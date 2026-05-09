from pydantic import BaseModel
from typing import Optional

class CreateProject(BaseModel):
    name: str