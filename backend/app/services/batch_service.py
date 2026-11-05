import asyncio
import uuid
import zipfile
from pathlib import Path
from typing import List, Tuple
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import validate_url, sanitize_filename
from app.models.schemas import BatchRequest, BatchResponse, BatchItem
from app.services.cleanup_service import ensure_temp_dir, remove_dir_safely
from app.services.ytdlp_service import process_and_export_media

async def process_batch_job(
    request: BatchRequest
) -> Tuple[Path, str, BatchResponse]:
    """
    Processes multiple URLs sequentially, collects the media files,
    creates a ZIP archive, and returns the path and summary.
    """
    batch_id = uuid.uuid4().hex[:12]
    temp_dir = ensure_temp_dir()
    batch_dir = temp_dir / f"batch_{batch_id}"
    batch_dir.mkdir(parents=True, exist_ok=True)

    items: List[BatchItem] = []
    created_files: List[Path] = []

    for url in request.urls:
        try:
            valid_url = validate_url(url)
            item = BatchItem(url=valid_url, status="processing")
            
            # Export single item
            file_path, filename, _ = await process_and_export_media(
                url=valid_url,
                output_type=request.output_type,
                format_id=None,
                desired_ext=request.format,
                quality=request.quality,
            )
            
            # Move or copy into batch dir
            dest_file = batch_dir / filename
            # Handle collision
            counter = 1
            while dest_file.exists():
                stem = dest_file.stem
                dest_file = batch_dir / f"{stem}_{counter}.{request.format}"
                counter += 1

            file_path.rename(dest_file)
            created_files.append(dest_file)

            item.status = "completed"
            item.filename = dest_file.name
            item.filesize = dest_file.stat().st_size
            item.title = dest_file.stem
            items.append(item)

        except Exception as e:
            err_msg = getattr(e, "detail", str(e))
            items.append(
                BatchItem(
                    url=url,
                    status="error",
                    error=str(err_msg)[:120],
                )
            )

    # Check if any items succeeded
    successful_items = [it for it in items if it.status == "completed"]
    if not successful_items:
        remove_dir_safely(batch_dir)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="None of the provided URLs could be successfully processed."
        )

    # Create ZIP archive
    zip_path = temp_dir / f"mediadrop_batch_{batch_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in created_files:
            zf.write(f, arcname=f.name)

    # Clean up uncompressed batch files
    remove_dir_safely(batch_dir)

    zip_filename = sanitize_filename(f"mediadrop_batch_{batch_id}.zip", default_ext="zip")

    response = BatchResponse(
        batch_id=batch_id,
        total=len(request.urls),
        items=items,
        zip_ready=True,
        download_url=f"/api/batch/download/{batch_id}",
    )

    return zip_path, zip_filename, response
