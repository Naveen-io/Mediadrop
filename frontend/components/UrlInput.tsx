'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Link2, Clipboard, ArrowRight, Loader2, X } from 'lucide-react';
import { ProcessingState } from '@/types/media';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  state: ProcessingState;
  onClear?: () => void;
}

export function UrlInput({ onSubmit, isLoading, state, onClear }: UrlInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasClipboard, setHasClipboard] = useState(false);
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
        inputRef.current?.focus();
      }
    } catch {
      // User denied clipboard permission or browser unsupported
    }
  };

  const handleClear = () => {
    setInputValue('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && inputValue.trim()) {
      e.preventDefault();
      onSubmit(inputValue.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && inputValue.trim()) {
      onSubmit(inputValue.trim());
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-surface border border-border group-focus-within:border-accent/60 group-focus-within:ring-2 group-focus-within:ring-accent/15 rounded-xl transition-all duration-200 shadow-card">
          {/* Link Icon */}
          <div className="pl-4 pr-2 text-text-muted shrink-0">
            <Link2 className="w-5 h-5 group-focus-within:text-accent transition-colors" />
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://www.youtube.com/watch?v=... or soundcloud.com/..."
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
            className="w-full py-4 pr-3 bg-transparent text-sm sm:text-base text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />

          {/* Action buttons inside container */}
          <div className="flex items-center gap-1.5 pr-2.5 shrink-0">
            {/* Clear Button */}
            {inputValue && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-md transition-colors"
                title="Clear input"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Paste Button */}
            {hasClipboard && !inputValue && !isLoading && (
              <button
                type="button"
                onClick={handlePaste}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-elevated hover:bg-surface-highlight border border-border rounded-md transition-colors"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}

            {/* Submit / Fetch Button */}
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-background bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent transition-all duration-150 shadow-subtle cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Fetching</span>
                </>
              ) : (
                <>
                  <span>Fetch</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
