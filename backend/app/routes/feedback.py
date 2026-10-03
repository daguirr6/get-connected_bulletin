import html
import json
import logging
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import (
    Request as UrlRequest,
    urlopen,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.rate_limit import (
    limit_feedback,
)
from backend.app.security import (
    decode_access_token,
)
from backend.app.schemas.feedback import (
    FeedbackCreate,
    FeedbackResponse,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"],
)


BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)


class FeedbackEmailSettings(
    BaseSettings
):
    cloudflare_account_id: (
        str | None
    ) = None

    cloudflare_email_api_token: (
        str | None
    ) = None

    feedback_from_email: str = (
        "feedback@getconnectedmason.com"
    )

    feedback_to_email: str = (
        "support@getconnectedmason.com"
    )

    model_config = SettingsConfigDict(
        env_file=(
            BACKEND_DIR / ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


email_settings = (
    FeedbackEmailSettings()
)


AREA_LABELS = {
    "bulletin":
        "Bulletin",

    "connections":
        "Connections",

    "chats":
        "Chats",

    "profiles":
        "Profiles",

    "post_it":
        "Post-it Creation",

    "verification":
        "Verification / Accounts",

    "safety_appeals":
        "Safety & Appeals",

    "mobile_layout":
        "Mobile / Layout",

    "other":
        "Other",
}


TOPIC_LABELS = {
    "bug":
        "Bug",

    "suggestion":
        "Suggestion",

    "design":
        "Design",

    "safety":
        "Safety",

    "accessibility":
        "Accessibility",

    "other":
        "Other",
}


def get_optional_user(
    request: Request,
    db: Session,
) -> User | None:
    authorization = (
        request.headers.get(
            "Authorization",
            "",
        )
    )

    if not authorization.startswith(
        "Bearer "
    ):
        return None

    token = (
        authorization[7:]
        .strip()
    )

    if not token:
        return None

    user_id = decode_access_token(
        token
    )

    if user_id is None:
        return None

    return db.get(
        User,
        user_id,
    )


def send_feedback_email(
    *,
    area: str,
    topic: str,
    message: str,
    username: str | None,
):
    account_id = (
        email_settings
        .cloudflare_account_id
    )

    api_token = (
        email_settings
        .cloudflare_email_api_token
    )

    if (
        not account_id
        or not api_token
    ):
        logger.error(
            "Feedback email sending "
            "is not configured."
        )

        raise HTTPException(
            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Feedback delivery is "
                "temporarily unavailable. "
                "Please try again later."
            ),
        )

    area_label = (
        AREA_LABELS.get(
            area,
            area,
        )
    )

    topic_label = (
        TOPIC_LABELS.get(
            topic,
            topic,
        )
    )

    sender_label = (
        username
        if username
        else "Anonymous visitor"
    )

    subject = (
        "[Get Connected Feedback] "
        f"{area_label} - "
        f"{topic_label}"
    )

    text_body = (
        "GET CONNECTED FEEDBACK\n\n"
        f"Area: {area_label}\n"
        f"Topic: {topic_label}\n"
        f"Submitted by: "
        f"{sender_label}\n\n"
        "Feedback:\n"
        f"{message}\n"
    )

    safe_message = html.escape(
        message
    ).replace(
        "\n",
        "<br>",
    )

    html_body = (
        "<h2>"
        "Get Connected Feedback"
        "</h2>"

        "<p>"
        f"<strong>Area:</strong> "
        f"{html.escape(area_label)}"
        "<br>"

        f"<strong>Topic:</strong> "
        f"{html.escape(topic_label)}"
        "<br>"

        "<strong>Submitted by:"
        "</strong> "
        f"{html.escape(sender_label)}"
        "</p>"

        "<hr>"

        "<p>"
        f"{safe_message}"
        "</p>"
    )

    payload = {
        "to": (
            email_settings
            .feedback_to_email
        ),

        "from": (
            email_settings
            .feedback_from_email
        ),

        "subject": subject,

        "text": text_body,

        "html": html_body,
    }

    url = (
        "https://api.cloudflare.com/"
        "client/v4/accounts/"
        f"{account_id}/"
        "email/sending/send"
    )

    request_data = UrlRequest(
        url,
        data=json.dumps(
            payload
        ).encode(
            "utf-8"
        ),
        method="POST",
        headers={
            "Authorization":
                f"Bearer {api_token}",

            "Content-Type":
                "application/json",
        },
    )

    try:
        with urlopen(
            request_data,
            timeout=15,
        ) as response:
            response_data = (
                json.loads(
                    response
                    .read()
                    .decode(
                        "utf-8"
                    )
                )
            )

    except HTTPError as error:
        logger.exception(
            "Cloudflare rejected "
            "feedback email delivery. "
            "HTTP status: %s",
            error.code,
        )

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Feedback could not be "
                "delivered right now. "
                "Please try again later."
            ),
        )

    except URLError:
        logger.exception(
            "Could not connect to "
            "Cloudflare Email Service."
        )

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Feedback could not be "
                "delivered right now. "
                "Please try again later."
            ),
        )

    except Exception:
        logger.exception(
            "Unexpected feedback "
            "delivery failure."
        )

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Feedback could not be "
                "delivered right now. "
                "Please try again later."
            ),
        )

    if not response_data.get(
        "success",
        False,
    ):
        logger.error(
            "Cloudflare feedback "
            "delivery returned failure."
        )

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Feedback could not be "
                "delivered right now. "
                "Please try again later."
            ),
        )


@router.post(
    "",
    response_model=
        FeedbackResponse,
)
def submit_feedback(
    data: FeedbackCreate,
    request: Request,
    db: Session = Depends(
        get_db
    ),
    _: None = Depends(
        limit_feedback
    ),
):
    user = get_optional_user(
        request,
        db,
    )

    username = None

    if (
        data.include_username
        and user is not None
    ):
        username = (
            user.username
        )

    clean_message = (
        data.message.strip()
    )

    send_feedback_email(
        area=data.area,
        topic=data.topic,
        message=clean_message,
        username=username,
    )

    logger.info(
        "Feedback submitted. "
        "Area=%s Topic=%s "
        "User=%s",
        data.area,
        data.topic,
        (
            username
            if username
            else "anonymous"
        ),
    )

    return FeedbackResponse(
        message=(
            "Thanks! Your feedback "
            "was sent."
        )
    )