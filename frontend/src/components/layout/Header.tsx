'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useAuth, getRoleDisplayName, type UserRole } from '@/lib/authContext';

/** Navigation items with role-based visibility */
interface NavItem {
  name: string;
  href: string;
  /** If specified, only show for these roles. If empty/undefined, show for all. */
  allowedRoles?: UserRole[];
  /** If true, only show when authenticated */
  requiresAuth?: boolean;
  /** If true, only show when NOT authenticated */
  hideWhenAuth?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/' },
  { name: 'Principles', href: '/principles' },
  { name: 'Architecture', href: '/architecture' },
  { 
    name: 'Submit', 
    href: '/submit', 
    requiresAuth: true,
    allowedRoles: ['ENUMERATOR', 'SUPERVISOR'],
  },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    requiresAuth: true,
    allowedRoles: ['STATE_ANALYST', 'CENTRAL_POLICY_VIEWER'],
  },
  { 
    name: 'System Status', 
    href: '/system-status',
  },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, logout, hasRole } = useAuth();

  /** Filter navigation items based on auth state and role */
  const visibleNavItems = navigation.filter((item) => {
    // Hide items that require auth when not authenticated
    if (item.requiresAuth && !isAuthenticated) return false;
    
    // Hide items that should be hidden when authenticated
    if (item.hideWhenAuth && isAuthenticated) return false;
    
    // Check role-based visibility
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!isAuthenticated) return false;
      if (!hasRole(...item.allowedRoles)) return false;
    }
    
    return true;
  });

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--color-cream-200)]">
      <nav className="container-wide" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 text-[var(--color-navy-900)] hover:text-[var(--color-navy-700)] transition-colors"
          >
            <div className="w-10 h-10 bg-[var(--color-navy-700)] rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
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
            <div className="hidden sm:block">
              <span className="font-serif font-bold text-lg">Trust Census</span>
              <span className="block text-xs text-[var(--color-charcoal-500)]">
                Privacy-First Data Collection
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'text-[var(--color-navy-700)]'
                      : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-navy-600)]'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            
            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  {/* User Info */}
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--color-navy-800)]">
                      {user.username}
                    </p>
                    <p className="text-xs text-[var(--color-charcoal-500)]">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                  {/* Sign Out Button */}
                  <Button variant="ghost" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-[var(--color-charcoal-600)] hover:text-[var(--color-navy-700)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">
              {mobileMenuOpen ? 'Close menu' : 'Open menu'}
            </span>
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden py-4 border-t border-[var(--color-cream-200)]"
            style={{ animation: 'fade-in 0.3s ease-in-out' }}
          >
            {/* User Info (if authenticated) */}
            {isAuthenticated && user && (
              <div className="px-4 py-3 mb-2 bg-[var(--color-cream-50)] rounded-lg">
                <p className="text-sm font-medium text-[var(--color-navy-800)]">
                  {user.username}
                </p>
                <p className="text-xs text-[var(--color-charcoal-500)]">
                  {getRoleDisplayName(user.role)}
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-base font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-[var(--color-cream-100)] text-[var(--color-navy-700)]'
                      : 'text-[var(--color-charcoal-600)] hover:bg-[var(--color-cream-50)] hover:text-[var(--color-navy-600)]'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Auth Actions */}
              <div className="pt-4 mt-2 border-t border-[var(--color-cream-200)]">
                {isAuthenticated ? (
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
