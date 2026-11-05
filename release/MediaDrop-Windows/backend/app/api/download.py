from pathlib import Path
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.security import validate_url, validate_format, check_rate_limit, sanitize_filename
from app.models.schemas import DownloadRequest
from app.services.ytdlp_service import process_and_export_media
from app.services.cleanup_service import remove_file_safely

router = APIRouter(tags=["Download"])

@router.post("/download")
async def download_media(
    req: DownloadRequest,
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Downloads and converts/trims requested media stream, returning
    the resulting file as a streaming download with proper Content-Disposition.
    Schedules safe cleanup of the temporary file once transmission is finished.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    # Validate URL
    sanitized_url = validate_url(req.url)

    # Validate output format
    if req.output_type == "audio":
        allowed = settings.ALLOWED_AUDIO_FORMATS
    else:
        allowed = settings.ALLOWED_VIDEO_FORMATS

    valid_format = validate_format(req.format, allowed)

    try:
        file_path, filename, mime_type = await process_and_export_media(
            url=sanitized_url,
            output_type=req.output_type,
            format_id=req.format_id,
            desired_ext=valid_format,
            quality=req.quality,
            start_time_str=req.start_time,
            end_time_str=req.end_time,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Media download and export encountered an unexpected failure."
        )

    # Verify file exists and has size
    if not file_path.exists() or file_path.stat().st_size == 0:
        remove_file_safely(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Exported media file could not be generated."
        )

    # Schedule deletion of temp file after response is sent
    background_tasks.add_task(remove_file_safely, file_path)

    # Encode filename for header compatibility (RFC 5987 / 6266)
    # Sanitize ASCII fallback and UTF-8 filename*
    ascii_filename = "".join(c for c in filename if c.isascii() and c not in '"\\') or f"media.{valid_format}"
    
    headers = {
        "Content-Disposition": f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{ascii_filename}',
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    }

    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        headers=headers,
    )
