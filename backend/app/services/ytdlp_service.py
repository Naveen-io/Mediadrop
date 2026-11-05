import asyncio
import uuid
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
import yt_dlp
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import sanitize_filename, parse_timecode, validate_format
from app.models.schemas import ParseResponse, FormatOption, AudioFormatOption
from app.services.cleanup_service import ensure_temp_dir, cleanup_old_files
from app.services.ffmpeg_service import extract_audio, process_video

def format_duration(seconds: Optional[float]) -> Optional[str]:
    """Formats seconds into readable string (e.g., 03:45 or 01:12:30)."""
    if seconds is None or seconds < 0:
        return None
    sec = int(seconds)
    hours = sec // 3600
    minutes = (sec % 3600) // 60
    secs = sec % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def extract_platform_name(extractor: Optional[str]) -> str:
    """Normalizes yt-dlp extractor name into friendly brand name."""
    if not extractor:
        return "Web Media"
    ext_lower = extractor.lower()
    if "youtube" in ext_lower:
        return "YouTube"
    if "soundcloud" in ext_lower:
        return "SoundCloud"
    if "vimeo" in ext_lower:
        return "Vimeo"
    if "twitter" in ext_lower or "x.com" in ext_lower:
        return "Twitter / X"
    if "tiktok" in ext_lower:
        return "TikTok"
    if "reddit" in ext_lower:
        return "Reddit"
    if "twitch" in ext_lower:
        return "Twitch"
    if "facebook" in ext_lower:
        return "Facebook"
    if "instagram" in ext_lower:
        return "Instagram"
    return extractor.capitalize()

def parse_metadata_sync(url: str) -> ParseResponse:
    """Synchronous metadata extraction with yt-dlp."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "noplaylist": True,
        "socket_timeout": 15,
        "allow_unplayable_formats": False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No media streams could be found at the given URL."
                )
    except yt_dlp.utils.DownloadError as e:
        msg = str(e).lower()
        if "private" in msg or "login" in msg or "sign in" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This media is private, age-restricted, or requires login credentials."
            )
        if "copyright" in msg or "blocked" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This media is blocked or restricted due to copyright/licensing limitations."
            )
        if "not found" in msg or "404" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media not found at the provided URL. Please verify the link."
            )
        clean_msg = str(e).split("ERROR:")[-1].strip()
        # Truncate clean_msg if too long
        if len(clean_msg) > 120:
            clean_msg = clean_msg[:120] + "..."
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to parse media: {clean_msg}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while inspecting media metadata."
        )

    title = info.get("title") or "Untitled Media"
    uploader = info.get("uploader") or info.get("channel") or info.get("creator") or "Unknown Author"
    duration = info.get("duration")
    thumbnail = info.get("thumbnail")
    platform = extract_platform_name(info.get("extractor"))
    is_live = bool(info.get("is_live", False))

    if is_live:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Live streaming broadcasts cannot be processed for export."
        )

    # Parse and filter available video formats
    raw_formats = info.get("formats", [])
    available_formats: List[FormatOption] = []
    
    # Track unique resolutions to provide clean, distinct choices (e.g. 1080p, 720p, 480p, 360p)
    seen_resolutions = set()

    for f in reversed(raw_formats):
        format_id = str(f.get("format_id", ""))
        ext = f.get("ext", "mp4")
        height = f.get("height")
        width = f.get("width")
        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        fps = f.get("fps")
        filesize = f.get("filesize")
        filesize_approx = f.get("filesize_approx")

        is_audio_only = vcodec == "none" or not vcodec
        is_video_only = acodec == "none" or not acodec

        # If it's a video format with height
        if height and not is_audio_only:
            res_key = f"{height}p"
            if res_key not in seen_resolutions:
                seen_resolutions.add(res_key)
                quality_label = f"{height}p ({ext.upper()})"
                available_formats.append(
                    FormatOption(
                        format_id=format_id,
                        ext=ext,
                        resolution=f"{width}x{height}" if width else f"{height}p",
                        fps=fps,
                        filesize=filesize,
                        filesize_approx=filesize_approx,
                        vcodec=vcodec if vcodec != "none" else None,
                        acodec=acodec if acodec != "none" else None,
                        quality_label=quality_label,
                        is_audio_only=False,
                        is_video_only=is_video_only,
                    )
                )

    # If no height-based formats found, add best available
    if not available_formats:
        available_formats.append(
            FormatOption(
                format_id="best",
                ext="mp4",
                resolution="Original Quality",
                quality_label="Best Available Video",
                is_audio_only=False,
                is_video_only=False,
            )
        )

    # Standard clean audio formats with presets
    available_audio_formats = [
        AudioFormatOption(format_id="best-mp3-320", ext="mp3", abr=320, acodec="mp3", label="MP3 High (320 kbps)"),
        AudioFormatOption(format_id="best-mp3-192", ext="mp3", abr=192, acodec="mp3", label="MP3 Standard (192 kbps)"),
        AudioFormatOption(format_id="best-m4a", ext="m4a", abr=256, acodec="aac", label="M4A / AAC Audio"),
        AudioFormatOption(format_id="best-wav", ext="wav", abr=None, acodec="pcm", label="WAV Lossless Audio"),
    ]

    return ParseResponse(
        url=url,
        title=title,
        thumbnail=thumbnail,
        uploader=uploader,
        uploader_url=info.get("uploader_url"),
        duration=duration,
        duration_formatted=format_duration(duration),
        platform=platform,
        description=info.get("description", "")[:280] if info.get("description") else None,
        available_formats=available_formats,
        available_audio_formats=available_audio_formats,
        is_live=is_live,
    )

async def extract_metadata(url: str) -> ParseResponse:
    """Async wrapper around metadata extraction."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, parse_metadata_sync, url)

def download_media_sync(
    url: str,
    output_type: str,
    format_id: Optional[str],
    desired_ext: str,
    quality: Optional[str],
    job_id: str,
) -> Path:
    """
    Downloads media streams synchronously via yt-dlp into temp storage.
    """
    temp_dir = ensure_temp_dir()
    cleanup_old_files()

    out_template = str(temp_dir / f"{job_id}_%(title).100s.%(ext)s")

    ydl_opts: Dict[str, Any] = {
        "outtmpl": out_template,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "overwrites": True,
    }

    if output_type == "audio":
        ydl_opts["format"] = "bestaudio/best"
    else:
        # Video export
        if format_id and format_id not in ("best", "default"):
            # If user selected a specific format_id, ensure audio is merged if it's video-only
            ydl_opts["format"] = f"{format_id}+bestaudio/best/{format_id}"
        elif quality and quality.endswith("p"):
            h = quality.replace("p", "")
            ydl_opts["format"] = f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best"
        else:
            ydl_opts["format"] = "bestvideo+bestaudio/best"

        if desired_ext in ("mp4", "webm"):
            ydl_opts["merge_output_format"] = desired_ext

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        clean_err = str(e).split("ERROR:")[-1].strip()
        if len(clean_err) > 120:
            clean_err = clean_err[:120] + "..."
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch media stream from source: {clean_err}"
        )

    # Locate downloaded file matching job_id
    downloaded_files = list(temp_dir.glob(f"{job_id}_*"))
    if not downloaded_files:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Media download completed but output file could not be verified."
        )

    return downloaded_files[0]

async def process_and_export_media(
    url: str,
    output_type: str,
    format_id: Optional[str],
    desired_ext: str,
    quality: Optional[str],
    start_time_str: Optional[str] = None,
    end_time_str: Optional[str] = None,
) -> tuple[Path, str, str]:
    """
    Orchestrates yt-dlp download and FFmpeg trimming/conversion.
    Returns: (final_path, download_filename, mime_type)
    """
    job_id = uuid.uuid4().hex[:10]
    loop = asyncio.get_running_loop()

    # Step 1: Download base media
    downloaded_path = await loop.run_in_executor(
        None,
        download_media_sync,
        url,
        output_type,
        format_id,
        desired_ext,
        quality,
        job_id
    )

    # Step 2: Determine if FFmpeg processing (trimming or audio transcode) is required
    start_time = parse_timecode(start_time_str)
    end_time = parse_timecode(end_time_str)

    if start_time is not None and end_time is not None:
        if start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trim start time must be strictly before end time."
            )

    needs_trim = start_time is not None or end_time is not None
    original_stem = downloaded_path.stem
    # Remove job_id prefix for clean client filename
    clean_stem = re.sub(r"^[a-f0-9]{10}_", "", original_stem)
    
    final_output_path = downloaded_path
    
    if output_type == "audio":
        audio_out = downloaded_path.with_name(f"{job_id}_processed.{desired_ext}")
        bitrate = "320k" if "320" in (quality or "") else "192k"
        await extract_audio(
            input_path=downloaded_path,
            output_path=audio_out,
            target_format=desired_ext,
            bitrate=bitrate,
            start_time=start_time,
            end_time=end_time,
        )
        # Remove raw source file if different
        if downloaded_path != audio_out and downloaded_path.exists():
            downloaded_path.unlink(missing_ok=True)
        final_output_path = audio_out
    elif needs_trim or downloaded_path.suffix.lstrip(".").lower() != desired_ext:
        video_out = downloaded_path.with_name(f"{job_id}_trimmed.{desired_ext}")
        await process_video(
            input_path=downloaded_path,
            output_path=video_out,
            target_format=desired_ext,
            start_time=start_time,
            end_time=end_time,
        )
        if downloaded_path != video_out and downloaded_path.exists():
            downloaded_path.unlink(missing_ok=True)
        final_output_path = video_out

    # Step 3: Prepare safe client filename and MIME type
    clean_filename = sanitize_filename(f"{clean_stem}.{desired_ext}", default_ext=desired_ext)

    mime_types = {
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "wav": "audio/wav",
    }
    mime_type = mime_types.get(desired_ext.lower(), "application/octet-stream")

    return final_output_path, clean_filename, mime_type
