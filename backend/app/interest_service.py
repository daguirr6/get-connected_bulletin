import hashlib
import re
import unicodedata

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.interest import Interest
from backend.app.models.profile import Profile
from backend.app.models.profile_interest import ProfileInterest
from backend.app.models.user import User


MAX_PROFILE_INTERESTS = 12
COMMUNITY_INTEREST_CATEGORY = "Community Added"

INTEREST_ALIASES = {
    "video games": "gaming",
    "videogames": "gaming",
    "games": "gaming",
    "game": "gaming",
    "tabletop": "tabletop rpgs",
    "dnd": "tabletop rpgs",
    "d&d": "tabletop rpgs",
    "tv": "tv shows",
    "television": "tv shows",
    "film": "movies",
    "films": "movies",
    "reading": "books",
    "comic books": "comics",
    "photos": "photography",
    "film making": "filmmaking",
    "film-making": "filmmaking",
    "programming": "coding",
    "computer programming": "coding",
    "software development": "coding",
    "ai": "ai & machine learning",
    "machine learning": "ai & machine learning",
    "cyber security": "cybersecurity",
    "3d printing": "3d printing",
    "3d-printing": "3d printing",
    "birds": "birdwatching",
    "bird watching": "birdwatching",
    "birding": "birdwatching",
    "fitness": "gym & fitness",
    "gym": "gym & fitness",
    "working out": "gym & fitness",
    "workout": "gym & fitness",
    "football": "soccer",
    "clubs": "clubs & organizations",
    "student clubs": "clubs & organizations",
    "campus clubs": "clubs & organizations",
    "languages": "language learning",
}


def clean_interest_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return " ".join(normalized.strip().split())


def normalize_interest_name(value: str) -> str:
    return clean_interest_name(value).casefold()


def validate_new_interest_name(value: str) -> str:
    cleaned = clean_interest_name(value)

    if len(cleaned) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New interests must be at least 2 characters long",
        )

    if len(cleaned) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New interests must be 50 characters or shorter",
        )

    if not any(character.isalnum() for character in cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New interests must contain at least one letter or number",
        )

    if any(
        unicodedata.category(character).startswith("C")
        for character in cleaned
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interest contains invalid characters",
        )

    return cleaned


def make_community_interest_slug(
    display_name: str,
    normalized_name: str,
) -> str:
    ascii_name = (
        unicodedata.normalize("NFKD", display_name)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )

    base = re.sub(r"[^a-z0-9]+", "-", ascii_name).strip("-")

    if not base:
        base = "interest"

    digest = hashlib.sha1(
        normalized_name.encode("utf-8")
    ).hexdigest()[:8]

    return f"{base[:60]}-{digest}"[:80]


def get_interest_catalog(db: Session) -> list[Interest]:
    return db.scalars(
        select(Interest)
        .where(Interest.is_active.is_(True))
        .order_by(
            Interest.category,
            Interest.sort_order,
            Interest.name,
        )
    ).all()


def get_selected_interests(
    db: Session,
    profile_id: int,
) -> list[Interest]:
    return db.scalars(
        select(Interest)
        .join(
            ProfileInterest,
            ProfileInterest.interest_id == Interest.id,
        )
        .where(
            ProfileInterest.profile_id == profile_id,
            Interest.is_active.is_(True),
        )
        .order_by(
            Interest.category,
            Interest.sort_order,
            Interest.name,
        )
    ).all()


def get_or_create_interest(
    db: Session,
    display_name: str,
    user_id: int,
) -> Interest:
    cleaned = validate_new_interest_name(display_name)
    normalized = normalize_interest_name(cleaned)
    lookup_name = INTEREST_ALIASES.get(normalized, normalized)

    existing = db.scalar(
        select(Interest).where(
            Interest.normalized_name == lookup_name
        )
    )

    if existing is not None:
        if not existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That interest is not currently available",
            )

        return existing

    interest = Interest(
        name=cleaned,
        normalized_name=normalized,
        slug=make_community_interest_slug(
            cleaned,
            normalized,
        ),
        category=COMMUNITY_INTEREST_CATEGORY,
        sort_order=10000,
        is_active=True,
        is_community_created=True,
        created_by_user_id=user_id,
    )

    try:
        with db.begin_nested():
            db.add(interest)
            db.flush()

        return interest

    except IntegrityError:
        existing = db.scalar(
            select(Interest).where(
                Interest.normalized_name == normalized
            )
        )

        if existing is None:
            raise

        if not existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That interest is not currently available",
            )

        return existing


def sync_profile_interests(
    db: Session,
    profile: Profile,
    user: User,
    selected_interest_ids: list[int],
    new_interests: list[str],
) -> list[Interest]:
    target_ids = list(dict.fromkeys(selected_interest_ids))

    if target_ids:
        active_rows = db.scalars(
            select(Interest).where(
                Interest.id.in_(target_ids),
                Interest.is_active.is_(True),
            )
        ).all()

        active_ids = {
            interest.id
            for interest in active_rows
        }

        if any(
            interest_id not in active_ids
            for interest_id in target_ids
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more selected interests are unavailable",
            )

    cleaned_new_names = []
    seen_new_names = set()

    for raw_name in new_interests:
        cleaned = validate_new_interest_name(raw_name)
        normalized = normalize_interest_name(cleaned)

        if normalized in seen_new_names:
            continue

        seen_new_names.add(normalized)
        cleaned_new_names.append(cleaned)

    for cleaned_name in cleaned_new_names:
        interest = get_or_create_interest(
            db,
            cleaned_name,
            user.id,
        )

        if interest.id not in target_ids:
            target_ids.append(interest.id)

    if len(target_ids) > MAX_PROFILE_INTERESTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Profiles can have up to "
                f"{MAX_PROFILE_INTERESTS} interests"
            ),
        )

    current_links = db.scalars(
        select(ProfileInterest).where(
            ProfileInterest.profile_id == profile.id
        )
    ).all()

    current_ids = {
        link.interest_id
        for link in current_links
    }

    target_id_set = set(target_ids)

    for link in current_links:
        if link.interest_id not in target_id_set:
            db.delete(link)

    for interest_id in target_ids:
        if interest_id in current_ids:
            continue

        db.add(
            ProfileInterest(
                profile_id=profile.id,
                interest_id=interest_id,
            )
        )

    if not target_ids:
        profile.interests = None
        return []

    selected_rows = db.scalars(
        select(Interest).where(
            Interest.id.in_(target_ids)
        )
    ).all()

    selected_by_id = {
        interest.id: interest
        for interest in selected_rows
    }

    ordered_interests = [
        selected_by_id[interest_id]
        for interest_id in target_ids
        if interest_id in selected_by_id
    ]

    profile.interests = ", ".join(
        interest.name
        for interest in ordered_interests
    )

    return ordered_interests