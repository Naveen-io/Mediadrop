'use client';

import React from 'react';
import { Home, Folder, Layers, Settings } from 'lucide-react';
import { GlassNav } from '@zakisheriff/liquid-glass';

export type NavigationDestination = 'home' | 'files' | 'plans' | 'settings';

interface BottomNavigationProps {
  activeTab: NavigationDestination;
  onNavigate: (tab: NavigationDestination) => void;
  filesCount?: number;
}

const DESTINATIONS: NavigationDestination[] = ['home', 'files', 'plans', 'settings'];

export function BottomNavigation({
  activeTab,
  onNavigate,
  filesCount = 0,
}: BottomNavigationProps) {
  const activeIndex = Math.max(0, DESTINATIONS.indexOf(activeTab));

  const items = [
    {
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: 'Files',
      icon: (
        <div className="relative flex items-center justify-center">
          <Folder className="w-5 h-5" />
          {filesCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 text-[9px] font-mono px-1 py-0.2 rounded-full font-bold bg-white text-black leading-none">
              {filesCount}
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'Plans',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-none"
      role="navigation"
      aria-label="Floating Glass Navigation"
      style={{
        bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="pointer-events-auto shadow-pill">
        <GlassNav
          items={items}
          activeIndex={activeIndex}
          onChange={(index) => {
            const dest = DESTINATIONS[index];
            if (dest) onNavigate(dest);
          }}
          intensity={5}
          showLabels={true}
          aria-label="MediaDrop Navigation Dock"
        />
      </div>
    </nav>
  );
}
