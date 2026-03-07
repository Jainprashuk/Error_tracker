from pydantic import BaseModel

class CreateProject(BaseModel):
    name: str
    user_id: str