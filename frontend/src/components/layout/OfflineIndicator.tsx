'use client';

import { useState, useEffect } from 'react';
import { isOnline } from '@/lib/utils';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state
    setOnline(isOnline());

    const handleOnline = () => {
      setOnline(true);
      // Show "back online" briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner && online) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 ${
        online ? 'bg-[var(--color-status-success)]' : 'bg-[var(--color-status-error)]'
      } text-white rounded-lg shadow-lg p-4`}
      style={{ animation: 'slide-up 0.3s ease-out' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {online ? (
          <>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-medium">Back Online</p>
              <p className="text-sm opacity-90">Connection restored</p>
            </div>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <div>
              <p className="font-medium">You&apos;re Offline</p>
              <p className="text-sm opacity-90">
                Some features may be limited. Submissions will sync when online.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
