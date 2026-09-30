from collections import defaultdict, deque
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status

from backend.app.security import decode_access_token


class SlidingWindowRateLimiter:
    def __init__(self):
        self.buckets = defaultdict(deque)
        self.lock = Lock()

    def check(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> int | None:
        now = monotonic()
        cutoff = now - window_seconds

        with self.lock:
            events = self.buckets[key]

            while (
                events
                and events[0] <= cutoff
            ):
                events.popleft()

            if len(events) >= limit:
                retry_after = ceil(
                    window_seconds
                    - (now - events[0])
                )

                return max(
                    1,
                    retry_after,
                )

            events.append(now)

        return None


limiter = SlidingWindowRateLimiter()


def get_client_ip(
    request: Request,
) -> str:
    cloudflare_ip = request.headers.get(
        "CF-Connecting-IP"
    )

    if cloudflare_ip:
        return cloudflare_ip.strip()

    forwarded_for = request.headers.get(
        "X-Forwarded-For"
    )

    if forwarded_for:
        return (
            forwarded_for
            .split(",")[0]
            .strip()
        )

    if request.client:
        return request.client.host

    return "unknown"


def get_token_user_id(
    request: Request,
) -> int | None:
    authorization = request.headers.get(
        "Authorization",
        "",
    )

    if not authorization.startswith(
        "Bearer "
    ):
        return None

    token = authorization[7:].strip()

    if not token:
        return None

    return decode_access_token(
        token
    )


def enforce_limit(
    key: str,
    limit: int,
    window_seconds: int,
):
    retry_after = limiter.check(
        key,
        limit,
        window_seconds,
    )

    if retry_after is None:
        return

    raise HTTPException(
        status_code=
            status.HTTP_429_TOO_MANY_REQUESTS,

        detail=(
            "Too many requests. "
            "Please wait a moment "
            "and try again."
        ),

        headers={
            "Retry-After":
                str(retry_after),
        },
    )


def limit_login(
    request: Request,
):
    ip_address = get_client_ip(
        request
    )

    enforce_limit(
        key=f"login:{ip_address}",
        limit=15,
        window_seconds=60,
    )


def limit_register(
    request: Request,
):
    ip_address = get_client_ip(
        request
    )

    enforce_limit(
        key=f"register:{ip_address}",
        limit=10,
        window_seconds=600,
    )


def limit_reports(
    request: Request,
):
    user_id = get_token_user_id(
        request
    )

    if user_id is not None:
        key = f"report:user:{user_id}"
    else:
        key = (
            f"report:ip:"
            f"{get_client_ip(request)}"
        )

    enforce_limit(
        key=key,
        limit=5,
        window_seconds=3600,
    )


def limit_chat_messages(
    request: Request,
):
    user_id = get_token_user_id(
        request
    )

    if user_id is not None:
        key = (
            f"chat-message:"
            f"user:{user_id}"
        )
    else:
        key = (
            f"chat-message:"
            f"ip:{get_client_ip(request)}"
        )

    enforce_limit(
        key=key,
        limit=30,
        window_seconds=60,
    )


def check_websocket_message_limit(
    user_id: int,
) -> int | None:
    return limiter.check(
        key=(
            f"chat-message:"
            f"user:{user_id}"
        ),
        limit=30,
        window_seconds=60,
    )