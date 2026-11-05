'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserSettings } from '@/types/media';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { X, Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';
import { GlassButton, GlassSegmented } from '@zakisheriff/liquid-glass';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (updated: Partial<UserSettings>) => void;
  showToast?: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  showToast,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<UserSettings>(settings);

  // Sync state if settings prop changes
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

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

  const handleSave = () => {
    onSave(formData);
    if (showToast) {
      showToast('success', 'Preferences saved.');
    }
    onClose();
  };

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS);
    onSave(DEFAULT_SETTINGS);
    if (showToast) {
      showToast('info', 'Preferences reset to defaults.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
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
            <SettingsIcon className="w-4 h-4 text-white" />
            <h2 id="settings-modal-title" className="text-sm font-semibold text-white">
              Preferences & Configuration
            </h2>
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

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Default Output Type */}
          <div>
            <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1.5">
              Default Mode on Inspection
            </label>
            <GlassSegmented
              options={[
                { label: 'Video Export' },
                { label: 'Audio Only' },
              ]}
              value={formData.defaultOutputType === 'video' ? 0 : 1}
              onChange={(idx) =>
                setFormData((prev) => ({
                  ...prev,
                  defaultOutputType: idx === 0 ? 'video' : 'audio',
                }))
              }
              size="md"
              intensity={5}
            />
          </div>

          {/* Default Containers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                Default Video Format
              </label>
              <select
                value={formData.defaultVideoFormat}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultVideoFormat: e.target.value }))
                }
                className="w-full px-3 py-2 bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white"
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="webm">WebM (VP9)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                Default Audio Format
              </label>
              <select
                value={formData.defaultAudioFormat}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultAudioFormat: e.target.value }))
                }
                className="w-full px-3 py-2 bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white"
              >
                <option value="mp3">MP3</option>
                <option value="m4a">M4A</option>
                <option value="wav">WAV</option>
              </select>
            </div>
          </div>

          {/* Default Audio Bitrate */}
          <div>
            <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
              Preferred Audio Bitrate
            </label>
            <select
              value={formData.defaultAudioBitrate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, defaultAudioBitrate: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#111111] border border-[#292929] rounded-md text-white focus:outline-none focus:border-white"
            >
              <option value="320k">320 kbps (High Fidelity)</option>
              <option value="192k">192 kbps (Standard)</option>
              <option value="128k">128 kbps (Compact)</option>
            </select>
          </div>

          {/* Backend API Endpoint */}
          <div>
            <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
              Backend API URL
            </label>
            <input
              type="text"
              value={formData.apiUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, apiUrl: e.target.value }))
              }
              placeholder="http://localhost:8000"
              className="w-full px-3 py-2 bg-[#111111] border border-[#292929] rounded-md text-white font-mono focus:outline-none focus:border-white"
            />
            <p className="mt-1 text-[10px] text-[#737373]">
              Origin server hosting FastAPI and media processing routines.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#292929] flex items-center justify-between bg-[#111111]">
          <GlassButton
            onClick={handleReset}
            variant="destructive"
            size="sm"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            <span>Reset Defaults</span>
          </GlassButton>
          <div className="flex items-center gap-2">
            <GlassButton
              onClick={onClose}
              variant="clear"
              size="sm"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleSave}
              variant="filled"
              size="sm"
              shimmer={true}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save</span>
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
