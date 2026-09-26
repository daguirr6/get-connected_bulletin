from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.routes.auth import require_admin
from backend.app.schemas.admin import (
    PendingProfileResponse,
    PendingVerificationResponse,
    ProfileReviewRequest,
    ProfileReviewResponse,
    VerificationUpdateRequest,
    VerificationUpdateResponse,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get(
    "/verifications/pending",
    response_model=list[PendingVerificationResponse],
)
def get_pending_verifications(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    requests = db.scalars(
        select(VerificationRequest)
        .where(VerificationRequest.status == "pending")
        .order_by(VerificationRequest.submitted_at)
    ).all()

    return [
        PendingVerificationResponse(
            id=request.id,
            user_id=request.user_id,
            full_name=request.full_name,
            major=request.major,
            status=request.status,
            submitted_at=request.submitted_at,
        )
        for request in requests
    ]


@router.patch(
    "/verifications/{verification_id}",
    response_model=VerificationUpdateResponse,
)
def update_verification(
    verification_id: int,
    data: VerificationUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    verification = db.get(
        VerificationRequest,
        verification_id,
    )

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found",
        )

    user = db.get(User, verification.user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    verification.status = data.status
    verification.admin_note = data.admin_note
    verification.reviewed_at = datetime.now(timezone.utc)

    user.verification_status = data.status

    db.commit()

    if data.status == "verified":
        message = "Student verification approved"
    else:
        message = "Student verification needs more information"

    return VerificationUpdateResponse(
        username=user.username,
        verification_status=user.verification_status,
        message=message,
    )


@router.get(
    "/profiles/pending",
    response_model=list[PendingProfileResponse],
)
def get_pending_profiles(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profiles = db.scalars(
        select(Profile)
        .where(Profile.status == "pending")
        .order_by(Profile.submitted_at)
    ).all()

    results = []

    for profile in profiles:
        user = db.get(User, profile.user_id)

        if user is None:
            continue

        results.append(
            PendingProfileResponse(
                id=profile.id,
                user_id=profile.user_id,
                username=user.username,
                about_me=profile.about_me,
                interests=profile.interests,
                favorite_quote=profile.favorite_quote,
                background_style=profile.background_style,
                font_style=profile.font_style,
                status=profile.status,
                submitted_at=profile.submitted_at,
            )
        )

    return results


@router.patch(
    "/profiles/{profile_id}",
    response_model=ProfileReviewResponse,
)
def review_profile(
    profile_id: int,
    data: ProfileReviewRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = db.get(Profile, profile_id)

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    if profile.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile is not awaiting review",
        )

    if (
        data.status == "needs_changes"
        and not data.admin_note
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explain what needs to be changed",
        )

    user = db.get(User, profile.user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    profile.status = data.status
    profile.admin_note = (
        data.admin_note.strip()
        if data.admin_note
        else None
    )
    profile.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)

    if profile.status == "approved":
        message = "Profile approved"
    else:
        message = "Profile returned for changes"

    return ProfileReviewResponse(
        id=profile.id,
        user_id=profile.user_id,
        username=user.username,
        status=profile.status,
        admin_note=profile.admin_note,
        reviewed_at=profile.reviewed_at,
        message=message,
    )