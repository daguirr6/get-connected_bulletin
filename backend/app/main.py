from fastapi import FastAPI

app = FastAPI(
    title="Get Connected Bulletin API",
    version="0.1.0"
)


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