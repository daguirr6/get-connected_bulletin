from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.verification import (
    VerificationRequest,
)
from backend.app.rate_limit import (
    limit_login,
    limit_register,
)
from backend.app.schemas.auth import (
    CurrentUserResponse,
    VerificationReplyRequest,
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
    dependencies=[
        Depends(limit_register),
    ],
)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    username = (
        data.username
        .strip()
        .lower()
    )

    existing_user = db.scalar(
        select(User).where(
            User.username == username
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Username is already taken"
            ),
        )

    user = User(
        username=username,
        password_hash=hash_password(
            data.password
        ),
    )

    db.add(user)
    db.flush()

    verification = VerificationRequest(
        user_id=user.id,
        full_name=
            data.full_name.strip(),
        major=
            data.major.strip(),
    )

    db.add(verification)
    db.commit()

    return RegisterResponse(
        username=user.username,
        verification_status=
            user.verification_status,
        message=(
            "Account created. "
            "Student verification is pending."
        ),
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[
        Depends(limit_login),
    ],
)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    username = (
        data.username
        .strip()
        .lower()
    )

    user = db.scalar(
        select(User).where(
            User.username == username
        )
    )

    if user is None:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid username or password"
            ),
        )

    if user.account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid username or password"
            ),
        )

    access_token = create_access_token(
        user.id
    )

    return LoginResponse(
        access_token=access_token,
    )


def get_current_user(
    credentials:
        HTTPAuthorizationCredentials =
        Depends(bearer_scheme),

    db: Session =
        Depends(get_db),
):
    user_id = decode_access_token(
        credentials.credentials
    )

    if user_id is None:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid or expired login"
            ),
        )

    user = db.get(
        User,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "User account no longer exists"
            ),
        )

    if user.account_status != "active":
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "This account is not active"
            ),
        )

    return user


def require_admin(
    user: User = Depends(
        get_current_user
    ),
):
    if user.role != "admin":
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin access required"
            ),
        )

    return user


def require_verified_user(
    user: User = Depends(
        get_current_user
    ),
):
    if (
        user.verification_status
        != "verified"
    ):
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Account must be verified first"
            ),
        )

    return user


@router.post("/verification/reply")
def reply_to_verification(
    data: VerificationReplyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.verification_status != "needs_info":
        raise HTTPException(status_code=409, detail="No information request is pending")

    request = db.scalar(
        select(VerificationRequest).where(VerificationRequest.user_id == user.id)
    )
    if request is None or request.status != "needs_info":
        raise HTTPException(status_code=409, detail="No information request is pending")

    response = data.response.strip()
    if len(response) < 3:
        raise HTTPException(status_code=422, detail="Please enter a response")

    request.student_response = response
    request.status = "pending"
    request.submitted_at = datetime.now(timezone.utc)
    request.reviewed_at = None
    user.verification_status = "pending"
    db.commit()
    return {"message": "Your information was sent for review", "verification_status": "pending"}


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def current_user(
    user: User = Depends(
        get_current_user
    ),
):
    return CurrentUserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        verification_status=
            user.verification_status,
        verification_welcome_seen=(
            user.verification_welcome_seen
        ),
        verification_admin_note=(
            user.verification_request.admin_note
            if user.verification_status == "needs_info"
            and user.verification_request is not None
            else None
        ),
    )


@router.patch(
    "/verification-welcome-seen",
)
def mark_verification_welcome_seen(
    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    user.verification_welcome_seen = True

    db.commit()
    db.refresh(user)

    return {
        "message": (
            "Verification welcome "
            "marked as seen"
        ),
        "verification_welcome_seen": (
            user.verification_welcome_seen
        ),
    }