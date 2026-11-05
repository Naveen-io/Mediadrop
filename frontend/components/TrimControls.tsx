'use client';

import React from 'react';
import { Scissors, Clock } from 'lucide-react';
import { GlassSwitch } from '@zakisheriff/liquid-glass';

interface TrimControlsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  startTime: string;
  onStartTimeChange: (val: string) => void;
  endTime: string;
  onEndTimeChange: (val: string) => void;
  durationFormatted?: string | null;
}

export function TrimControls({
  enabled,
  onToggle,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  durationFormatted,
}: TrimControlsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-[#292929]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-white" />
          <span className="text-xs font-semibold text-white">
            Timestamp Trimming (Optional)
          </span>
        </div>
        {/* Apple Liquid Glass Switch with tactile spring and refraction */}
        <GlassSwitch
          checked={enabled}
          onChange={onToggle}
          intensity={5}
          tint="#ffffff"
          aria-label="Toggle timestamp trimming"
        />
      </div>

      {enabled && (
        <div className="bg-[#111111]/80 backdrop-blur-sm p-3.5 rounded-xl border border-[#292929] animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                Start Time (HH:MM:SS or SS)
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#737373]" />
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  placeholder="00:00:00"
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#0A0A0A] border border-[#292929] rounded-lg text-white placeholder-[#737373] focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#A3A3A3] mb-1">
                End Time (HH:MM:SS or SS)
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#737373]" />
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  placeholder={durationFormatted || '00:01:30'}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#0A0A0A] border border-[#292929] rounded-lg text-white placeholder-[#737373] focus:outline-none focus:border-white"
                />
              </div>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#737373]">
            Leave blank to export from the beginning or up to the end of the media stream.
          </p>
        </div>
      )}
    </div>
  );
}
