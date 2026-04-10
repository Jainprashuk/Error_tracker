import os
import structlog
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.db import init_db, client
from app.routes.error_routes import router as error_router
from app.routes.project_routes import router as project_router
from app.routes.auth_routes import router as auth_router
from app.routes.ticket_routes import router as ticket_router
from app.routes.integration_routes import router as integration_router
from app.routes.alert_routes import router as alert_router
from app.routes.performance_routes import router as performance_router


# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()

# Security Config
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,https://bugtrace.jainprashuk.in").split(",")

rate_limit_cache = {}

class SecurityGuard(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Payload Size Limit (500KB)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 512000:
            return JSONResponse(status_code=413, content={"detail": "Payload too large (max 500KB)"})

        # 2. Rate Limiting (100 req/min per API key)
        if request.url.path == "/report" and request.method == "POST":
            api_key = request.headers.get("x-api-key")
            if api_key:
                now = datetime.utcnow().timestamp()
                history = [t for t in rate_limit_cache.get(api_key, []) if now - t < 60]
                if len(history) >= 100:
                    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
                history.append(now)
                rate_limit_cache[api_key] = history

        try:
            return await call_next(request)
        except Exception as e:
            logger.error("unhandled_exception", error=str(e))
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("service_startup", status="initializing")
    await init_db()
    yield
    logger.info("service_shutdown")

app = FastAPI(lifespan=lifespan)

# Middlewares
app.add_middleware(SecurityGuard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Routes
app.include_router(error_router)
app.include_router(project_router)
app.include_router(auth_router)
app.include_router(ticket_router)
app.include_router(integration_router)
app.include_router(alert_router)
app.include_router(performance_router)

@app.get("/")
def root():
    return {"message": "Bug tracker collector running"}

@app.get("/health")
async def health_check():
    try:
        await client.admin.command('ping')
        return {
            "status": "healthy",
            "db": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

# JWT Secret Warning
if os.getenv("JWT_SECRET_KEY") == "your-secret-key-change-in-production":
    logger.error("INSECURE_JWT_SECRET", message="Using default JWT secret!")