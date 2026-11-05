import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.services.cleanup_service import ensure_temp_dir, cleanup_old_files
from app.api import health, parse, download, convert, batch

import os
from pathlib import Path

# Prepend local bin directories to PATH for portable FFmpeg/FFprobe resolution
for possible_bin in [
    Path(__file__).resolve().parent.parent / "bin",
    Path(__file__).resolve().parent.parent.parent / "bin",
]:
    if possible_bin.is_dir():
        os.environ["PATH"] = f"{possible_bin}{os.path.pathsep}{os.environ.get('PATH', '')}"

# Configure root logger
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mediadrop")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure temporary directory is initialized
    ensure_temp_dir()
    cleanup_old_files(max_age_seconds=300)
    logger.info("MediaDrop backend initialized successfully.")
    yield
    # Shutdown
    cleanup_old_files(max_age_seconds=60)
    logger.info("MediaDrop backend shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# CORS middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local dev from any port or container
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Clean, safe exception handlers: never leak raw stack traces to the client
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = errors[0].get("msg", "Invalid request parameters") if errors else "Validation error"
    field = errors[0].get("loc", ["field"])[-1] if errors else "field"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"{field}: {msg}"},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred while processing your request."},
    )

# Include API routers
app.include_router(health.router, prefix="/api")
app.include_router(parse.router, prefix="/api")
app.include_router(download.router, prefix="/api")
app.include_router(convert.router, prefix="/api")
app.include_router(batch.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
