from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.routes.auth import require_admin
from backend.app.schemas.admin import (
    PendingVerificationResponse,
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
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    requests = db.scalars(
        select(VerificationRequest)
        .where(VerificationRequest.status == "pending")
        .order_by(VerificationRequest.submitted_at)
    ).all()

    return requests


@router.patch(
    "/verifications/{verification_id}",
    response_model=VerificationUpdateResponse,
)
def review_verification(
    verification_id: int,
    data: VerificationUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    verification = db.get(VerificationRequest, verification_id)

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found",
        )

    user = db.get(User, verification.user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found",
        )

    verification.status = data.status
    verification.admin_note = data.admin_note
    verification.reviewed_at = datetime.now(timezone.utc)

    user.verification_status = data.status

    db.commit()

    return VerificationUpdateResponse(
        username=user.username,
        verification_status=user.verification_status,
        message="Verification request updated.",
    )