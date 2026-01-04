/**
 * Analytics Navigation
 * Trust Census System - Analytics Page Navigation
 * 
 * RESPONSIBILITY: Provide navigation between analytics features
 * 
 * MUST:
 * - Show navigation only for authorized roles
 * - Highlight current page
 * - Enforce role-based access visually
 * 
 * MUST NEVER:
 * - Show unauthorized features
 * - Allow navigation to restricted pages
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export function AnalyticsNavigation() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Only show navigation for authorized roles
    if (!user || !['CENTRAL_POLICY_VIEWER', 'STATE_ANALYST'].includes(user.role)) {
        return null;
    }

    interface NavigationItem {
        name: string;
        href: string;
        description?: string;
        roles: string[];
        restricted?: boolean;
        label?: string;
    }

    const navigationItems: NavigationItem[] = [
        {
            name: 'National Analytics',
            href: '/analytics/national',
            description: 'Urbanisation & demographic policy insights',
            roles: ['CENTRAL_POLICY_VIEWER', 'STATE_ANALYST']
        },
        {
            name: 'Policy Simulation',
            href: '/analytics/policy-simulation',
            description: 'Categorical scenario reasoning tool',
            roles: ['CENTRAL_POLICY_VIEWER'], // Restricted to CENTRAL_POLICY_VIEWER only
            restricted: true,
            label: 'new'
        }
    ];

    // Filter items based on user role
    const availableItems = navigationItems.filter(item =>
        item.roles.includes(user.role)
    );

    // Always show navigation for CENTRAL_POLICY_VIEWER (they have access to both features)
    if (user.role !== 'CENTRAL_POLICY_VIEWER' && availableItems.length <= 1) {
        return null; // Don't show navigation if only one item available for non-CENTRAL_POLICY_VIEWER
    }

    return (
        <nav className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-[var(--color-navy-200)] shadow-sm mb-6 w-fit">
            {availableItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`
                            px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200
                            ${isActive
                                ? 'bg-[var(--color-navy-800)] text-white shadow-sm'
                                : 'text-[var(--color-navy-600)] hover:bg-[var(--color-navy-50)] hover:text-[var(--color-navy-900)]'
                            }
                        `}
                    >
                        <div className="flex items-center space-x-2">
                            <span>{item.name}</span>
                            {item.label === 'new' && !isActive && (
                                <span className="bg-[var(--color-gold-500)] text-[var(--color-navy-900)] text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    New
                                </span>
                            )}
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
}