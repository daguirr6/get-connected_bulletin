from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.models.moderation_action import ModerationAction
from backend.app.schemas.moderation import PublicModerationNotice


def get_public_moderation(
    db: Session,
    user_id: int,
) -> PublicModerationNotice:
    now = datetime.now(timezone.utc)

    actions = db.scalars(
        select(ModerationAction)
        .where(
            ModerationAction.user_id == user_id,
            ModerationAction.status == "active",
            ModerationAction.overturned_at.is_(None),
            or_(
                ModerationAction.expires_at.is_(None),
                ModerationAction.expires_at > now,
            ),
        )
        .order_by(
            ModerationAction.created_at.desc()
        )
    ).all()

    if not actions:
        return PublicModerationNotice(
            level="none",
            notices=[],
        )

    red_actions = [
        action
        for action in actions
        if action.level == "red"
    ]

    yellow_actions = [
        action
        for action in actions
        if action.level == "yellow"
    ]

    if red_actions:
        level = "red"

    elif len(yellow_actions) >= 2:
        level = "red"

    else:
        level = "yellow"

    notices = [
        action.public_summary
        for action in actions
    ]

    return PublicModerationNotice(
        level=level,
        notices=notices,
    )