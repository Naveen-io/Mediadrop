export type ProcessingState =
  | 'idle'
  | 'validating'
  | 'fetching'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'error';

export interface FormatOption {
  format_id: string;
  ext: string;
  resolution?: string | null;
  fps?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  quality_label?: string | null;
  is_audio_only: boolean;
  is_video_only: boolean;
}

export interface AudioFormatOption {
  format_id: string;
  ext: string;
  abr?: number | null;
  acodec?: string | null;
  label: string;
}

export interface MediaMetadata {
  url: string;
  title: string;
  thumbnail?: string | null;
  uploader?: string | null;
  uploader_url?: string | null;
  duration?: number | null;
  duration_formatted?: string | null;
  platform: string;
  description?: string | null;
  available_formats: FormatOption[];
  available_audio_formats: AudioFormatOption[];
  is_live: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  platform: string;
  date: string;
  format: string;
  filename: string;
  url: string;
  filesize?: number;
}

export interface UserSettings {
  defaultOutputType: 'video' | 'audio';
  defaultVideoFormat: string;
  defaultAudioFormat: string;
  defaultAudioBitrate: string;
  apiUrl: string;
  reducedMotion: boolean;
}

export interface BatchItem {
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  title?: string;
  filename?: string;
  filesize?: number;
  error?: string;
}

export interface BatchResponse {
  batch_id: string;
  total: number;
  items: BatchItem[];
  zip_ready: boolean;
  download_url?: string;
}

export interface BackendHealth {
  status: 'ok' | 'error' | 'unreachable';
  version?: string;
  ffmpeg_installed?: boolean;
  ffprobe_installed?: boolean;
  ytdlp_version?: string;
  storage_used_mb?: number;
  storage_quota_mb?: number;
  lastChecked?: number;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
