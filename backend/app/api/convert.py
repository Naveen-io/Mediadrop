import uuid
from pathlib import Path
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.security import validate_format, check_rate_limit, sanitize_filename, parse_timecode
from app.models.schemas import ConvertRequest
from app.services.cleanup_service import ensure_temp_dir, remove_file_safely
from app.services.ffmpeg_service import extract_audio, process_video

router = APIRouter(tags=["Convert"])

@router.post("/convert")
async def convert_media(
    req: ConvertRequest,
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Converts or trims a media file stored in the temporary workspace.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    # Sanitize and validate target format
    target_fmt = validate_format(req.target_format, settings.ALLOWED_FORMATS)

    # Sanitize source filename to prevent directory traversal
    clean_source_name = sanitize_filename(req.source_filename)
    temp_dir = ensure_temp_dir()
    source_path = (temp_dir / clean_source_name).resolve()

    # Enforce that source_path is strictly inside temp_dir
    try:
        source_path.relative_to(temp_dir)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Illegal file access attempt outside temporary directory."
        )

    if not source_path.exists() or not source_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source media file not found or expired."
        )

    start_time = parse_timecode(req.start_time)
    end_time = parse_timecode(req.end_time)
    if start_time is not None and end_time is not None and start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trim start time must be before end time."
        )

    conv_id = uuid.uuid4().hex[:8]
    output_path = temp_dir / f"conv_{conv_id}_{source_path.stem}.{target_fmt}"

    is_audio = target_fmt in settings.ALLOWED_AUDIO_FORMATS
    if is_audio:
        await extract_audio(
            input_path=source_path,
            output_path=output_path,
            target_format=target_fmt,
            start_time=start_time,
            end_time=end_time,
        )
    else:
        await process_video(
            input_path=source_path,
            output_path=output_path,
            target_format=target_fmt,
            start_time=start_time,
            end_time=end_time,
        )

    background_tasks.add_task(remove_file_safely, output_path)

    mime_types = {
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "wav": "audio/wav",
    }
    mime_type = mime_types.get(target_fmt, "application/octet-stream")
    out_filename = sanitize_filename(f"{source_path.stem}_converted.{target_fmt}", default_ext=target_fmt)

    return FileResponse(
        path=str(output_path),
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{out_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )
