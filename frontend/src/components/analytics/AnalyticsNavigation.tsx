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

    const navigationItems = [
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
            restricted: true
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

export function AnalyticsNavigation() {
    // Simple test - always render something for debugging
    return (
        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
            <div className="text-red-800 font-bold">
                DEBUG: AnalyticsNavigation component is rendering
            </div>
        </div>
    );
}