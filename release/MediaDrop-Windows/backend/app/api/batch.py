from pathlib import Path
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.security import check_rate_limit, validate_format
from app.models.schemas import BatchRequest, BatchResponse
from app.services.batch_service import process_batch_job
from app.services.cleanup_service import ensure_temp_dir, remove_file_safely

router = APIRouter(tags=["Batch"])

@router.post("/batch", response_model=BatchResponse)
async def create_batch_export(
    req: BatchRequest,
    request: Request
):
    """
    Submits a batch export job for multiple public media URLs.
    Processes items sequentially and generates a ZIP archive.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    if not req.urls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one URL must be provided."
        )

    if len(req.urls) > settings.MAX_BATCH_URLS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum allowed batch size is {settings.MAX_BATCH_URLS} URLs."
        )

    # Validate output format
    allowed = settings.ALLOWED_AUDIO_FORMATS if req.output_type == "audio" else settings.ALLOWED_VIDEO_FORMATS
    validate_format(req.format, allowed)

    zip_path, filename, batch_summary = await process_batch_job(req)
    return batch_summary

@router.get("/batch/download/{batch_id}")
async def download_batch_zip(
    batch_id: str,
    background_tasks: BackgroundTasks
):
    """
    Downloads the resulting ZIP archive of a completed batch job.
    Schedules removal of the ZIP file after transfer.
    """
    temp_dir = ensure_temp_dir()
    # Ensure batch_id is alphanumeric
    if not batch_id.isalnum():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid batch identifier.")

    zip_path = temp_dir / f"mediadrop_batch_{batch_id}.zip"
    if not zip_path.exists() or not zip_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch archive not found or has expired."
        )

    background_tasks.add_task(remove_file_safely, zip_path)

    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="mediadrop_batch_{batch_id}.zip"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )
