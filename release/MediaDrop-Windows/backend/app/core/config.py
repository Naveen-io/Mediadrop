import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "MediaDrop API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]
    
    # Media Storage and limits
    TEMP_DIR: Path = Path(os.environ.get("TEMP_DIR", "temp_media")).resolve()
    MAX_STORAGE_MB: int = 2048  # 2 GB storage quota
    MAX_FILE_SIZE_MB: int = 500  # 500 MB per single file download limit
    MAX_VIDEO_DURATION_SEC: int = 14400  # 4 hours max duration
    DOWNLOAD_TIMEOUT_SEC: int = 300  # 5 minutes yt-dlp timeout
    
    # Allowed formats
    ALLOWED_VIDEO_FORMATS: List[str] = ["mp4", "webm"]
    ALLOWED_AUDIO_FORMATS: List[str] = ["mp3", "m4a", "wav"]
    ALLOWED_FORMATS: List[str] = ["mp4", "webm", "mp3", "m4a", "wav"]
    
    # Batch processing
    MAX_BATCH_URLS: int = 10
    
    # Rate limiting
    RATE_LIMIT_CALLS: int = 40
    RATE_LIMIT_WINDOW_SEC: int = 60

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
