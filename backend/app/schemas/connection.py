from datetime import datetime

from pydantic import BaseModel


class ConnectionResponse(BaseModel):
    id: int
    user_id: int
    display_name: str
    major: str
    connected_at: datetime

class ConnectionSuggestionResponse(BaseModel):
    user_id: int
    display_name: str
    major: str
    mutual_count: int
    mutual_connections: list[str]