'use client';

import React from 'react';
import { ToastMessage } from '@/types/media';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClass = 'border-[#292929]';
        let bgClass = 'bg-[#111111]';
        let iconClass = 'text-[#A3A3A3]';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderClass = 'border-white/40';
          iconClass = 'text-white';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          borderClass = 'border-[#EF4444]/60';
          iconClass = 'text-[#EF4444]';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-[#737373]';
          iconClass = 'text-white';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borderClass} ${bgClass} shadow-card text-sm text-white transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
            <div className="flex-1 text-xs sm:text-sm leading-snug">{toast.message}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#737373] hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
