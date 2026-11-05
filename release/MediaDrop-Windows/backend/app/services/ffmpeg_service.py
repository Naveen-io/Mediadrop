import asyncio
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, List
from fastapi import HTTPException, status

def get_ffmpeg_binary() -> Optional[str]:
    """Finds ffmpeg in local bin or system PATH."""
    for base in [
        Path(__file__).resolve().parent.parent.parent / "bin",
        Path(__file__).resolve().parent.parent.parent.parent / "bin",
    ]:
        candidate = base / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        if candidate.is_file():
            return str(candidate)
    return shutil.which("ffmpeg")

def get_ffprobe_binary() -> Optional[str]:
    """Finds ffprobe in local bin or system PATH."""
    for base in [
        Path(__file__).resolve().parent.parent.parent / "bin",
        Path(__file__).resolve().parent.parent.parent.parent / "bin",
    ]:
        candidate = base / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
        if candidate.is_file():
            return str(candidate)
    return shutil.which("ffprobe")

def is_ffmpeg_available() -> bool:
    """Checks if ffmpeg executable is present in local bin or PATH."""
    return get_ffmpeg_binary() is not None

def is_ffprobe_available() -> bool:
    """Checks if ffprobe executable is present in local bin or PATH."""
    return get_ffprobe_binary() is not None

async def run_ffmpeg_command(args: List[str], timeout_sec: int = 180) -> None:
    """
    Executes ffmpeg using direct argument arrays (shell=False).
    Guarantees no command injection and enforces timeout.
    """
    ffmpeg_bin = get_ffmpeg_binary()
    if not ffmpeg_bin:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FFmpeg is not installed or not found on system PATH."
        )

    cmd = [ffmpeg_bin, "-y", "-hide_banner", "-loglevel", "error"] + args
    
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
        
        if proc.returncode != 0:
            err_msg = stderr.decode("utf-8", errors="replace").strip()
            # Clean up error message to not expose full file paths or raw stack traces
            clean_err = err_msg.splitlines()[-1] if err_msg else "Unknown FFmpeg error"
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Media processing failed: {clean_err}"
            )
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Media processing timed out."
        )

async def extract_audio(
    input_path: Path,
    output_path: Path,
    target_format: str = "mp3",
    bitrate: Optional[str] = "320k",
    start_time: Optional[float] = None,
    end_time: Optional[float] = None
) -> Path:
    """
    Extracts or converts audio to MP3, M4A, or WAV.
    """
    args = []
    
    if start_time is not None:
        args.extend(["-ss", str(start_time)])
    if end_time is not None:
        args.extend(["-to", str(end_time)])
        
    args.extend(["-i", str(input_path), "-vn"])

    fmt = target_format.lower()
    if fmt == "mp3":
        args.extend(["-c:a", "libmp3lame"])
        if bitrate:
            args.extend(["-b:a", bitrate if bitrate.endswith("k") else f"{bitrate}k"])
    elif fmt == "m4a":
        args.extend(["-c:a", "aac"])
        if bitrate:
            args.extend(["-b:a", bitrate if bitrate.endswith("k") else f"{bitrate}k"])
    elif fmt == "wav":
        args.extend(["-c:a", "pcm_s16le"])
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {target_format}"
        )

    args.append(str(output_path))
    await run_ffmpeg_command(args)
    return output_path

async def process_video(
    input_path: Path,
    output_path: Path,
    target_format: str = "mp4",
    start_time: Optional[float] = None,
    end_time: Optional[float] = None
) -> Path:
    """
    Processes video: trimmings and/or container re-encoding.
    """
    args = []

    if start_time is not None:
        args.extend(["-ss", str(start_time)])
    if end_time is not None:
        args.extend(["-to", str(end_time)])

    args.extend(["-i", str(input_path)])

    fmt = target_format.lower()
    if fmt == "mp4":
        args.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart"
        ])
    elif fmt == "webm":
        args.extend([
            "-c:v", "libvpx-vp9",
            "-crf", "30",
            "-b:v", "0",
            "-c:a", "libopus"
        ])
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format: {target_format}"
        )

    args.append(str(output_path))
    await run_ffmpeg_command(args)
    return output_path
