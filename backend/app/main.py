from fastapi import FastAPI
from sqlalchemy import text

from backend.app.database import engine
from backend.app.routes.admin import router as admin_router
from backend.app.routes.auth import router as auth_router
from backend.app.routes.post_its import router as post_it_router
from backend.app.routes.connections import router as connection_router
from backend.app.routes.chats import router as chat_router
from backend.app.routes.profiles import router as profile_router

app = FastAPI(
    title="Get Connected Bulletin API",
    version="0.1.0"
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(post_it_router)
app.include_router(connection_router)
app.include_router(chat_router)
app.include_router(profile_router)


@app.get("/")
def root():
    return {
        "name": "Get Connected Bulletin API",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/db-health")
def database_health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "database": "connected"
    }