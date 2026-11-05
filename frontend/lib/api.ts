import { MediaMetadata, BackendHealth, BatchResponse } from '@/types/media';
import { loadSettings } from './storage';

function getBaseUrl(): string {
  const settings = loadSettings();
  return (settings.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
}

async function handleResponseError(res: Response): Promise<never> {
  let errorDetail = `Request failed with status ${res.status}`;
  try {
    const errorJson = await res.json();
    if (errorJson && errorJson.detail) {
      errorDetail = errorJson.detail;
    }
  } catch {
    const text = await res.text().catch(() => '');
    if (text) errorDetail = text.substring(0, 150);
  }
  throw new Error(errorDetail);
}

export async function checkBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    }).catch(() => null);

    if (!res || !res.ok) {
      return { status: 'unreachable', lastChecked: Date.now() };
    }
    const data = await res.json();
    return {
      status: 'ok',
      version: data.version,
      ffmpeg_installed: data.ffmpeg_installed,
      ffprobe_installed: data.ffprobe_installed,
      ytdlp_version: data.ytdlp_version,
      storage_used_mb: data.storage_used_mb,
      storage_quota_mb: data.storage_quota_mb,
      lastChecked: Date.now(),
    };
  } catch {
    return { status: 'unreachable', lastChecked: Date.now() };
  }
}

export async function parseMediaUrl(url: string, signal?: AbortSignal): Promise<MediaMetadata> {
  const baseUrl = getBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    });
  } catch (err: unknown) {
    if (signal?.aborted) throw err;
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    if (isHttps && baseUrl.startsWith('http://localhost')) {
      throw new Error(
        'Media processing engine is offline. To download social media links, launch MediaDrop locally via "Start MediaDrop.bat" or connect a cloud backend.'
      );
    }
    throw new Error(
      `Cannot connect to media engine at ${baseUrl}. Please ensure the backend server is running.`
    );
  }

  if (!res.ok) {
    await handleResponseError(res);
  }

  return await res.json();
}

export interface DownloadOptions {
  url: string;
  outputType: 'video' | 'audio';
  formatId?: string | null;
  format: string;
  quality?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export async function triggerMediaDownload(
  options: DownloadOptions,
  signal?: AbortSignal,
  onProgress?: (progressPercent: number) => void
): Promise<{ filename: string; filesize: number }> {
  const baseUrl = getBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: options.url,
        output_type: options.outputType,
        format_id: options.formatId || undefined,
        format: options.format,
        quality: options.quality || undefined,
        start_time: options.startTime || undefined,
        end_time: options.endTime || undefined,
      }),
      signal,
    });
  } catch (err: unknown) {
    if (signal?.aborted) throw err;
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    if (isHttps && baseUrl.startsWith('http://localhost')) {
      throw new Error(
        'Media processing engine is offline. Launch MediaDrop locally via "Start MediaDrop.bat" or connect a cloud backend.'
      );
    }
    throw new Error(`Media engine connection failed at ${baseUrl}.`);
  }

  if (!res.ok) {
    await handleResponseError(res);
  }

  // Extract filename from Content-Disposition header
  const disposition = res.headers.get('Content-Disposition') || '';
  let filename = `mediadrop_${Date.now()}.${options.format}`;
  
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (regularMatch && regularMatch[1]) {
      filename = regularMatch[1];
    }
  }

  const contentLength = res.headers.get('Content-Length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  if (res.body && window.ReadableStream && totalBytes > 0 && onProgress) {
    const reader = res.body.getReader();
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        onProgress(Math.min(99, Math.round((receivedBytes / totalBytes) * 100)));
      }
    }

    const blob = new Blob(chunks as BlobPart[]);
    const blobUrl = window.URL.createObjectURL(blob);
    triggerBrowserSave(blobUrl, filename);
    return { filename, filesize: blob.size };
  } else {
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    triggerBrowserSave(blobUrl, filename);
    return { filename, filesize: blob.size };
  }
}

export async function submitBatchJob(
  urls: string[],
  outputType: 'video' | 'audio',
  format: string,
  quality?: string,
  signal?: AbortSignal
): Promise<BatchResponse> {
  const baseUrl = getBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls,
        output_type: outputType,
        format,
        quality: quality || undefined,
      }),
      signal,
    });
  } catch (err: unknown) {
    if (signal?.aborted) throw err;
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    if (isHttps && baseUrl.startsWith('http://localhost')) {
      throw new Error(
        'Media processing engine is offline. Launch MediaDrop locally via "Start MediaDrop.bat" or connect a cloud backend.'
      );
    }
    throw new Error(`Batch connection failed at ${baseUrl}. Ensure backend is running.`);
  }

  if (!res.ok) {
    await handleResponseError(res);
  }

  return await res.json();
}

export function getBatchDownloadUrl(batchId: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/batch/download/${batchId}`;
}

function triggerBrowserSave(blobUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
}
