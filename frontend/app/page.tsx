'use client';

import React, { useState, useCallback } from 'react';
import { ToastMessage } from '@/types/media';
import { useSettings } from '@/hooks/useSettings';
import { useHistory } from '@/hooks/useHistory';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { useMediaDrop } from '@/hooks/useMediaDrop';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { MediaInput } from '@/components/ui/MediaInput';
import { PlatformBadges } from '@/components/PlatformBadges';
import { OutputPanel } from '@/components/OutputPanel';
import { CapabilityCards } from '@/components/CapabilityCards';
import { BatchModal } from '@/components/BatchModal';
import { HistoryModal } from '@/components/HistoryModal';
import { SettingsModal } from '@/components/SettingsModal';
import { SupportModal } from '@/components/SupportModal';
import { ToastContainer } from '@/components/ToastContainer';
import { BottomNavigation, NavigationDestination } from '@/components/navigation/BottomNavigation';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  const { settings, updateSettings } = useSettings();
  const { history, addRecord, clearAll } = useHistory();
  const { health, isChecking: isCheckingHealth } = useBackendHealth();

  // Navigation tab state (Home, Files, Plans, Settings)
  const [activeTab, setActiveTab] = useState<NavigationDestination>('home');

  // Modals state
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Toast notification system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Main MediaDrop state hook
  const {
    state,
    url,
    metadata,
    errorMessage,
    outputType,
    selectedFormatId,
    selectedFormat,
    selectedQuality,
    trimEnabled,
    startTime,
    endTime,
    downloadProgress,
    setOutputType,
    setSelectedFormatId,
    setSelectedFormat,
    setSelectedQuality,
    setTrimEnabled,
    setStartTime,
    setEndTime,
    handleUrlSubmit,
    handleDownload,
    cancelOperation,
    reset,
  } = useMediaDrop({
    settings,
    onSuccessDownload: (record) => {
      addRecord(record);
    },
    showToast: addToast,
  });

  // Floating Navigation destination handler (Home, Files, Plans, Settings)
  const handleNavigation = (tab: NavigationDestination) => {
    setActiveTab(tab);

    if (tab === 'home') {
      const el = document.getElementById('downloader');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (tab === 'files') {
      setIsHistoryOpen(true);
    } else if (tab === 'plans') {
      const el = document.getElementById('plans');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (tab === 'settings') {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-white selection:bg-white/20 relative">
      {/* Background Refraction Grid & Ambient Geometry for Liquid Glass refraction */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* Subtle monochrome geometric grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_25%,#000_70%,transparent_100%)]" />
        {/* Ambient top light pool */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] blur-2xl" />
        {/* Ambient dock refraction aura */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.04),transparent_70%)] blur-2xl" />
      </div>

      {/* Top Application Header */}
      <Header
        health={health}
        isCheckingHealth={isCheckingHealth}
        historyCount={history.length}
        onOpenHistory={() => {
          setActiveTab('files');
          setIsHistoryOpen(true);
        }}
        onOpenSettings={() => {
          setActiveTab('settings');
          setIsSettingsOpen(true);
        }}
        onOpenBatch={() => setIsBatchOpen(true)}
      />

      {/* Main Content Area (padding-bottom reserved so floating dock never covers content) */}
      <main className="relative z-10 flex-1 flex flex-col pb-36 sm:pb-44">
        {/* Main Hero Header */}
        <Hero />

        {/* Premium URL Input (Uiverse by Praashoo7) */}
        <MediaInput
          onSubmit={handleUrlSubmit}
          isLoading={state === 'validating' || state === 'fetching'}
          state={state}
          onClear={reset}
          errorMessage={errorMessage}
        />

        {/* Supported Platform Badges */}
        <PlatformBadges />

        {/* Output & Processing Panel (integrates dexter-st loader & karthik download button) */}
        <OutputPanel
          state={state}
          metadata={metadata}
          errorMessage={errorMessage}
          outputType={outputType}
          selectedFormatId={selectedFormatId}
          selectedFormat={selectedFormat}
          selectedQuality={selectedQuality}
          trimEnabled={trimEnabled}
          startTime={startTime}
          endTime={endTime}
          downloadProgress={downloadProgress}
          onOutputTypeChange={setOutputType}
          onFormatIdChange={setSelectedFormatId}
          onFormatChange={setSelectedFormat}
          onQualityChange={setSelectedQuality}
          onTrimToggle={setTrimEnabled}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onDownload={handleDownload}
          onCancel={cancelOperation}
          onRetry={() => {
            if (url) handleUrlSubmit(url);
          }}
        />

        {/* Capability Cards / Plans Bento Grid */}
        <CapabilityCards onOpenBatch={() => setIsBatchOpen(true)} />
      </main>

      {/* Modern Multi-Column Engine Footer */}
      <Footer
        onOpenBatch={() => setIsBatchOpen(true)}
        onOpenSettings={() => {
          setActiveTab('settings');
          setIsSettingsOpen(true);
        }}
        onOpenDiagnostics={() => setIsSupportOpen(true)}
      />

      {/* Floating Pill Navigation: Home, Files, Plans, Settings (Uiverse by mymiamo) */}
      <BottomNavigation
        activeTab={activeTab}
        onNavigate={handleNavigation}
        filesCount={history.length}
      />

      {/* Centered Floating History & Files Dialog */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setActiveTab('home');
        }}
        history={history}
        onClear={() => {
          clearAll();
          addToast('info', 'Download history cleared.');
        }}
        onSelectUrl={(selectedUrl) => {
          handleUrlSubmit(selectedUrl);
        }}
      />

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveTab('home');
        }}
        settings={settings}
        onSave={(updated) => updateSettings(updated)}
        showToast={addToast}
      />

      {/* Batch Processing Dialog */}
      <BatchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        showToast={addToast}
      />

      {/* Support & Diagnostics Dialog (opened by Get in Touch pill) */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        health={health}
        showToast={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
