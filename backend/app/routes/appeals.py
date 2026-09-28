from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.appeal import Appeal
from backend.app.models.moderation_action import ModerationAction
from backend.app.models.user import User
from backend.app.routes.auth import (
    require_admin,
    require_verified_user,
)
from backend.app.schemas.appeal import (
    AppealCreate,
    AppealResponse,
    AppealReviewRequest,
    AppealReviewResponse,
    MyModerationActionResponse,
    PendingAppealResponse,
)


router = APIRouter()


@router.get(
    "/moderation/me",
    response_model=list[MyModerationActionResponse],
    tags=["Moderation"],
)
def get_my_moderation_actions(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    actions = db.scalars(
        select(ModerationAction)
        .where(
            ModerationAction.user_id == user.id
        )
        .order_by(
            ModerationAction.created_at.desc()
        )
    ).all()

    results = []

    for action in actions:
        appeal = db.scalar(
            select(Appeal).where(
                Appeal.moderation_action_id
                == action.id
            )
        )

        results.append(
            MyModerationActionResponse(
                id=action.id,
                level=action.level,
                public_summary=action.public_summary,
                status=action.status,
                created_at=action.created_at,
                expires_at=action.expires_at,
                appeal_id=(
                    appeal.id
                    if appeal
                    else None
                ),
                appeal_status=(
                    appeal.status
                    if appeal
                    else None
                ),
            )
        )

    return results


@router.post(
    "/appeals/{moderation_action_id}",
    response_model=AppealResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Appeals"],
)
def create_appeal(
    moderation_action_id: int,
    data: AppealCreate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    action = db.get(
        ModerationAction,
        moderation_action_id,
    )

    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moderation action not found",
        )

    if action.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moderation action not found",
        )

    if (
        action.status != "active"
        or action.overturned_at is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This moderation action cannot be appealed",
        )

    now = datetime.now(
        timezone.utc
    )

    if (
        action.expires_at is not None
        and action.expires_at <= now
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This moderation action has expired",
        )

    existing_appeal = db.scalar(
        select(Appeal).where(
            Appeal.moderation_action_id
            == action.id
        )
    )

    if existing_appeal is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An appeal has already been submitted for this moderation action",
        )

    reason = data.reason.strip()

    if len(reason) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide more information about your appeal",
        )

    appeal = Appeal(
        moderation_action_id=action.id,
        user_id=user.id,
        reason=reason,
        status="pending",
    )

    db.add(appeal)
    db.commit()
    db.refresh(appeal)

    return AppealResponse(
        id=appeal.id,
        moderation_action_id=action.id,
        moderation_level=action.level,
        public_summary=action.public_summary,
        reason=appeal.reason,
        status=appeal.status,
        response_to_user=appeal.response_to_user,
        created_at=appeal.created_at,
        reviewed_at=appeal.reviewed_at,
    )


@router.get(
    "/appeals/me",
    response_model=list[AppealResponse],
    tags=["Appeals"],
)
def get_my_appeals(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    appeals = db.scalars(
        select(Appeal)
        .where(
            Appeal.user_id == user.id
        )
        .order_by(
            Appeal.created_at.desc()
        )
    ).all()

    results = []

    for appeal in appeals:
        action = db.get(
            ModerationAction,
            appeal.moderation_action_id,
        )

        if action is None:
            continue

        results.append(
            AppealResponse(
                id=appeal.id,
                moderation_action_id=action.id,
                moderation_level=action.level,
                public_summary=action.public_summary,
                reason=appeal.reason,
                status=appeal.status,
                response_to_user=appeal.response_to_user,
                created_at=appeal.created_at,
                reviewed_at=appeal.reviewed_at,
            )
        )

    return results


@router.get(
    "/admin/appeals/pending",
    response_model=list[PendingAppealResponse],
    tags=["Admin - Appeals"],
)
def get_pending_appeals(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    appeals = db.scalars(
        select(Appeal)
        .where(
            Appeal.status == "pending"
        )
        .order_by(
            Appeal.created_at
        )
    ).all()

    results = []

    for appeal in appeals:
        user = db.get(
            User,
            appeal.user_id,
        )

        action = db.get(
            ModerationAction,
            appeal.moderation_action_id,
        )

        if (
            user is None
            or action is None
        ):
            continue

        results.append(
            PendingAppealResponse(
                id=appeal.id,
                moderation_action_id=action.id,
                user_id=user.id,
                username=user.username,
                moderation_level=action.level,
                public_summary=action.public_summary,
                reason=appeal.reason,
                source_report_id=action.source_report_id,
                created_at=appeal.created_at,
            )
        )

    return results


@router.patch(
    "/admin/appeals/{appeal_id}",
    response_model=AppealReviewResponse,
    tags=["Admin - Appeals"],
)
def review_appeal(
    appeal_id: int,
    data: AppealReviewRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    appeal = db.get(
        Appeal,
        appeal_id,
    )

    if appeal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appeal not found",
        )

    if appeal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Appeal has already been reviewed",
        )

    action = db.get(
        ModerationAction,
        appeal.moderation_action_id,
    )

    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moderation action not found",
        )

    response_to_user = (
        data.response_to_user.strip()
    )

    if not response_to_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a response to the student",
        )

    reviewed_at = datetime.now(
        timezone.utc
    )

    appeal.status = data.decision
    appeal.response_to_user = response_to_user

    appeal.private_admin_note = (
        data.private_admin_note.strip()
        if data.private_admin_note
        else None
    )

    appeal.reviewed_at = reviewed_at

    if data.decision == "accepted":
        action.status = "overturned"
        action.overturned_at = reviewed_at

    db.commit()
    db.refresh(appeal)
    db.refresh(action)

    return AppealReviewResponse(
        appeal_id=appeal.id,
        moderation_action_id=action.id,
        user_id=appeal.user_id,
        decision=appeal.status,
        moderation_action_status=action.status,
        response_to_user=appeal.response_to_user,
        reviewed_at=appeal.reviewed_at,
    )