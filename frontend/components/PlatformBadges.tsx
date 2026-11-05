'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface PlatformMeta {
  name: string;
  note: string;
  renderIcon: (props: { className?: string }) => React.ReactNode;
}

const PLATFORMS: PlatformMeta[] = [
  {
    name: 'YouTube',
    note: 'Public videos, music & shorts',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        />
      </svg>
    ),
  },
  {
    name: 'SoundCloud',
    note: 'Public tracks & podcasts',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M11.56 8.87V17h8.89a3.55 3.55 0 0 0 3.55-3.55c0-1.78-1.31-3.25-3.03-3.51a4.99 4.99 0 0 0-9.41.93zM9.78 11.21V17h1.07v-6.38a1.6 1.6 0 0 0-1.07.59zm-1.78 1.48V17h1.07v-4.89a1.64 1.64 0 0 0-1.07.58zm-1.78 1.54V17h1.07v-3.35c-.39.12-.76.33-1.07.58zm-1.78.77V17h1.07v-2.58a1.53 1.53 0 0 0-1.07.58zm-1.77.8V17H3.7v-1.78c-.37.12-.72.33-1.03.58zM1 16.22V17h.89v-.98c-.3.09-.59.25-.89.2z"
        />
      </svg>
    ),
  },
  {
    name: 'Vimeo',
    note: 'Showcase & creator streams',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.525 3.01 7.525c-.179 0-.806.378-1.881 1.132L0 7.198c1.185-1.044 2.351-2.084 3.501-3.128 1.581-1.371 2.76-2.091 3.535-2.158 1.83-.173 2.96 1.074 3.385 3.743.456 2.852.766 4.637.935 5.352.507 2.455 1.074 3.682 1.701 3.682.49 0 1.23-.794 2.223-2.383.99-1.59 1.52-2.793 1.589-3.609.117-1.37-.394-2.056-1.532-2.056-.549 0-1.12.126-1.714.377 1.126-3.691 3.258-5.483 6.393-5.378 2.32.072 3.418 1.596 3.295 4.577z"
        />
      </svg>
    ),
  },
  {
    name: 'Twitter / X',
    note: 'Public video posts',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    note: 'Public video clips',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
        />
      </svg>
    ),
  },
  {
    name: 'Reddit',
    note: 'Public hosted videos',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.702zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z"
        />
      </svg>
    ),
  },
  {
    name: 'Twitch',
    note: 'Public clips & VOD highlights',
    renderIcon: ({ className }) => (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <path
          fill="currentColor"
          d="M2.149 0 .537 4.119v16.836h5.731V24h3.224l3.045-3.045h4.657l6.269-6.269V0H2.149zm19.164 13.612-3.582 3.582H12l-3.045 3.045v-3.045H4.119V2.149h17.194v11.463zm-3.582-7.343v6.269h-2.149V6.269h2.149zm-5.731 0v6.269h-2.149V6.269h2.149z"
        />
      </svg>
    ),
  },
];

export function PlatformBadges() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-3 mb-3 sm:mb-4">
      {/* Restrained Monochrome Platform Chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {PLATFORMS.map((platform) => (
          <div
            key={platform.name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A0A0A] border border-[#292929] hover:border-white hover:bg-[#171717] transition-all duration-200 cursor-default group shadow-subtle"
            title={`${platform.name}: ${platform.note}`}
          >
            {platform.renderIcon({
              className:
                'w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A3A3A3] group-hover:text-white transition-colors shrink-0',
            })}
            <span className="text-[11px] sm:text-xs font-medium text-[#A3A3A3] group-hover:text-white transition-colors">
              {platform.name}
            </span>
          </div>
        ))}
      </div>

      {/* Availability Notice */}
      <div className="flex items-center justify-center gap-1.5 mt-2 text-center text-[10px] sm:text-[11px] text-[#737373]">
        <Info className="w-3 h-3 shrink-0" />
        <span>
          Availability depends on public source access and platform licensing restrictions.
        </span>
      </div>
    </div>
  );
}
