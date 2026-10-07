from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.moderation_action import ModerationAction
from backend.app.models.post_it import PostIt
from backend.app.models.profile import Profile
from backend.app.models.profile_song import ProfileSong
from backend.app.models.report import Report
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.routes.auth import require_admin
from backend.app.schemas.admin import (
    ModerationActionResponse,
    PendingProfileResponse,
    PendingReportResponse,
    PendingVerificationResponse,
    ProfileReviewRequest,
    ProfileReviewResponse,
    ReportReviewRequest,
    ReportReviewResponse,
    VerificationUpdateRequest,
    VerificationUpdateResponse,
)
from backend.app.schemas.profile import ProfileSongResponse


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def get_profile_picture_url(
    profile: Profile,
) -> str | None:
    if not profile.profile_picture:
        return None

    return (
        "/uploads/profile_pictures/"
        f"{profile.profile_picture}"
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
        .where(
            VerificationRequest.status == "pending"
        )
        .order_by(
            VerificationRequest.submitted_at
        )
    ).all()

    return [
        PendingVerificationResponse(
            id=request.id,
            user_id=request.user_id,
            full_name=request.full_name,
            major=request.major,
            status=request.status,
            submitted_at=request.submitted_at,
            student_response=request.student_response,
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

    user = db.get(
        User,
        verification.user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if data.status == "needs_info" and not (data.admin_note or "").strip():
        raise HTTPException(status_code=400, detail="Explain what information is needed")

    verification.status = data.status
    verification.admin_note = data.admin_note
    if data.status == "needs_info":
        verification.student_response = None

    verification.reviewed_at = datetime.now(
        timezone.utc
    )

    user.verification_status = data.status

    db.commit()

    if data.status == "verified":
        message = "Student verification approved"
    else:
        message = (
            "Student verification needs more information"
        )

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
        .where(
            Profile.status == "pending"
        )
        .order_by(
            Profile.submitted_at
        )
    ).all()

    results = []

    for profile in profiles:
        user = db.get(
            User,
            profile.user_id,
        )

        if user is None:
            continue

        post_it = db.scalar(
            select(PostIt).where(
                PostIt.user_id == profile.user_id
            )
        )

        verification = db.scalar(
            select(VerificationRequest).where(
                VerificationRequest.user_id
                == profile.user_id
            )
        )

        songs = db.scalars(
            select(ProfileSong)
            .where(
                ProfileSong.profile_id == profile.id
            )
            .order_by(
                ProfileSong.position,
                ProfileSong.id,
            )
        ).all()

        display_name = (
            post_it.display_name
            if post_it is not None
            else user.username
        )

        major = (
            verification.major
            if verification is not None
            else "Unknown"
        )

        results.append(
            PendingProfileResponse(
                id=profile.id,
                user_id=profile.user_id,
                username=user.username,
                display_name=display_name,
                major=major,
                about_me=profile.about_me,
                interests=profile.interests,
                favorite_quote=profile.favorite_quote,
                class_year=profile.class_year,
                aspiration=profile.aspiration,
                looking_for=profile.looking_for,
                ask_me_about=profile.ask_me_about,
                current_obsession=profile.current_obsession,
                background_style=profile.background_style,
                font_style=profile.font_style,
                profile_picture_url=(
                    get_profile_picture_url(
                        profile
                    )
                ),
                songs=[
                    ProfileSongResponse(
                        id=song.id,
                        title=song.title,
                        artist=song.artist,
                        position=song.position,
                    )
                    for song in songs
                ],
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
    profile = db.get(
        Profile,
        profile_id,
    )

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

    user = db.get(
        User,
        profile.user_id,
    )

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

    profile.reviewed_at = datetime.now(
        timezone.utc
    )

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


@router.get(
    "/reports/pending",
    response_model=list[PendingReportResponse],
)
def get_pending_reports(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    reports = db.scalars(
        select(Report)
        .where(
            Report.status == "pending"
        )
        .order_by(
            Report.created_at
        )
    ).all()

    results = []

    for report in reports:
        reported_user = db.get(
            User,
            report.reported_user_id,
        )

        if reported_user is None:
            continue

        results.append(
            PendingReportResponse(
                id=report.id,
                reporter_id=report.reporter_id,
                reported_user_id=report.reported_user_id,
                reported_username=reported_user.username,
                category=report.category,
                details=report.details,
                status=report.status,
                created_at=report.created_at,
            )
        )

    return results


@router.patch(
    "/reports/{report_id}",
    response_model=ReportReviewResponse,
)
def review_report(
    report_id: int,
    data: ReportReviewRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.get(
        Report,
        report_id,
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    if report.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Report has already been reviewed",
        )

    reported_user = db.get(
        User,
        report.reported_user_id,
    )

    if reported_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reported user not found",
        )

    if data.decision == "dismissed":
        report.status = "dismissed"

        report.admin_note = (
            data.private_admin_note.strip()
            if data.private_admin_note
            else None
        )

        report.reviewed_at = datetime.now(
            timezone.utc
        )

        db.commit()

        return ReportReviewResponse(
            report_id=report.id,
            reported_user_id=reported_user.id,
            reported_username=reported_user.username,
            decision="dismissed",
            moderation_level=None,
            message="Report dismissed",
        )

    if data.level is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Choose a moderation level "
                "for an upheld report"
            ),
        )

    if (
        data.public_summary is None
        or not data.public_summary.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Provide a public moderation summary"
            ),
        )

    report.status = "upheld"

    report.admin_note = (
        data.private_admin_note.strip()
        if data.private_admin_note
        else None
    )

    report.reviewed_at = datetime.now(
        timezone.utc
    )

    action = ModerationAction(
        user_id=reported_user.id,
        source_report_id=report.id,
        admin_id=admin.id,
        level=data.level,
        public_summary=(
            data.public_summary.strip()
        ),
        private_admin_note=(
            data.private_admin_note.strip()
            if data.private_admin_note
            else None
        ),
        status="active",
    )

    db.add(action)
    db.commit()

    return ReportReviewResponse(
        report_id=report.id,
        reported_user_id=reported_user.id,
        reported_username=reported_user.username,
        decision="upheld",
        moderation_level=data.level,
        message=(
            "Report upheld and moderation action created"
        ),
    )


@router.get(
    "/users/{user_id}/moderation",
    response_model=list[ModerationActionResponse],
)
def get_user_moderation_actions(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(
        User,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    actions = db.scalars(
        select(ModerationAction)
        .where(
            ModerationAction.user_id == user_id
        )
        .order_by(
            ModerationAction.created_at.desc()
        )
    ).all()

    return [
        ModerationActionResponse(
            id=action.id,
            user_id=action.user_id,
            level=action.level,
            public_summary=action.public_summary,
            status=action.status,
            created_at=action.created_at,
            expires_at=action.expires_at,
        )
        for action in actions
    ]