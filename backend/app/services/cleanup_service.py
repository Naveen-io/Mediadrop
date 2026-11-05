import os
import shutil
import time
from pathlib import Path
from app.core.config import settings

def ensure_temp_dir() -> Path:
    """Ensures temp storage directory exists."""
    settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
    return settings.TEMP_DIR

def get_storage_usage_mb() -> float:
    """Calculates total size in MB of current temp storage directory."""
    temp_dir = ensure_temp_dir()
    total_bytes = 0
    for entry in temp_dir.rglob("*"):
        if entry.is_file():
            try:
                total_bytes += entry.stat().st_size
            except OSError:
                pass
    return round(total_bytes / (1024 * 1024), 2)

def cleanup_old_files(max_age_seconds: int = 900) -> None:
    """
    Deletes files older than max_age_seconds (default 15 minutes)
    or if storage quota is exceeded, deletes the oldest files first.
    """
    temp_dir = ensure_temp_dir()
    now = time.time()
    
    file_records = []
    total_bytes = 0

    for path in temp_dir.glob("*"):
        if path.is_file():
            try:
                stat = path.stat()
                age = now - stat.st_mtime
                if age > max_age_seconds:
                    path.unlink(missing_ok=True)
                else:
                    file_records.append((path, stat.st_mtime, stat.st_size))
                    total_bytes += stat.st_size
            except OSError:
                pass
        elif path.is_dir():
            try:
                stat = path.stat()
                age = now - stat.st_mtime
                if age > max_age_seconds:
                    shutil.rmtree(path, ignore_errors=True)
            except OSError:
                pass

    # If still above storage quota, delete oldest files first
    max_bytes = settings.MAX_STORAGE_MB * 1024 * 1024
    if total_bytes > max_bytes:
        file_records.sort(key=lambda x: x[1])  # sort by st_mtime ascending
        for path, _, size in file_records:
            try:
                path.unlink(missing_ok=True)
                total_bytes -= size
                if total_bytes <= max_bytes * 0.75:
                    break
            except OSError:
                pass

def remove_file_safely(path: Path) -> None:
    """Safely removes a file without throwing exceptions."""
    try:
        if path.exists():
            path.unlink(missing_ok=True)
    except Exception:
        pass

def remove_dir_safely(path: Path) -> None:
    """Safely removes a directory without throwing exceptions."""
    try:
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
    except Exception:
        pass
