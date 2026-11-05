'use client';

import React from 'react';
import { Layers, ShieldCheck, Cpu, Terminal, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onOpenBatch?: () => void;
  onOpenSettings?: () => void;
  onOpenDiagnostics?: () => void;
}

export function Footer({ onOpenBatch, onOpenSettings, onOpenDiagnostics }: FooterProps) {
  return (
    <footer className="relative border-t border-[#292929] bg-[#000000] text-xs text-[#737373] overflow-hidden">
      {/* Subtle ambient low-opacity watermark */}
      <div
        aria-hidden="true"
        className="absolute -bottom-6 sm:-bottom-10 right-4 sm:right-12 text-[5rem] sm:text-[9rem] font-black text-white/[0.015] select-none pointer-events-none tracking-tighter uppercase font-mono"
      >
        MEDIADROP
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-36 sm:pb-44 relative z-10">
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-12">
          {/* Column 1: Brand & Purpose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-[#0A0A0A]">
                <img
                  src="/logo.png"
                  alt="MediaDrop Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-white text-sm tracking-tight">
                MediaDrop
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#171717] border border-[#292929] text-[#A3A3A3]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
              Precision public media inspection and transcode pipeline. Pure monochrome, ad-free, and engineered for high-fidelity export.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-[#737373]">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Zero telemetry • Ephemeral caching</span>
            </div>
          </div>

          {/* Column 2: Supported Ingestion */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-white mb-3">
              Supported Sources
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                YouTube (Streams, 4K, 1080p, Shorts)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                SoundCloud (Public tracks & playlists)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                Vimeo (Public showcase clips)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                Twitter / X (Public video posts)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                TikTok & Twitch (Public VODs & clips)
              </li>
            </ul>
          </div>

          {/* Column 3: Engine Pipeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-white mb-3">
              Export Presets
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                MP4 • Universal (H.264 + AAC)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                WebM • Open Web (VP9 + Opus)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                MP3 • High Fidelity (320kbps / 192kbps)
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                M4A • Native Apple AAC Stream
              </li>
              <li className="text-[#A3A3A3] hover:text-white transition-colors cursor-default">
                WAV • Uncompressed Studio PCM
              </li>
            </ul>
          </div>

          {/* Column 4: Architecture & Shortcuts */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-white mb-3">
              Architecture
            </h4>
            <div className="space-y-2 text-[11px] text-[#A3A3A3]">
              <p>Frontend: Next.js 15 (App Router)</p>
              <p>Backend: FastAPI (Python 3.14)</p>
              <p>Processing: FFmpeg + yt-dlp</p>
              <p>Security: SSRF Isolation Firewall</p>
            </div>
            {onOpenBatch && (
              <button
                onClick={onOpenBatch}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-white hover:text-[#A3A3A3] transition-colors cursor-pointer"
              >
                <span>Launch Batch Engine</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                className="mt-2 block text-[10px] font-mono text-[#737373] hover:text-[#A3A3A3] transition-colors cursor-pointer"
              >
                Diagnostic Telemetry →
              </button>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#292929] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">MediaDrop</span>
            <span>•</span>
            <span>Commercial-grade media processing utility</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#737373]">
            <span>No DRM bypass</span>
            <span>•</span>
            <span>Educational & creator tooling</span>
            <span>•</span>
            <span className="font-mono text-white">v1.0.0-mvp</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
