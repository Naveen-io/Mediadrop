'use client';

import React from 'react';
import { Film, Music2, Scissors, Layers } from 'lucide-react';
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid';
import { TextAnimate } from '@/components/ui/text-animate';

interface CapabilityCardsProps {
  onOpenBatch: () => void;
}

export function CapabilityCards({ onOpenBatch }: CapabilityCardsProps) {
  const features = [
    {
      Icon: Film,
      name: 'Adaptive Resolution Inspection',
      description:
        'Inspects live public streams to surface actual format ladders (up to 4K / 1080p down to 144p) derived directly from source manifests without artificial upscaling.',
      href: '#downloader',
      cta: 'Inspect Stream',
      className: 'md:col-span-2',
      background: (
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_70%)]" />
      ),
    },
    {
      Icon: Music2,
      name: 'Studio Audio Extraction',
      description:
        'Extract high-fidelity audio tracks into pristine 320kbps or 192kbps MP3, Apple AAC M4A, and lossless WAV via native FFmpeg transcode pipelines.',
      href: '#downloader',
      cta: 'Audio Presets',
      className: 'md:col-span-1',
      background: (
        <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_60%)]" />
      ),
    },
    {
      Icon: Scissors,
      name: 'Timestamp Trimming',
      description:
        'Define exact start and end cut points using standard timecodes (HH:MM:SS or seconds) to extract specific moments with sub-second accuracy.',
      href: '#downloader',
      cta: 'Configure Clip',
      className: 'md:col-span-1',
      background: (
        <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_60%)]" />
      ),
    },
    {
      Icon: Layers,
      name: 'Batch Queue & ZIP Archive',
      description:
        'Queue up to 10 public media links simultaneously. Each item is extracted sequentially and compressed into a single unified ZIP archive with automatic storage cleanup.',
      href: '#batch',
      cta: 'Open Batch Tool',
      onCtaClick: onOpenBatch,
      className: 'md:col-span-2',
      background: (
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_70%)]" />
      ),
    },
  ];

  return (
    <div id="plans" className="w-full max-w-4xl mx-auto px-4 mt-12 mb-20 scroll-mt-20">
      <div className="flex justify-center text-center mb-6">
        <TextAnimate
          as="h2"
          by="word"
          animation="blurInUp"
          duration={0.5}
          once={true}
          className="text-xs uppercase tracking-widest font-mono text-[#737373] text-center"
        >
          Platform Capabilities & Architecture
        </TextAnimate>
      </div>

      {/* Magic UI Bento Grid */}
      <BentoGrid className="auto-rows-[18rem] sm:auto-rows-[19rem]">
        {features.map((feature) => (
          <BentoCard key={feature.name} {...feature} />
        ))}
      </BentoGrid>
    </div>
  );
}
