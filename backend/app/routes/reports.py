from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.report import Report
from backend.app.models.user import User
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.report import (
    ReportCreate,
    ReportResponse,
)


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


@router.post(
    "/{target_user_id}",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
def report_user(
    target_user_id: int,
    data: ReportCreate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    if target_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report yourself",
        )

    target_user = db.get(
        User,
        target_user_id,
    )

    if (
        target_user is None
        or target_user.account_status != "active"
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    existing_pending_report = db.scalar(
        select(Report).where(
            Report.reporter_id == user.id,
            Report.reported_user_id == target_user_id,
            Report.status == "pending",
        )
    )

    if existing_pending_report is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a report awaiting review for this user",
        )

    details = data.details.strip()

    if len(details) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide more information about the report",
        )

    report = Report(
        reporter_id=user.id,
        reported_user_id=target_user_id,
        category=data.category,
        details=details,
        status="pending",
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportResponse(
        id=report.id,
        reported_user_id=target_user.id,
        username=target_user.username,
        category=report.category,
        details=report.details,
        status=report.status,
        created_at=report.created_at,
        reviewed_at=report.reviewed_at,
    )


@router.get(
    "/me",
    response_model=list[ReportResponse],
)
def get_my_reports(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    reports = db.scalars(
        select(Report)
        .where(
            Report.reporter_id == user.id
        )
        .order_by(
            Report.created_at.desc()
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
            ReportResponse(
                id=report.id,
                reported_user_id=reported_user.id,
                username=reported_user.username,
                category=report.category,
                details=report.details,
                status=report.status,
                created_at=report.created_at,
                reviewed_at=report.reviewed_at,
            )
        )

    return results