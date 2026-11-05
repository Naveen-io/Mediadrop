'use client';

import React from 'react';
import { XCircle } from 'lucide-react';

export type ProcessingStage =
  | 'Downloading'
  | 'Analyzing'
  | 'Preparing'
  | 'Processing'
  | 'Converting';

interface ProcessingLoaderProps {
  stage?: ProcessingStage | string;
  subtext?: string;
  progress?: number | null;
  onCancel?: () => void;
  className?: string;
}

export function ProcessingLoader({
  stage = 'Downloading',
  subtext,
  progress,
  onCancel,
  className = '',
}: ProcessingLoaderProps) {
  const letters = stage.split('');
  const hasProgress = typeof progress === 'number' && progress > 0;

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Exact Uiverse by dexter-st: .loader-wrapper with .loader-letter and .loader */}
      <div className="loader-wrapper relative inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#0A0A0A] border border-[#292929] overflow-hidden shadow-card">
        {letters.map((char, index) => (
          <span
            key={index}
            style={{
              animationDelay: `${(index + 1) * 0.1}s`,
            }}
            className="loader-letter font-mono font-bold text-sm sm:text-base tracking-widest text-white uppercase inline-block"
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
        {/* Masked sweep effect with subtle white/grayscale tones (no rainbow/color) */}
        <div className="loader absolute inset-0 pointer-events-none" />
      </div>

      {/* Real percentage display only when real backend progress is available */}
      {hasProgress && (
        <div className="flex flex-col items-center gap-1.5 mt-3 w-full max-w-[220px]">
          <span className="text-xs font-mono text-white font-medium">
            {Math.min(100, Math.max(0, Math.round(progress)))}%
          </span>
          <div className="w-full h-1 bg-[#292929] rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-200 ease-out rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtext explanation without layout shift */}
      {subtext && (
        <p className="text-xs text-[#A3A3A3] max-w-xs mt-2 leading-relaxed font-sans">
          {subtext}
        </p>
      )}

      {/* Cancel Action if supported */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#A3A3A3] hover:text-white bg-[#111111] hover:bg-[#171717] border border-[#292929] rounded-md transition-colors cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      )}
    </div>
  );
}
