from fastapi import APIRouter, Request, HTTPException, status
from app.core.security import validate_url, check_rate_limit
from app.models.schemas import ParseRequest, ParseResponse
from app.services.ytdlp_service import extract_metadata

router = APIRouter(tags=["Parse"])

@router.post("/parse", response_model=ParseResponse)
async def parse_media_url(req: ParseRequest, request: Request):
    """
    Validates the public media URL, enforces SSRF protections,
    and extracts metadata without downloading the full media file.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    # Validate against SSRF and unsupported schemes
    sanitized_url = validate_url(req.url)

    # Extract metadata using yt-dlp
    metadata = await extract_metadata(sanitized_url)
    return metadata
