'use client';

import React from 'react';
import { TextAnimate } from '@/components/ui/text-animate';
import { Spotlight } from '@/components/ui/spotlight';

export function Hero() {
  return (
    <div
      id="downloader"
      className="relative text-center pt-3 sm:pt-6 pb-2 sm:pb-3 max-w-4xl mx-auto px-4 overflow-hidden"
    >
      {/* Aceternity Spotlight (Refined monochrome beam of light) */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />

      {/* Workflow Microcopy */}
      <div className="relative z-10 inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#0A0A0A] border border-[#292929] text-[10px] sm:text-[11px] font-mono tracking-wider text-[#A3A3A3] uppercase mb-3 shadow-subtle">
        <span>Paste Link</span>
        <span className="text-white">→</span>
        <span>Select Format</span>
        <span className="text-white">→</span>
        <span>Export</span>
      </div>

      {/* Magic UI Text Animate (Smooth, restrained entrance animation) */}
      <div className="relative z-10 flex justify-center text-center">
        <TextAnimate
          as="h1"
          by="word"
          animation="blurInUp"
          duration={0.65}
          delay={0.08}
          once={true}
          className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.15] mb-2.5 text-center"
        >
          Your media. Your format. Your control.
        </TextAnimate>
      </div>

      {/* Supporting Text with Magic UI Text Animate blur-to-sharp */}
      <div className="relative z-10 flex justify-center text-center max-w-xl mx-auto">
        <TextAnimate
          as="p"
          by="word"
          animation="blurInUp"
          duration={0.55}
          delay={0.16}
          once={true}
          className="text-xs sm:text-sm md:text-base text-[#A3A3A3] text-center leading-relaxed"
        >
          Paste a supported public media URL and choose exactly how you want to export it. High precision, ad-free, and processed on demand.
        </TextAnimate>
      </div>
    </div>
  );
}
