'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BackendHealth } from '@/types/media';
import { X, Check, Copy, MessageSquare, Terminal, ExternalLink } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: BackendHealth;
  showToast?: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export function SupportModal({
  isOpen,
  onClose,
  health,
  showToast,
}: SupportModalProps) {
  const [copied, setCopied] = useState(false);

  // Escape key support
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const diagnosticsText = `MediaDrop System Diagnostics:
- Status: ${health.status}
- Backend Version: ${health.version || '1.0.0'}
- FFmpeg Available: ${health.ffmpeg_installed ? 'Yes' : 'No'}
- FFprobe Available: ${health.ffprobe_installed ? 'Yes' : 'No'}
- yt-dlp Version: ${health.ytdlp_version || 'N/A'}
- Storage Quota: ${health.storage_used_mb ?? 0} MB / ${health.storage_quota_mb ?? 2048} MB
- Timestamp: ${new Date().toISOString()}`;

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsText);
      setCopied(true);
      if (showToast) {
        showToast('success', 'Diagnostic information copied to clipboard.');
      }
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-[#0A0A0A] border border-[#292929] rounded-2xl shadow-card overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-white" />
            <h2 id="support-modal-title" className="text-sm font-semibold text-white">
              Support & Diagnostics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-white rounded-md transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-[#A3A3A3] leading-relaxed">
            Need assistance or encountering an issue with a media source? Copy live system telemetry below for technical inquiries.
          </p>

          {/* Diagnostics Box */}
          <div className="p-3.5 rounded-lg bg-[#111111] border border-[#292929] font-mono text-[11px] text-[#A3A3A3] space-y-1">
            <div className="flex items-center justify-between text-white font-semibold pb-1.5 border-b border-[#292929]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Runtime Diagnostics</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#171717] border border-[#292929] text-white">
                {health.status}
              </span>
            </div>
            <div className="pt-1.5 space-y-1">
              <div>Backend Version: <span className="text-white">{health.version || '1.0.0'}</span></div>
              <div>FFmpeg Installed: <span className="text-white">{health.ffmpeg_installed ? 'Yes' : 'No'}</span></div>
              <div>yt-dlp Core: <span className="text-white">{health.ytdlp_version || 'Active'}</span></div>
              <div>Storage Quota: <span className="text-white">{health.storage_used_mb ?? 0} MB / {health.storage_quota_mb ?? 2048} MB</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#292929] flex items-center justify-between bg-[#111111]">
          <button
            onClick={handleCopyDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white hover:text-black bg-[#171717] hover:bg-white border border-[#292929] hover:border-white rounded-md transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Telemetry</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[#A3A3A3] hover:text-white bg-[#171717] border border-[#292929] rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
