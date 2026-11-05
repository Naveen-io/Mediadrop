'use client';

import React, { useState } from 'react';
import {
  ProcessingState,
  MediaMetadata,
} from '@/types/media';
import { formatBytes, formatDuration } from '@/lib/formatters';
import {
  Link2,
  Film,
  Music,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { TrimControls } from './TrimControls';
import { ProcessingLoader } from '@/components/ui/ProcessingLoader';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { TextAnimate } from '@/components/ui/text-animate';
import { GlassCard, GlassSegmented, GlassButton } from '@zakisheriff/liquid-glass';

interface OutputPanelProps {
  state: ProcessingState;
  metadata: MediaMetadata | null;
  errorMessage: string | null;
  outputType: 'video' | 'audio';
  selectedFormatId: string;
  selectedFormat: string;
  selectedQuality: string;
  trimEnabled: boolean;
  startTime: string;
  endTime: string;
  downloadProgress: number;
  onOutputTypeChange: (type: 'video' | 'audio') => void;
  onFormatIdChange: (id: string) => void;
  onFormatChange: (fmt: string) => void;
  onQualityChange: (quality: string) => void;
  onTrimToggle: (enabled: boolean) => void;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  onDownload: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function OutputPanel({
  state,
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
  onOutputTypeChange,
  onFormatIdChange,
  onFormatChange,
  onQualityChange,
  onTrimToggle,
  onStartTimeChange,
  onEndTimeChange,
  onDownload,
  onCancel,
  onRetry,
}: OutputPanelProps) {
  const [thumbError, setThumbError] = useState(false);

  // 1. Initial Empty State
  if (state === 'idle') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 mt-2 mb-8 sm:mb-12">
        <div className="min-h-[135px] sm:min-h-[155px] p-5 sm:p-7 rounded-2xl bg-[#0A0A0A] border border-[#292929] border-dashed text-center flex flex-col items-center justify-center">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center text-[#737373] mb-2.5 shadow-subtle">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex justify-center text-center">
            <TextAnimate
              as="h3"
              by="word"
              animation="blurInUp"
              duration={0.5}
              once={true}
              className="text-sm sm:text-base font-semibold text-white mb-1 text-center"
            >
              Your media will appear here
            </TextAnimate>
          </div>
          <div className="flex justify-center text-center max-w-sm mx-auto">
            <TextAnimate
              as="p"
              by="word"
              animation="blurInUp"
              duration={0.6}
              delay={0.12}
              once={true}
              className="text-xs sm:text-[13px] text-[#A3A3A3] text-center leading-relaxed"
            >
              Paste a public link above to inspect available video resolutions, audio bitrates, and export options.
            </TextAnimate>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State (Validating or Fetching Metadata)
  if (state === 'validating' || state === 'fetching') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 my-6">
        <div className="p-8 sm:p-10 rounded-xl bg-[#0A0A0A] border border-[#292929] text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
          <ProcessingLoader
            stage="Analyzing"
            subtext="Inspecting stream descriptors and media tracks with yt-dlp..."
            onCancel={onCancel}
          />
        </div>
      </div>
    );
  }

  // 3. Error State
  if (state === 'error') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 my-6">
        <div className="p-6 sm:p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/40 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444] mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1.5">
            Unable to Process Media
          </h3>
          <p className="text-xs sm:text-sm text-[#A3A3A3] max-w-md mx-auto mb-5 leading-relaxed">
            {errorMessage || 'The requested URL could not be accessed. Please verify that the link is public and accessible.'}
          </p>
          <div className="flex items-center gap-3">
            <GlassButton
              onClick={onRetry}
              variant="filled"
              size="sm"
              intensity={5}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Retry</span>
            </GlassButton>
            <GlassButton
              onClick={onCancel}
              variant="clear"
              size="sm"
            >
              Clear
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  // 4. Ready, Downloading, or Completed State
  if (!metadata) return null;

  const isDownloading = state === 'downloading';
  const isCompleted = state === 'completed';

  // Calculate selected format's estimated file size if available
  const currentFormat = metadata.available_formats.find((f) => f.format_id === selectedFormatId);
  const estimatedSize = currentFormat?.filesize || currentFormat?.filesize_approx;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 my-6">
      {/* Apple Liquid Glass Container Card */}
      <GlassCard
        variant="regular"
        intensity={5}
        radius="20px"
        padding="0px"
        className="rounded-2xl border border-[#292929] overflow-hidden shadow-card animate-in fade-in duration-200"
      >
        {/* Top Banner: Media Info */}
        <div className="p-4 sm:p-5 border-b border-[#292929] flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <div className="relative w-full sm:w-48 h-32 sm:h-28 rounded-lg overflow-hidden bg-[#111111] border border-[#292929] shrink-0 flex items-center justify-center">
            {metadata.thumbnail && !thumbError ? (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                onError={() => setThumbError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#737373] text-xs p-2 text-center">
                <Film className="w-6 h-6 mb-1 text-white/50" />
                <span>Media Stream</span>
              </div>
            )}
            {/* Duration Badge */}
            {metadata.duration_formatted && (
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/90 text-[10px] font-mono text-white border border-[#292929] backdrop-blur-sm">
                {metadata.duration_formatted}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#171717] border border-[#292929] text-white">
                  {metadata.platform}
                </span>
                {metadata.uploader && (
                  <span className="flex items-center gap-1 text-[11px] text-[#A3A3A3] truncate">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">{metadata.uploader}</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-2 leading-snug">
                {metadata.title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 text-[11px] text-[#737373] border-t border-[#292929]/50">
              {metadata.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(metadata.duration)}</span>
                </span>
              )}
              {estimatedSize && (
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  <span>Est. size: ~{formatBytes(estimatedSize)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="p-4 sm:p-5">
          {/* Apple GlassSegmented Mode Switcher (Video vs Audio) */}
          <div className="mb-4">
            <GlassSegmented
              options={[
                { label: 'Video Export', icon: <Film className="w-3.5 h-3.5 mr-1" /> },
                { label: 'Audio Only', icon: <Music className="w-3.5 h-3.5 mr-1" /> },
              ]}
              value={outputType === 'video' ? 0 : 1}
              onChange={(idx) => {
                if (!isDownloading) {
                  onOutputTypeChange(idx === 0 ? 'video' : 'audio');
                }
              }}
              size="md"
              intensity={5}
              aria-label="Export Mode Switcher"
            />
          </div>

          {/* Format Selectors */}
          {outputType === 'video' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Resolution Selector */}
              <div>
                <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                  Available Resolution
                </label>
                <select
                  value={selectedFormatId}
                  onChange={(e) => {
                    onFormatIdChange(e.target.value);
                    const sel = metadata.available_formats.find((f) => f.format_id === e.target.value);
                    if (sel?.resolution) onQualityChange(sel.resolution);
                  }}
                  disabled={isDownloading}
                  className="w-full px-3 py-2 text-xs bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white disabled:opacity-50"
                >
                  {metadata.available_formats.map((f) => (
                    <option key={f.format_id} value={f.format_id}>
                      {f.quality_label || f.resolution || f.ext.toUpperCase()}
                      {f.filesize || f.filesize_approx
                        ? ` (~${formatBytes(f.filesize || f.filesize_approx)})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Container Format */}
              <div>
                <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                  Container Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onFormatChange('mp4')}
                    disabled={isDownloading}
                    className={`py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                      selectedFormat === 'mp4'
                        ? 'border-white bg-white text-black'
                        : 'border-[#292929] bg-[#111111] text-[#A3A3A3] hover:text-white'
                    }`}
                  >
                    MP4 (H.264)
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormatChange('webm')}
                    disabled={isDownloading}
                    className={`py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                      selectedFormat === 'webm'
                        ? 'border-white bg-white text-black'
                        : 'border-[#292929] bg-[#111111] text-[#A3A3A3] hover:text-white'
                    }`}
                  >
                    WebM (VP9)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Audio Format Preset */}
              <div>
                <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                  Audio Quality Preset
                </label>
                <select
                  value={selectedFormatId}
                  onChange={(e) => {
                    onFormatIdChange(e.target.value);
                    const opt = metadata.available_audio_formats.find((a) => a.format_id === e.target.value);
                    if (opt) {
                      onFormatChange(opt.ext);
                      if (opt.abr) onQualityChange(`${opt.abr}k`);
                    }
                  }}
                  disabled={isDownloading}
                  className="w-full px-3 py-2 text-xs bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white disabled:opacity-50"
                >
                  {metadata.available_audio_formats.map((af) => (
                    <option key={af.format_id} value={af.format_id}>
                      {af.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format selection */}
              <div>
                <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                  Codec / Extension
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['mp3', 'm4a', 'wav'] as const).map((ext) => (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => onFormatChange(ext)}
                      disabled={isDownloading}
                      className={`py-2 text-xs font-semibold rounded-md border uppercase transition-all cursor-pointer ${
                        selectedFormat === ext
                          ? 'border-white bg-white text-black'
                          : 'border-[#292929] bg-[#111111] text-[#A3A3A3] hover:text-white'
                      }`}
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trimming Controls */}
          <TrimControls
            enabled={trimEnabled}
            onToggle={onTrimToggle}
            startTime={startTime}
            onStartTimeChange={onStartTimeChange}
            endTime={endTime}
            onEndTimeChange={onEndTimeChange}
            durationFormatted={metadata.duration_formatted}
          />

          {/* Processing Loader when Downloading / Processing */}
          {isDownloading && (
            <div className="mt-4 pt-4 border-t border-[#292929] bg-[#111111] rounded-lg border">
              <ProcessingLoader
                stage={downloadProgress > 0 ? 'Downloading' : 'Processing'}
                subtext="Transcoding and muxing streams with FFmpeg..."
                progress={downloadProgress}
                onCancel={onCancel}
              />
            </div>
          )}

          {/* Action / Download Area */}
          <div className="mt-5 pt-4 border-t border-[#292929] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#737373]">
              {isDownloading ? (
                <span className="text-white font-mono">
                  Export in progress ({downloadProgress}%)...
                </span>
              ) : isCompleted ? (
                <span className="flex items-center gap-1.5 text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Download completed. Check your downloads directory.</span>
                </span>
              ) : (
                <span>Ready to export. Pure media without watermarks or ads.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Premium Animated Download Button (karthik092726122003 reference) */}
              <DownloadButton
                state={state}
                onClick={onDownload}
                label={`Export ${outputType === 'video' ? 'Video' : 'Audio'} (${selectedFormat.toUpperCase()})`}
                format={selectedFormat}
                progress={downloadProgress}
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
