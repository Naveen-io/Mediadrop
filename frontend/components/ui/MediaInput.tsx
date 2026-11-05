'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Link2, Clipboard, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { ProcessingState } from '@/types/media';
import { GlassInput, GlassButton } from '@zakisheriff/liquid-glass';

interface MediaInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  state: ProcessingState;
  onClear?: () => void;
  errorMessage?: string | null;
}

export function MediaInput({
  onSubmit,
  isLoading,
  state,
  onClear,
  errorMessage,
}: MediaInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasClipboard, setHasClipboard] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.clipboard && 'readText' in navigator.clipboard) {
      setHasClipboard(true);
    }
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setInputValue(text.trim());
        setLocalError(null);
        inputRef.current?.focus();
      }
    } catch {
      // Graceful fallback for clipboard permission denial
    }
  };

  const handleClear = () => {
    setInputValue('');
    setLocalError(null);
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  const validateAndSubmit = (urlToTest: string) => {
    const trimmed = urlToTest.trim();
    if (!trimmed) {
      setLocalError('Please enter a media URL.');
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setLocalError('Only HTTP and HTTPS media URLs are supported.');
        return;
      }
    } catch {
      setLocalError('Please enter a valid media web address.');
      return;
    }

    setLocalError(null);
    onSubmit(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      validateAndSubmit(inputValue);
    }
  };

  const displayError = localError || (state === 'error' ? errorMessage : null);

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Apple Liquid Glass Input with refraction and focus glow */}
        <div className="flex-1 min-w-0">
          <GlassInput
            ref={inputRef}
            type="url"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (localError) setLocalError(null);
            }}
            placeholder="Paste a public media URL here..."
            icon={<Link2 className="w-4 h-4 text-white/70" />}
            onClear={handleClear}
            disabled={isLoading}
            intensity={5}
            aria-label="Media URL input"
          />
        </div>

        {/* Action Buttons using Liquid Glass buttons */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          {hasClipboard && !inputValue && !isLoading && (
            <GlassButton
              type="button"
              onClick={handlePaste}
              variant="glass"
              size="md"
              intensity={4}
              className="hidden sm:inline-flex"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5 mr-1.5" />
              <span>Paste</span>
            </GlassButton>
          )}

          {/* Primary Action Button: variant="filled" with shimmer */}
          <GlassButton
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            variant="filled"
            size="md"
            shimmer={true}
            intensity={6}
            aria-label="Analyze URL"
            className="w-full sm:w-auto font-semibold shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                <span>Analyzing</span>
              </>
            ) : (
              <>
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </GlassButton>
        </div>
      </form>

      {/* Real URL validation and error feedback */}
      {displayError && (
        <div className="flex items-center gap-1.5 mt-2 ml-1 text-xs text-[#EF4444] animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
