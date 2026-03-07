from pydantic import BaseModel


class OAuthUser(BaseModel):
    email: str
    name: str
    provider: str
    provider_id: str