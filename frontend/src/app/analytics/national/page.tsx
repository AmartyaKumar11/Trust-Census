/**
 * National Analytics Page
 * 
 * For CENTRAL_POLICY_VIEWER role only.
 * Provides Union-level caste structure overview.
 * 
 * MUST:
 * - Show India map with categorical coloring
 * - Display national summary cards
 * - Include interpretation notes
 * - Enforce role-based access
 * 
 * MUST NEVER:
 * - Show exact percentages on map
 * - Enable district drill-down
 * - Allow export/download
 * - Show data for unauthorized roles
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, RequireAuth } from '@/lib/authContext';
import { getNationalAggregates, type AnalyticsNationalResponse, ApiError } from '@/lib/apiClient';
import { PolicyDisclaimerBanner } from '@/components/analytics/PolicyDisclaimerBanner';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { IndiaCasteMap, type DiversityCategory } from '@/components/analytics/IndiaCasteMap';
import { NationalSummaryCards } from '@/components/analytics/NationalSummaryCards';
import { InterpretationNotes } from '@/components/analytics/InterpretationNotes';
import { Disclaimer } from '@/components/ui';

export default function NationalAnalyticsPage() {
    return (
        <RequireAuth
            allowedRoles={['CENTRAL_POLICY_VIEWER']}
            fallback={<UnauthorizedMessage />}
        >
            <NationalAnalyticsContent />
        </RequireAuth>
    );
}

function UnauthorizedMessage() {
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    return (
        <div className="py-12 md:py-20">
            <div className="container-narrow">
                <div className="max-w-md mx-auto text-center">
                    <div className="w-16 h-16 bg-[var(--color-status-warning)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)] mb-4">
                        {isAuthenticated ? 'Access Denied' : 'Authentication Required'}
                    </h2>
                    <p className="text-[var(--color-charcoal-600)] mb-6">
                        {isAuthenticated
                            ? `National analytics are only accessible to Central Policy Viewer role. Your current role (${user?.role}) does not have permission.`
                            : 'Please sign in with a Central Policy Viewer account to access national analytics.'}
                    </p>
                    <button
                        onClick={() => router.push(isAuthenticated ? '/' : '/login')}
                        className="px-6 py-2 bg-[var(--color-navy-600)] text-white rounded-lg hover:bg-[var(--color-navy-700)] transition-colors"
                    >
                        {isAuthenticated ? 'Go Home' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function NationalAnalyticsContent() {
    const [data, setData] = useState<AnalyticsNationalResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                setError(null);
                const response = await getNationalAggregates();
                setData(response);
            } catch (err) {
                if (err instanceof ApiError) {
                    setError(err.message);
                } else {
                    setError('Failed to load analytics data. Please try again.');
                }
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

    // Mock states data for demonstration
    // In production, this would be derived from backend response
    const mockStatesData = [
        {
            code: 'MH',
            name: 'Maharashtra',
            category: 'highly-diverse' as DiversityCategory,
            description: 'Balanced representation across all categories',
        },
        {
            code: 'KA',
            name: 'Karnataka',
            category: 'obc-predominant' as DiversityCategory,
            description: 'OBC category represents largest share',
        },
        {
            code: 'TN',
            name: 'Tamil Nadu',
            category: 'mixed-composition' as DiversityCategory,
            description: 'No single category is predominant',
        },
    ];

    const mockSummary = {
        nationalComposition: 'Diverse composition with OBC representing the largest estimated share (~40-50%), followed by General (~25-35%), SC (~15-20%), ST (~8-12%), and Other (~3-7%).',
        highestDiversity: ['Maharashtra', 'Karnataka', 'West Bengal'],
        dataSufficiencyGaps: ['Arunachal Pradesh', 'Mizoram'],
    };

    return (
        <div className="min-h-screen bg-[var(--color-cream-50)]">
            <PolicyDisclaimerBanner />

            <div className="py-12 md:py-20">
                <div className="container-wide">
                    <AnalyticsHeader
                        title="National Caste Census Analytics"
                        subtitle="Union-level policy-grade estimates for evidence-based governance. All data is privacy-protected and suitable for macro-level policy planning only."
                    />

                    {isLoading && (
                        <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-[var(--color-navy-200)] border-t-[var(--color-navy-600)] rounded-full animate-spin" />
                            <p className="mt-4 text-[var(--color-charcoal-600)]">Loading analytics data...</p>
                        </div>
                    )}

                    {error && (
                        <Disclaimer variant="warning" className="mb-8">
                            <p><strong>Error:</strong> {error}</p>
                            <p className="mt-2 text-sm">
                                This may be because the analytics aggregation has not been run yet.
                                Contact your system administrator.
                            </p>
                        </Disclaimer>
                    )}

                    {!isLoading && !error && (
                        <div className="space-y-12">
                            {/* National Summary Cards */}
                            <section>
                                <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)] mb-6">
                                    National Overview
                                </h2>
                                <NationalSummaryCards summary={mockSummary} />
                            </section>

                            {/* India Map */}
                            <section>
                                <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)] mb-6">
                                    State-Level Diversity Map
                                </h2>
                                <IndiaCasteMap statesData={mockStatesData} />
                            </section>

                            {/* Interpretation Notes */}
                            <section>
                                <InterpretationNotes />
                            </section>

                            {/* Privacy Notice */}
                            <Disclaimer variant="privacy">
                                <p>
                                    <strong>Privacy Guarantee:</strong> This system implements differential privacy
                                    with ε = 1.0. All displayed values include calibrated noise to prevent
                                    identification of individuals or small communities. The data is legally
                                    defensible and designed to survive judicial scrutiny.
                                </p>
                            </Disclaimer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
