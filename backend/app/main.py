from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import router as v1_router
from app.core.config import settings
from app.core.scheduler import detection_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 스케줄러 시작
    detection_scheduler.start()
    yield
    # Shutdown: 스케줄러 종료
    detection_scheduler.stop()

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
