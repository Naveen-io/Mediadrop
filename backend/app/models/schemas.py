from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ParseRequest(BaseModel):
    url: str = Field(..., description="Public media URL to parse")

class FormatOption(BaseModel):
    format_id: str
    ext: str
    resolution: Optional[str] = None
    fps: Optional[float] = None
    filesize: Optional[int] = None
    filesize_approx: Optional[int] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    quality_label: Optional[str] = None
    is_audio_only: bool = False
    is_video_only: bool = False

class AudioFormatOption(BaseModel):
    format_id: str
    ext: str
    abr: Optional[float] = None
    acodec: Optional[str] = None
    label: str

class ParseResponse(BaseModel):
    url: str
    title: str
    thumbnail: Optional[str] = None
    uploader: Optional[str] = None
    uploader_url: Optional[str] = None
    duration: Optional[float] = None
    duration_formatted: Optional[str] = None
    platform: str
    description: Optional[str] = None
    available_formats: List[FormatOption] = []
    available_audio_formats: List[AudioFormatOption] = []
    is_live: bool = False

class DownloadRequest(BaseModel):
    url: str = Field(..., description="Public media URL")
    output_type: Literal["video", "audio"] = Field("video", description="'video' or 'audio'")
    format_id: Optional[str] = Field(None, description="Optional yt-dlp format selector")
    format: str = Field("mp4", description="Desired container/codec: mp4, webm, mp3, m4a, wav")
    quality: Optional[str] = Field(None, description="Quality preset, e.g. 1080p, 720p, 320k, 192k")
    start_time: Optional[str] = Field(None, description="Optional trim start time (SS, MM:SS, HH:MM:SS)")
    end_time: Optional[str] = Field(None, description="Optional trim end time (SS, MM:SS, HH:MM:SS)")

class ConvertRequest(BaseModel):
    source_filename: str = Field(..., description="Name of existing temporary file to convert")
    target_format: str = Field(..., description="Target format: mp4, webm, mp3, m4a, wav")
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class BatchItem(BaseModel):
    url: str
    status: Literal["pending", "processing", "completed", "error"] = "pending"
    title: Optional[str] = None
    filename: Optional[str] = None
    filesize: Optional[int] = None
    error: Optional[str] = None

class BatchRequest(BaseModel):
    urls: List[str] = Field(..., min_length=1, max_length=10, description="List of public media URLs (1 to 10)")
    output_type: Literal["video", "audio"] = Field("video", description="'video' or 'audio'")
    format: str = Field("mp4", description="Output format")
    quality: Optional[str] = None

class BatchResponse(BaseModel):
    batch_id: str
    total: int
    items: List[BatchItem] = []
    zip_ready: bool = False
    download_url: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    ffmpeg_installed: bool
    ffprobe_installed: bool
    ytdlp_version: str
    storage_used_mb: float
    storage_quota_mb: int
