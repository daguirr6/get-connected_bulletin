from fastapi import FastAPI
from sqlalchemy import text

from backend.app.database import engine
from backend.app.routes.auth import router as auth_router

app = FastAPI(
    title="Get Connected Bulletin API",
    version="0.1.0"
)

app.include_router(auth_router)

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