from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.models.user import User
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.profile import (
    ProfileResponse,
    ProfileSubmitResponse,
    ProfileUpdate,
    PublicProfileResponse,
)


router = APIRouter(
    prefix="/profiles",
    tags=["Profiles"],
)


def make_profile_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        about_me=profile.about_me,
        interests=profile.interests,
        favorite_quote=profile.favorite_quote,
        background_style=profile.background_style,
        font_style=profile.font_style,
        status=profile.status,
        admin_note=profile.admin_note,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        submitted_at=profile.submitted_at,
        reviewed_at=profile.reviewed_at,
    )


@router.get(
    "/me",
    response_model=ProfileResponse,
)
def get_my_profile(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    profile = db.scalar(
        select(Profile).where(
            Profile.user_id == user.id
        )
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not created yet",
        )

    return make_profile_response(profile)


@router.patch(
    "/me",
    response_model=ProfileResponse,
)
def update_my_profile(
    data: ProfileUpdate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    profile = db.scalar(
        select(Profile).where(
            Profile.user_id == user.id
        )
    )

    if profile is None:
        profile = Profile(
            user_id=user.id,
            status="draft",
        )

        db.add(profile)

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if isinstance(value, str):
            value = value.strip()

            if not value:
                value = None

        setattr(profile, field, value)

    if profile.status in {"pending", "approved", "needs_changes"}:
        profile.status = "draft"
        profile.submitted_at = None
        profile.reviewed_at = None
        profile.admin_note = None

    db.commit()
    db.refresh(profile)

    return make_profile_response(profile)


@router.post(
    "/me/submit",
    response_model=ProfileSubmitResponse,
)
def submit_my_profile(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    profile = db.scalar(
        select(Profile).where(
            Profile.user_id == user.id
        )
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Create your profile before submitting it",
        )

    has_content = any(
        [
            profile.about_me,
            profile.interests,
            profile.favorite_quote,
            profile.background_style,
            profile.font_style,
        ]
    )

    if not has_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add something to your profile before submitting it",
        )

    profile.status = "pending"
    profile.submitted_at = datetime.now(timezone.utc)
    profile.reviewed_at = None
    profile.admin_note = None

    db.commit()

    return ProfileSubmitResponse(
        status="pending",
        message="Your profile was submitted for review",
    )


@router.get(
    "/{user_id}",
    response_model=PublicProfileResponse,
)
def get_public_profile(
    user_id: int,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    target_user = db.get(User, user_id)

    if (
        target_user is None
        or target_user.verification_status != "verified"
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile = db.scalar(
        select(Profile).where(
            Profile.user_id == user_id,
            Profile.status == "approved",
        )
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return PublicProfileResponse(
        user_id=profile.user_id,
        about_me=profile.about_me,
        interests=profile.interests,
        favorite_quote=profile.favorite_quote,
        background_style=profile.background_style,
        font_style=profile.font_style,
    )