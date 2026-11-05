'use client';

import React from 'react';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { ProcessingState } from '@/types/media';

interface DownloadButtonProps {
  state: ProcessingState;
  onClick: () => void;
  label?: string;
  format?: string;
  resolution?: string;
  progress?: number;
  disabled?: boolean;
  className?: string;
}

export function DownloadButton({
  state,
  onClick,
  label,
  format = 'MP4',
  resolution,
  progress = 0,
  disabled = false,
  className = '',
}: DownloadButtonProps) {
  const isDownloading = state === 'downloading';
  const isCompleted = state === 'completed';
  const isError = state === 'error';
  const isPreparing = state === 'validating' || state === 'fetching';

  const isDisabled = disabled || isDownloading || isPreparing;

  // Determine button text label
  let displayText = label || `Download ${format.toUpperCase()}`;
  let subText = resolution ? `Resolution: ${resolution}` : 'Ready to export';

  if (isDownloading) {
    displayText = progress > 0 ? `Exporting (${progress}%)` : 'Processing Stream...';
    subText = 'Please wait...';
  } else if (isCompleted) {
    displayText = 'Export Completed';
    subText = 'Saved to downloads';
  } else if (isError) {
    displayText = 'Retry Export';
    subText = 'Click to try again';
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Format label adjacent to the circular action */}
      <div className="flex flex-col items-end sm:items-start text-right sm:text-left select-none">
        <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
          {displayText}
        </span>
        <span className="text-[11px] text-[#737373] font-mono">
          {subText}
        </span>
      </div>

      {/* Exact Uiverse by karthik092726122003: .styled-wrapper > .button > .button-box > .button-elem */}
      <div className="styled-wrapper shrink-0">
        <button
          className={`button ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          onClick={onClick}
          disabled={isDisabled}
          aria-label={displayText}
          title={displayText}
          type="button"
        >
          {isDownloading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          ) : isCompleted ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          ) : isError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="button-box">
              <span className="button-elem">
                <svg viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.3 0 4.4l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.3 0 4.4 1.2 1.1 3.3.8 4.4-.3l16-17c.5-.5.8-1.1.8-1.9z" />
                </svg>
              </span>
              <span className="button-elem">
                <svg viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.3 0 4.4l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.3 0 4.4 1.2 1.1 3.3.8 4.4-.3l16-17c.5-.5.8-1.1.8-1.9z" />
                </svg>
              </span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
