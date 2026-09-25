from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.schemas.auth import RegisterRequest, RegisterResponse
from backend.app.security import hash_password


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(User).where(User.username == data.username)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
    )

    db.add(user)
    db.flush()

    verification = VerificationRequest(
        user_id=user.id,
        full_name=data.full_name,
        major=data.major,
    )

    db.add(verification)
    db.commit()

    return RegisterResponse(
        username=user.username,
        verification_status=user.verification_status,
        message="Account created. Student verification is pending.",
    )