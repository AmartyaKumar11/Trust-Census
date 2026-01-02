import { Card, CardContent, Button } from '@/components/ui';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <Card variant="elevated" className="max-w-md w-full text-center">
        <CardContent className="py-12">
          <div className="w-20 h-20 bg-[var(--color-status-warning)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg 
              className="w-10 h-10 text-[var(--color-status-warning)]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-4">You&apos;re Offline</h1>
          
          <p className="text-[var(--color-charcoal-600)] mb-8">
            It looks like you&apos;ve lost your internet connection. 
            Some features may be limited while offline.
          </p>

          <div className="bg-[var(--color-cream-50)] rounded-lg p-4 mb-8 text-left">
            <h3 className="font-semibold text-[var(--color-navy-800)] mb-2">Available Offline:</h3>
            <ul className="space-y-2 text-sm text-[var(--color-charcoal-600)]">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                View cached pages
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Draft submissions (will sync when online)
              </li>
            </ul>
          </div>

          <div className="bg-[var(--color-status-warning)]/5 border border-[var(--color-status-warning)]/20 rounded-lg p-4 mb-8 text-left">
            <h3 className="font-semibold text-[var(--color-status-warning)] mb-2">Unavailable Offline:</h3>
            <ul className="space-y-2 text-sm text-[var(--color-charcoal-600)]">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Login and authentication
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Analytics dashboard
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Real-time submission
              </li>
            </ul>
          </div>

          <Link href="/">
            <Button variant="primary">
              Try Again
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
