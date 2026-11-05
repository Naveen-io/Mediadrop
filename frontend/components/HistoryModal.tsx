'use client';

import React, { useEffect, useCallback } from 'react';
import { HistoryItem } from '@/types/media';
import { formatRelativeTime, formatBytes } from '@/lib/formatters';
import {
  X,
  History,
  Trash2,
  ExternalLink,
  FolderDown,
  CheckCircle2,
} from 'lucide-react';
import { GlassButton } from '@zakisheriff/liquid-glass';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClear: () => void;
  onSelectUrl: (url: string) => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  history,
  onClear,
  onSelectUrl,
}: HistoryModalProps) {
  // Escape key handler for fast, accessible keyboard dismissal
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
      // Prevent body scroll when modal is active
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      onClick={(e) => {
        // Outside-click dismissal: close when clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#292929] rounded-2xl shadow-card flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#292929] flex items-center justify-between bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#111111] border border-[#292929] flex items-center justify-center text-white">
              <History className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2
                id="history-modal-title"
                className="text-sm font-semibold text-white tracking-tight"
              >
                Files & Download History
              </h2>
              <p className="text-[11px] text-[#A3A3A3]">
                Locally saved export records ({history.length} item{history.length === 1 ? '' : 's'})
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

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {history.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center text-[#737373]">
              <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center text-[#737373]/60 mb-3.5">
                <FolderDown className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-white mb-1">
                No downloaded files yet
              </p>
              <p className="text-xs text-[#737373] max-w-xs leading-relaxed">
                Completed media downloads are retained locally in this browser session for quick inspection and review.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#111111] border border-[#292929] hover:border-white transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#171717] border border-[#292929] text-white">
                      {item.platform}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#171717] border border-[#292929] text-[#A3A3A3]">
                      {item.format.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#737373] font-mono">
                    {formatRelativeTime(item.date)}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                  {item.title}
                </h3>

                <p className="text-[11px] font-mono text-[#737373] truncate mb-3">
                  {item.filename}
                </p>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#292929]/50 text-xs">
                  <span className="text-[#A3A3A3] text-[11px] font-mono">
                    {item.filesize ? formatBytes(item.filesize) : 'Exported'}
                  </span>
                  <GlassButton
                    onClick={() => {
                      onSelectUrl(item.url);
                      onClose();
                    }}
                    variant="glass"
                    size="sm"
                    className="cursor-pointer"
                  >
                    <span className="mr-1">Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </GlassButton>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-5 py-3.5 border-t border-[#292929] bg-[#0A0A0A] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#737373]">
              Stored locally • Not synced to cloud
            </span>
            <GlassButton
              onClick={onClear}
              variant="destructive"
              destructive={true}
              size="sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Clear History</span>
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
}
