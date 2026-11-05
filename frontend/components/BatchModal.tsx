'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BatchResponse } from '@/types/media';
import { submitBatchJob, getBatchDownloadUrl } from '@/lib/api';
import { formatBytes } from '@/lib/formatters';
import {
  X,
  Layers,
  Download,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  ArrowRight,
} from 'lucide-react';
import { ProcessingLoader } from '@/components/ui/ProcessingLoader';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { GlassButton } from '@zakisheriff/liquid-glass';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export function BatchModal({ isOpen, onClose, showToast }: BatchModalProps) {
  const [urlsInput, setUrlsInput] = useState('');
  const [outputType, setOutputType] = useState<'video' | 'audio'>('video');
  const [format, setFormat] = useState('mp4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleStartBatch = async () => {
    const rawLines = urlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      setError('Please paste at least one media link.');
      return;
    }

    if (rawLines.length > 10) {
      setError('A maximum of 10 URLs can be processed per batch.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setBatchResult(null);

    try {
      const response = await submitBatchJob(rawLines, outputType, format);
      setBatchResult(response);
      if (showToast) {
        showToast('success', `Batch complete: ${response.items.filter((i) => i.status === 'completed').length} processed.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch processing failed.';
      setError(msg);
      if (showToast) {
        showToast('error', msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl bg-[#0A0A0A] border border-[#292929] rounded-2xl shadow-card overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#111111] border border-[#292929] flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 id="batch-modal-title" className="text-sm font-semibold text-white">
                Batch Media Export
              </h2>
              <p className="text-[11px] text-[#A3A3A3]">
                Queue up to 10 public links to produce a unified ZIP archive
              </p>
            </div>
          </div>
          <GlassButton
            onClick={onClose}
            variant="clear"
            size="sm"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </GlassButton>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-start gap-2.5 text-xs text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="py-6">
              <ProcessingLoader
                stage="Processing"
                subtext="Sequential batch stream extraction and ZIP packaging in progress..."
              />
            </div>
          ) : !batchResult ? (
            <div className="space-y-4">
              {/* URLs Textarea */}
              <div>
                <label className="block text-xs font-mono text-[#A3A3A3] mb-1">
                  Public Media URLs (One per line, up to 10)
                </label>
                <textarea
                  rows={5}
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  placeholder={`https://www.youtube.com/watch?v=...\nhttps://soundcloud.com/...\nhttps://vimeo.com/...`}
                  className="w-full p-3 text-xs font-mono bg-[#111111] border border-[#292929] rounded-lg text-white placeholder-[#737373] focus:outline-none focus:border-white"
                />
              </div>

              {/* Format selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                    Export Type
                  </label>
                  <select
                    value={outputType}
                    onChange={(e) => {
                      const t = e.target.value as 'video' | 'audio';
                      setOutputType(t);
                      setFormat(t === 'video' ? 'mp4' : 'mp3');
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white"
                  >
                    <option value="video">Video (MP4 / WebM)</option>
                    <option value="audio">Audio Only (MP3 / M4A / WAV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                    Container Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white"
                  >
                    {outputType === 'video' ? (
                      <>
                        <option value="mp4">MP4 (H.264)</option>
                        <option value="webm">WebM (VP9)</option>
                      </>
                    ) : (
                      <>
                        <option value="mp3">MP3 (320kbps)</option>
                        <option value="m4a">M4A (AAC)</option>
                        <option value="wav">WAV (Lossless)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#111111] border border-[#292929] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center font-bold">
                    <FileArchive className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">
                      ZIP Archive Ready
                    </h3>
                    <p className="text-[11px] text-[#A3A3A3]">
                      {batchResult.items.filter((i) => i.status === 'completed').length} of {batchResult.total} items packed
                    </p>
                  </div>
                </div>

                {batchResult.download_url && (
                  <GlassButton
                    href={getBatchDownloadUrl(batchResult.batch_id)}
                    variant="filled"
                    size="sm"
                    shimmer={true}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Download ZIP</span>
                  </GlassButton>
                )}
              </div>

              {/* Item details */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {batchResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md bg-[#111111] border border-[#292929] flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[70%]">
                      <p className="font-medium text-white truncate">
                        {item.title || item.url}
                      </p>
                      {item.error ? (
                        <p className="text-[10px] text-[#EF4444] truncate">{item.error}</p>
                      ) : (
                        <p className="text-[10px] text-[#737373] font-mono">
                          {item.filesize ? formatBytes(item.filesize) : 'Processed'}
                        </p>
                      )}
                    </div>
                    <div>
                      {item.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-white text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Done</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#EF4444] text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#292929] flex items-center justify-end gap-2.5 bg-[#111111]">
          {batchResult ? (
            <GlassButton
              onClick={() => {
                setBatchResult(null);
                setUrlsInput('');
              }}
              variant="glass"
              size="sm"
            >
              Start Another Batch
            </GlassButton>
          ) : (
            <>
              <GlassButton
                onClick={onClose}
                disabled={isProcessing}
                variant="clear"
                size="sm"
              >
                Cancel
              </GlassButton>
              <GlassButton
                onClick={handleStartBatch}
                disabled={isProcessing || !urlsInput.trim()}
                variant="filled"
                size="sm"
                shimmer={true}
              >
                <span className="mr-1">Process Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </GlassButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
