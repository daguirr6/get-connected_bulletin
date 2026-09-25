from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.post_it import PostIt
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.post_it import (
    PostItCreate,
    PostItResponse,
    PostItUpdate,
)


router = APIRouter(
    prefix="/post-its",
    tags=["Post-its"],
)


@router.post(
    "",
    response_model=PostItResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_post_it(
    data: PostItCreate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    existing_post = db.scalar(
        select(PostIt).where(PostIt.user_id == user.id)
    )

    if existing_post:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a Post-it",
        )

    verification = db.scalar(
        select(VerificationRequest).where(
            VerificationRequest.user_id == user.id
        )
    )

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification record not found",
        )

    post_it = PostIt(
        user_id=user.id,
        display_name=data.display_name.strip(),
        fun_facts=data.fun_facts.strip(),
        song_title=data.song_title.strip(),
        song_artist=data.song_artist.strip() if data.song_artist else None,
    )

    db.add(post_it)
    db.commit()
    db.refresh(post_it)

    return PostItResponse(
        id=post_it.id,
        user_id=post_it.user_id,
        display_name=post_it.display_name,
        major=verification.major,
        fun_facts=post_it.fun_facts,
        song_title=post_it.song_title,
        song_artist=post_it.song_artist,
        created_at=post_it.created_at,
    )


@router.get(
    "",
    response_model=list[PostItResponse],
)
def get_post_its(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(PostIt, VerificationRequest.major)
        .join(
            VerificationRequest,
            VerificationRequest.user_id == PostIt.user_id,
        )
        .where(VerificationRequest.status == "verified")
        .order_by(PostIt.created_at.desc())
    ).all()

    post_its = []

    for post_it, major in rows:
        post_its.append(
            PostItResponse(
                id=post_it.id,
                user_id=post_it.user_id,
                display_name=post_it.display_name,
                major=major,
                fun_facts=post_it.fun_facts,
                song_title=post_it.song_title,
                song_artist=post_it.song_artist,
                created_at=post_it.created_at,
            )
        )

    return post_its


@router.get(
    "/me",
    response_model=PostItResponse,
)
def get_my_post_it(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(PostIt, VerificationRequest.major)
        .join(
            VerificationRequest,
            VerificationRequest.user_id == PostIt.user_id,
        )
        .where(
            PostIt.user_id == user.id,
            VerificationRequest.status == "verified",
        )
    ).first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not have a Post-it yet",
        )

    post_it, major = row

    return PostItResponse(
        id=post_it.id,
        user_id=post_it.user_id,
        display_name=post_it.display_name,
        major=major,
        fun_facts=post_it.fun_facts,
        song_title=post_it.song_title,
        song_artist=post_it.song_artist,
        created_at=post_it.created_at,
    )


@router.patch(
    "/me",
    response_model=PostItResponse,
)
def update_my_post_it(
    data: PostItUpdate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    post_it = db.scalar(
        select(PostIt).where(PostIt.user_id == user.id)
    )

    if post_it is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not have a Post-it yet",
        )

    verification = db.scalar(
        select(VerificationRequest).where(
            VerificationRequest.user_id == user.id
        )
    )

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification record not found",
        )

    updates = data.model_dump(exclude_unset=True)

    if "display_name" in updates:
        display_name = updates["display_name"].strip()

        if not display_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Display name cannot be empty",
            )

        post_it.display_name = display_name

    if "fun_facts" in updates:
        fun_facts = updates["fun_facts"].strip()

        if not fun_facts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fun facts cannot be empty",
            )

        post_it.fun_facts = fun_facts

    if "song_title" in updates:
        song_title = updates["song_title"].strip()

        if not song_title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Song title cannot be empty",
            )

        post_it.song_title = song_title

    if "song_artist" in updates:
        song_artist = updates["song_artist"]

        if song_artist is None:
            post_it.song_artist = None
        else:
            song_artist = song_artist.strip()
            post_it.song_artist = song_artist or None

    db.commit()
    db.refresh(post_it)

    return PostItResponse(
        id=post_it.id,
        user_id=post_it.user_id,
        display_name=post_it.display_name,
        major=verification.major,
        fun_facts=post_it.fun_facts,
        song_title=post_it.song_title,
        song_artist=post_it.song_artist,
        created_at=post_it.created_at,
    )