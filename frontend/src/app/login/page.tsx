'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Disclaimer } from '@/components/ui';
import { useAuth, getRoleDisplayName } from '@/lib/authContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [username, password]); // eslint-disable-line react-hooks/exhaustive-deps

  // If already authenticated, show logged-in state (no auto-redirect to prevent loops)
  if (isAuthenticated && user) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card variant="elevated">
            <CardContent className="text-center py-8">
              <div className="w-16 h-16 bg-[var(--color-status-success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)] mb-2">
                Signed In
              </h2>
              <p className="text-[var(--color-charcoal-600)] mb-4">
                Welcome, <strong>{user.username}</strong>
              </p>
              <div className="bg-[var(--color-cream-50)] rounded-lg p-3 mb-6">
                <p className="text-sm text-[var(--color-charcoal-500)]">Role</p>
                <p className="font-medium text-[var(--color-navy-700)]">
                  {getRoleDisplayName(user.role)}
                </p>
              </div>
              <div className="space-y-3">
                <Link href="/">
                  <Button variant="primary" className="w-full">
                    Go to Home
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={logout}
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      return;
    }

    const success = await login(username, password);
    
    if (success) {
      // Successfully logged in - user can navigate manually
      // No auto-redirect to prevent loops
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-navy-700)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-2">Sign In</h1>
          <p className="text-[var(--color-charcoal-600)]">
            Access the Trust-First Census System
          </p>
        </div>

        {/* Login Card */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="sr-only">Login Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Username"
                type="text"
                name="username"
                autoComplete="username"
                required
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />

              <Input
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              {error && (
                <Disclaimer variant="warning">
                  {error}
                </Disclaimer>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                disabled={!username.trim() || !password.trim()}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--color-cream-200)]">
              <div className="bg-[var(--color-cream-50)] rounded-lg p-4 text-left">
                <h4 className="font-semibold text-[var(--color-navy-700)] text-sm mb-2">
                  How do I get access?
                </h4>
                <p className="text-sm text-[var(--color-charcoal-600)] mb-2">
                  This system does not allow self-registration. User accounts are 
                  provisioned by authorized administrators with specific roles:
                </p>
                <ul className="text-xs text-[var(--color-charcoal-500)] space-y-1 mb-3">
                  <li>• <strong>Enumerator</strong> — Field data collection</li>
                  <li>• <strong>Supervisor</strong> — Oversight and consent verification</li>
                  <li>• <strong>State Analyst</strong> — View state-level aggregates</li>
                  <li>• <strong>Central Policy Viewer</strong> — View national aggregates</li>
                </ul>
                <p className="text-sm text-[var(--color-charcoal-600)]">
                  Contact your designated administrator to request access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <div className="mt-6">
          <Disclaimer variant="info" title="Demo Environment">
            <p className="mb-2">
              This is a demonstration system. For testing, use these credentials:
            </p>
            <div className="font-mono text-xs bg-white/50 rounded p-2 space-y-1">
              <p><strong>Enumerator:</strong> test_enumerator / TestPass123!</p>
              <p><strong>Analyst:</strong> test_analyst / TestPass123!</p>
            </div>
          </Disclaimer>
        </div>

        {/* Security Notice */}
        <div className="mt-4">
          <Disclaimer variant="privacy" title="Security Notice">
            <p>
              All login attempts are audited. Your session will end when you 
              close the browser or refresh the page. This is intentional for security.
            </p>
          </Disclaimer>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[var(--color-navy-600)] hover:text-[var(--color-navy-800)]">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
