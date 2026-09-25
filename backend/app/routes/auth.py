from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
)
from backend.app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

bearer_scheme = HTTPBearer()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    username = data.username.strip().lower()

    existing_user = db.scalar(
        select(User).where(User.username == username)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )

    user = User(
        username=username,
        password_hash=hash_password(data.password),
    )

    db.add(user)
    db.flush()

    verification = VerificationRequest(
        user_id=user.id,
        full_name=data.full_name.strip(),
        major=data.major.strip(),
    )

    db.add(verification)
    db.commit()

    return RegisterResponse(
        username=user.username,
        verification_status=user.verification_status,
        message="Account created. Student verification is pending.",
    )


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    username = data.username.strip().lower()

    user = db.scalar(
        select(User).where(User.username == username)
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(user.id)

    return LoginResponse(
        access_token=access_token,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired login",
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
        )

    return user


def require_admin(
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user


def require_verified_user(
    user: User = Depends(get_current_user),
):
    if user.verification_status != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account must be verified first",
        )

    return user


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def current_user(
    user: User = Depends(get_current_user),
):
    return CurrentUserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        verification_status=user.verification_status,
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def current_user(
    user: User = Depends(get_current_user),
):
    return CurrentUserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        verification_status=user.verification_status,
    )