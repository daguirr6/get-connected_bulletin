from pydantic import BaseModel


class PublicModerationNotice(BaseModel):
    level: str
    notices: list[str]