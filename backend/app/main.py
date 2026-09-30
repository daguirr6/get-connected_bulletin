from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.app.database import engine
from backend.app.routes.admin import router as admin_router
from backend.app.routes.admin_tools import router as admin_tools_router
from backend.app.routes.appeals import router as appeal_router
from backend.app.routes.auth import router as auth_router
from backend.app.routes.blocks import router as block_router
from backend.app.routes.chats import router as chat_router
from backend.app.routes.connections import router as connection_router
from backend.app.routes.post_its import router as post_it_router
from backend.app.routes.profiles import router as profile_router
from backend.app.routes.reports import router as report_router


app = FastAPI(
    title="Get Connected Bulletin API",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOADS_DIR = (
    Path(__file__).resolve().parent.parent
    / "uploads"
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

app.mount(
    "/uploads",
    StaticFiles(
        directory=UPLOADS_DIR
    ),
    name="uploads",
)


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(admin_tools_router)
app.include_router(post_it_router)
app.include_router(connection_router)
app.include_router(chat_router)
app.include_router(profile_router)
app.include_router(block_router)
app.include_router(report_router)
app.include_router(appeal_router)


@app.get("/")
def root():
    return {
        "name": "Get Connected Bulletin API",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/db-health")
def database_health():
    with engine.connect() as connection:
        connection.execute(
            text("SELECT 1")
        )

    return {
        "database": "connected",
    }
