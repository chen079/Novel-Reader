import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import auth, books


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Novel Reader API", version="1.0.0", lifespan=lifespan)

# CORS: allow dev origins + configurable production origins via env
_cors_origins = [
    "http://localhost:3399",
    "http://127.0.0.1:3399",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra_origins = os.getenv("CORS_ORIGINS", "")
if _extra_origins:
    _cors_origins.extend([o.strip() for o in _extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
