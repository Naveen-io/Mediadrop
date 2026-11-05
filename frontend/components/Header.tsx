'use client';

import React from 'react';
import { BackendHealth } from '@/types/media';
import { History, Settings as SettingsIcon, Layers } from 'lucide-react';
import { GlassButton } from '@zakisheriff/liquid-glass';

interface HeaderProps {
  health: BackendHealth;
  isCheckingHealth: boolean;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenBatch: () => void;
}

export function Header({
  health,
  isCheckingHealth,
  historyCount,
  onOpenHistory,
  onOpenSettings,
  onOpenBatch,
}: HeaderProps) {
  return (
    <header className="w-full border-b border-[#292929] bg-black/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Official Liquid Glass App Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 shadow-glow group shrink-0 bg-[#0A0A0A]">
            <img
              src="/logo.png"
              alt="MediaDrop Logo"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">
                MediaDrop
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#171717] border border-[#292929] text-[#A3A3A3]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#737373] hidden sm:block">
              Precision media export utility
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Batch Modal Button */}
          <GlassButton
            onClick={onOpenBatch}
            variant="glass"
            size="sm"
            intensity={4}
            title="Batch Export"
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            <span className="hidden md:inline">Batch</span>
          </GlassButton>

          {/* History Button */}
          <GlassButton
            onClick={onOpenHistory}
            variant="glass"
            size="sm"
            intensity={4}
            title="Download History & Files"
          >
            <History className="w-3.5 h-3.5 mr-1" />
            <span className="hidden md:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white text-black font-bold">
                {historyCount}
              </span>
            )}
          </GlassButton>

          {/* Settings Button */}
          <GlassButton
            onClick={onOpenSettings}
            variant="clear"
            size="sm"
            intensity={4}
            title="Preferences & Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </GlassButton>
        </div>
      </div>
    </header>
  );
}
