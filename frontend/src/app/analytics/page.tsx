/**
 * Analytics Router Page
 * 
 * Routes users to appropriate analytics page based on role.
 * 
 * CENTRAL_POLICY_VIEWER → /analytics/national
 * STATE_ANALYST → /analytics/state
 * Others → Access denied
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Card, CardContent } from '@/components/ui';

export default function AnalyticsRouterPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Route based on role
    if (user?.role === 'CENTRAL_POLICY_VIEWER') {
      router.push('/analytics/national');
    } else if (user?.role === 'STATE_ANALYST') {
      router.push('/analytics/state');
    }
    // If neither role, stay on this page to show access denied
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[var(--color-navy-200)] border-t-[var(--color-navy-600)] rounded-full animate-spin" />
          <p className="mt-4 text-[var(--color-charcoal-600)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  // Access denied for roles without analytics access
  return (
    <div className="py-12 md:py-20">
      <div className="container-narrow">
        <Card variant="elevated" className="max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <div className="w-16 h-16 bg-[var(--color-status-warning)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)] mb-4">
              Analytics Access Not Available
            </h2>
            <p className="text-[var(--color-charcoal-600)] mb-6">
              Your role ({user?.role}) does not have access to analytics features.
              Analytics are available only to Central Policy Viewer and State Analyst roles.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-[var(--color-navy-600)] text-white rounded-lg hover:bg-[var(--color-navy-700)] transition-colors"
            >
              Go Home
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
