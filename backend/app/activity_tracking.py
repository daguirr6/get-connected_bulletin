from datetime import (
    datetime,
    timezone,
)
from zoneinfo import ZoneInfo

from sqlalchemy import (
    event,
    inspect,
)
from sqlalchemy.dialects.postgresql import (
    insert,
)

from backend.app.models.site_activity import (
    DailySiteActivity,
    HourlySiteActivity,
)
from backend.app.models.user import User


MASON_TIMEZONE = ZoneInfo(
    "America/New_York"
)


def make_aware(
    value: datetime,
) -> datetime:
    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc
        )

    return value


@event.listens_for(
    User,
    "after_update",
)
def track_user_activity(
    mapper,
    connection,
    user,
):
    state = inspect(user)

    if not (
        state
        .attrs
        .last_seen_at
        .history
        .has_changes()
    ):
        return

    if user.role == "admin":
        return

    if user.last_seen_at is None:
        return

    seen_at = make_aware(
        user.last_seen_at
    )

    local_time = (
        seen_at.astimezone(
            MASON_TIMEZONE
        )
    )

    activity_date = (
        local_time.date()
    )

    activity_hour = (
        local_time.hour
    )

    daily_statement = (
        insert(
            DailySiteActivity
        )
        .values(
            user_id=user.id,
            activity_date=(
                activity_date
            ),
            first_seen_at=seen_at,
            last_seen_at=seen_at,
        )
        .on_conflict_do_update(
            index_elements=[
                "user_id",
                "activity_date",
            ],
            set_={
                "last_seen_at":
                    seen_at,
            },
        )
    )

    connection.execute(
        daily_statement
    )

    hourly_statement = (
        insert(
            HourlySiteActivity
        )
        .values(
            user_id=user.id,
            activity_date=(
                activity_date
            ),
            activity_hour=(
                activity_hour
            ),
            first_seen_at=seen_at,
            last_seen_at=seen_at,
        )
        .on_conflict_do_update(
            index_elements=[
                "user_id",
                "activity_date",
                "activity_hour",
            ],
            set_={
                "last_seen_at":
                    seen_at,
            },
        )
    )

    connection.execute(
        hourly_statement
    )