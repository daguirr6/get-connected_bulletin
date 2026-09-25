from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    major: str = Field(min_length=2, max_length=120)


class RegisterResponse(BaseModel):
    username: str
    verification_status: str
    message: str