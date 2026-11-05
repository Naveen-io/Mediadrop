import yt_dlp
from fastapi import APIRouter
from app.core.config import settings
from app.models.schemas import HealthResponse
from app.services.ffmpeg_service import is_ffmpeg_available, is_ffprobe_available
from app.services.cleanup_service import get_storage_usage_mb

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Returns operational health status, backend version,
    and availability of media processing dependencies (FFmpeg, yt-dlp).
    """
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        ffmpeg_installed=is_ffmpeg_available(),
        ffprobe_installed=is_ffprobe_available(),
        ytdlp_version=yt_dlp.version.__version__,
        storage_used_mb=get_storage_usage_mb(),
        storage_quota_mb=settings.MAX_STORAGE_MB,
    )
