from datetime import (
    datetime,
    timezone,
)

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.orm import Session

from backend.app.database import (
    get_db,
)
from backend.app.models.changelog import (
    ChangelogEntry,
)
from backend.app.models.user import (
    User,
)
from backend.app.routes.auth import (
    get_current_user,
)
from backend.app.schemas.changelog import (
    ChangelogEntryResponse,
    ChangelogResponse,
    ChangelogSeenResponse,
)


router = APIRouter(
    prefix="/changelog",
    tags=["Changelog"],
)


def get_visible_entries(
    db: Session,
) -> list[ChangelogEntry]:
    now = datetime.now(
        timezone.utc
    )

    return db.scalars(
        select(
            ChangelogEntry
        )
        .where(
            ChangelogEntry
            .is_published
            .is_(True),

            ChangelogEntry
            .published_at
            <= now,
        )
        .order_by(
            ChangelogEntry
            .published_at
            .desc(),

            ChangelogEntry
            .sort_order,

            ChangelogEntry.id.desc(),
        )
    ).all()


@router.get(
    "",
    response_model=
        ChangelogResponse,
)
def get_changelog(
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    entries = get_visible_entries(
        db
    )

    last_seen = (
        user.last_seen_changelog_at
    )

    response_entries = []
    unread_count = 0

    for entry in entries:
        is_unread = (
            last_seen is None
            or entry.published_at
            > last_seen
        )

        if is_unread:
            unread_count += 1

        response_entries.append(
            ChangelogEntryResponse(
                id=entry.id,
                title=entry.title,
                category=entry.category,
                summary=entry.summary,
                published_at=
                    entry.published_at,
                is_unread=is_unread,
            )
        )

    return ChangelogResponse(
        entries=response_entries,
        unread_count=unread_count,
    )


@router.patch(
    "/seen",
    response_model=
        ChangelogSeenResponse,
)
def mark_changelog_seen(
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    now = datetime.now(
        timezone.utc
    )

    newest_published_at = (
        db.scalar(
            select(
                func.max(
                    ChangelogEntry
                    .published_at
                )
            )
            .where(
                ChangelogEntry
                .is_published
                .is_(True),

                ChangelogEntry
                .published_at
                <= now,
            )
        )
    )

    if (
        newest_published_at
        is not None
    ):
        user.last_seen_changelog_at = (
            newest_published_at
        )

        db.commit()

    return ChangelogSeenResponse(
        unread_count=0,
        message=(
            "Changelog marked as seen"
        ),
    )