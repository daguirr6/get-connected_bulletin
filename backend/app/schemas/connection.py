from datetime import datetime

from pydantic import BaseModel


class ConnectionResponse(BaseModel):
    id: int
    user_id: int
    display_name: str
    major: str
    connected_at: datetime