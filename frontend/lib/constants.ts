import { UserSettings } from '@/types/media';

export const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const DEFAULT_SETTINGS: UserSettings = {
  defaultOutputType: 'video',
  defaultVideoFormat: 'mp4',
  defaultAudioFormat: 'mp3',
  defaultAudioBitrate: '320k',
  apiUrl: DEFAULT_API_URL,
  reducedMotion: false,
};

export const SUPPORTED_PLATFORMS = [
  { name: 'YouTube', color: '#FF0000', icon: 'youtube', note: 'Public videos & shorts' },
  { name: 'SoundCloud', color: '#FF5500', icon: 'music', note: 'Public tracks' },
  { name: 'Vimeo', color: '#1AB7EA', icon: 'video', note: 'Public showcase clips' },
  { name: 'Twitter / X', color: '#FFFFFF', icon: 'twitter', note: 'Public video posts' },
  { name: 'TikTok', color: '#00F2FE', icon: 'smartphone', note: 'Public creator videos' },
  { name: 'Reddit', color: '#FF4500', icon: 'share-2', note: 'Public hosted videos' },
  { name: 'Twitch', color: '#9146FF', icon: 'tv', note: 'Public clips & VODs' },
];

export const VIDEO_FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4 (Universal, H.264 + AAC)' },
  { value: 'webm', label: 'WebM (Open Web, VP9 + Opus)' },
];

export const AUDIO_FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3 (MPEG Layer 3)' },
  { value: 'm4a', label: 'M4A (Apple AAC Audio)' },
  { value: 'wav', label: 'WAV (Uncompressed PCM)' },
];

export const AUDIO_BITRATE_OPTIONS = [
  { value: '320k', label: '320 kbps (High Fidelity)' },
  { value: '192k', label: '192 kbps (Standard)' },
  { value: '128k', label: '128 kbps (Compact)' },
];
