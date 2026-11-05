'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ProcessingState,
  MediaMetadata,
  UserSettings,
} from '@/types/media';
import { isValidHttpUrl } from '@/lib/formatters';
import { parseMediaUrl, triggerMediaDownload, DownloadOptions } from '@/lib/api';

interface UseMediaDropProps {
  settings: UserSettings;
  onSuccessDownload?: (record: {
    title: string;
    platform: string;
    format: string;
    filename: string;
    url: string;
    filesize?: number;
  }) => void;
  showToast?: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export function useMediaDrop({ settings, onSuccessDownload, showToast }: UseMediaDropProps) {
  const [state, setState] = useState<ProcessingState>('idle');
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export parameters
  const [outputType, setOutputType] = useState<'video' | 'audio'>('video');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('best');
  const [selectedFormat, setSelectedFormat] = useState<string>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  
  // Trimming parameters
  const [trimEnabled, setTrimEnabled] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Progress and abort
  const [downloadProgress, setDownloadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('idle');
    setUrl('');
    setMetadata(null);
    setErrorMessage(null);
    setTrimEnabled(false);
    setStartTime('');
    setEndTime('');
    setDownloadProgress(0);
  }, []);

  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (metadata) {
      setState('ready');
      setDownloadProgress(0);
    } else {
      setState('idle');
    }
    if (showToast) {
      showToast('info', 'Operation cancelled.');
    }
  }, [metadata, showToast]);

  const handleUrlSubmit = useCallback(
    async (inputUrl: string) => {
      const cleanUrl = inputUrl.trim();
      if (!cleanUrl) {
        setErrorMessage('Please enter a media URL.');
        setState('error');
        return;
      }

      setState('validating');
      setErrorMessage(null);

      if (!isValidHttpUrl(cleanUrl)) {
        setErrorMessage('Please enter a valid HTTP or HTTPS media link.');
        setState('error');
        return;
      }

      // Client-side direct media file detection (.mp4, .mp3, .wav, .webm, etc.)
      const directMatch = cleanUrl.match(/\.(mp4|webm|mp3|wav|m4a|ogg|mov)(\?.*)?$/i);
      if (directMatch) {
        const ext = directMatch[1].toLowerCase();
        const rawFilename = cleanUrl.split('/').pop()?.split('?')[0] || `media.${ext}`;
        const isAudio = ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
        const directData: MediaMetadata = {
          title: decodeURIComponent(rawFilename),
          url: cleanUrl,
          platform: 'Direct',
          duration: 0,
          duration_formatted: '00:00:00',
          thumbnail: '',
          uploader: 'Direct Link',
          uploader_url: null,
          is_live: false,
          available_formats: [
            {
              format_id: 'direct',
              resolution: isAudio ? 'Audio Stream' : 'Direct Media Stream',
              ext,
              filesize: 0,
              is_audio_only: isAudio,
              is_video_only: !isAudio,
            },
          ],
          available_audio_formats: isAudio
            ? [
                {
                  format_id: 'direct-audio',
                  ext,
                  label: 'Direct Audio Stream',
                },
              ]
            : [],
        };
        setMetadata(directData);
        setOutputType(isAudio ? 'audio' : 'video');
        setSelectedFormat(ext);
        setSelectedFormatId('direct');
        setSelectedQuality('Direct Stream');
        setState('ready');
        if (showToast) {
          showToast('success', `Direct link detected: ${decodeURIComponent(rawFilename)}`);
        }
        return;
      }

      // Cancel any ongoing fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState('fetching');
      setUrl(cleanUrl);

      try {
        const data = await parseMediaUrl(cleanUrl, controller.signal);
        setMetadata(data);

        // Apply defaults from settings
        const initialType = settings.defaultOutputType || 'video';
        setOutputType(initialType);

        if (initialType === 'video') {
          setSelectedFormat(settings.defaultVideoFormat || 'mp4');
          if (data.available_formats && data.available_formats.length > 0) {
            setSelectedFormatId(data.available_formats[0].format_id);
            setSelectedQuality(data.available_formats[0].resolution || 'Original Quality');
          } else {
            setSelectedFormatId('best');
            setSelectedQuality('Original Quality');
          }
        } else {
          setSelectedFormat(settings.defaultAudioFormat || 'mp3');
          setSelectedFormatId('best-mp3-320');
          setSelectedQuality(settings.defaultAudioBitrate || '320k');
        }

        // Default trimming range
        if (data.duration) {
          setStartTime('00:00:00');
          setEndTime(data.duration_formatted || '');
        }

        setState('ready');
        if (showToast) {
          showToast('success', `Found media: ${data.title.substring(0, 40)}...`);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Failed to inspect media URL.';
        setErrorMessage(msg);
        setState('error');
        if (showToast) {
          showToast('error', msg);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [settings, showToast]
  );

  const handleDownload = useCallback(async () => {
    if (!metadata || state === 'downloading') return;

    if (selectedFormatId === 'direct') {
      try {
        const link = document.createElement('a');
        link.href = metadata.url;
        link.download = metadata.title;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setState('completed');
        setDownloadProgress(100);
        if (onSuccessDownload) {
          onSuccessDownload({
            title: metadata.title,
            platform: 'Direct',
            format: selectedFormat.toUpperCase(),
            filename: metadata.title,
            url: metadata.url,
            filesize: 0,
          });
        }
        if (showToast) {
          showToast('success', `Exported: ${metadata.title}`);
        }
        return;
      } catch (err) {
        // Fall back to server download
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState('downloading');
    setDownloadProgress(0);

    const options: DownloadOptions = {
      url: metadata.url,
      outputType,
      formatId: selectedFormatId,
      format: selectedFormat,
      quality: selectedQuality,
      startTime: trimEnabled && startTime.trim() ? startTime.trim() : null,
      endTime: trimEnabled && endTime.trim() ? endTime.trim() : null,
    };

    try {
      const result = await triggerMediaDownload(
        options,
        controller.signal,
        (pct) => setDownloadProgress(pct)
      );

      setState('completed');
      setDownloadProgress(100);

      if (onSuccessDownload) {
        onSuccessDownload({
          title: metadata.title,
          platform: metadata.platform,
          format: selectedFormat.toUpperCase(),
          filename: result.filename,
          url: metadata.url,
          filesize: result.filesize,
        });
      }

      if (showToast) {
        showToast('success', `Exported: ${result.filename}`);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Media download failed.';
      setErrorMessage(msg);
      setState('error');
      if (showToast) {
        showToast('error', msg);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [
    metadata,
    state,
    outputType,
    selectedFormatId,
    selectedFormat,
    selectedQuality,
    trimEnabled,
    startTime,
    endTime,
    onSuccessDownload,
    showToast,
  ]);

  return {
    state,
    url,
    metadata,
    errorMessage,
    outputType,
    selectedFormatId,
    selectedFormat,
    selectedQuality,
    trimEnabled,
    startTime,
    endTime,
    downloadProgress,
    setOutputType,
    setSelectedFormatId,
    setSelectedFormat,
    setSelectedQuality,
    setTrimEnabled,
    setStartTime,
    setEndTime,
    handleUrlSubmit,
    handleDownload,
    cancelOperation,
    reset,
  };
}
