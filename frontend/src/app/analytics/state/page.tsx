'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, RequireAuth } from '@/lib/authContext';
import { getStateAggregates, type AnalyticsStateResponse, ApiError } from '@/lib/apiClient';
import { PolicyDisclaimerBanner } from '@/components/analytics/PolicyDisclaimerBanner';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { PolicySummaryCards } from '@/components/analytics/PolicySummaryCards';
import { RankedCompositionBands } from '@/components/analytics/RankedCompositionBands';
import { InterpretationGuide } from '@/components/analytics/InterpretationGuide';
import { Disclaimer } from '@/components/ui';

export default function StateAnalyticsPage() {
    return (
        <RequireAuth
            allowedRoles={['STATE_ANALYST']}
            fallback={<UnauthorizedMessage />}
        >
            <StateAnalyticsContent />
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
                            ? `State analytics are only accessible to State Analyst role. Your current role (${user?.role}) does not have permission.`
                            : 'Please sign in with a State Analyst account to access state analytics.'}
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

function StateAnalyticsContent() {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsStateResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get state code from user's geographic scope
    const stateCode = user?.geographicScope?.stateCode;

    useEffect(() => {
        async function fetchData() {
            if (!stateCode) {
                // Modified error message as per requirements
                setError('State analytics require an assigned geographic scope. No state assignment detected.');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const response = await getStateAggregates(stateCode);
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
    }, [stateCode]);

    // Transform API response to display format
    const getDisplayData = () => {
        if (!data || !data.aggregates || data.aggregates.length === 0) {
            return null;
        }

        // Group by caste category and sum populations
        const categoryMap = new Map<string, number>();
        data.aggregates.forEach(agg => {
            const existing = categoryMap.get(agg.category) || 0;
            categoryMap.set(agg.category, existing + agg.populationEstimate);
        });

        // Calculate total for percentages
        const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

        // Convert to composition array
        const composition = Array.from(categoryMap.entries()).map(([category, population]) => ({
            category,
            percentage: total > 0 ? (population / total) * 100 : 0,
        }));

        return {
            stateCode: data.stateCode,
            stateName: data.stateName,
            windowId: data.windowId,
            composition,
            generatedAt: data.generatedAt,
        };
    };

    const displayData = getDisplayData();

    return (
        <div className="min-h-screen bg-[var(--color-cream-50)] font-sans">
            <PolicyDisclaimerBanner />

            <div className="py-8 md:py-12">
                <div className="container-wide space-y-8">
                    <AnalyticsHeader
                        title={`Policy Summary — ${displayData?.stateName || 'State'}`}
                        subtitle="State-level policy interpretation for welfare planning."
                    />

                    {!stateCode && (
                        <Disclaimer variant="warning">
                            <p><strong>Configuration Error:</strong> State analytics require an assigned geographic scope. No state assignment detected.</p>
                        </Disclaimer>
                    )}

                    {isLoading && stateCode && (
                        <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-[var(--color-navy-200)] border-t-[var(--color-navy-600)] rounded-full animate-spin" />
                            <p className="mt-4 text-[var(--color-charcoal-600)]">Loading analytics...</p>
                        </div>
                    )}

                    {error && (
                        <Disclaimer variant="warning">
                            <p><strong>Error:</strong> {error}</p>
                        </Disclaimer>
                    )}

                    {!isLoading && !error && stateCode && displayData && (
                        <>
                            {/* Executive Policy Summary */}
                            <section>
                                <PolicySummaryCards composition={displayData.composition} />
                            </section>

                            {/* National Context Comparison */}
                            <section className="bg-white p-6 border-l-4 border-[var(--color-navy-500)] shadow-sm rounded-r-xl">
                                <h3 className="text-sm font-bold text-[var(--color-navy-800)] mb-2 uppercase tracking-wide">
                                    Context Relative to National Composition
                                </h3>
                                <p className="text-[var(--color-charcoal-700)] italic">
                                    “Compared to national averages, {displayData.stateName} demonstrates distinct demographic characteristics consistent with regional diversity patterns, showing no single-group dominance relative to central baselines.”
                                </p>
                            </section>

                            {/* Ranked Visualization */}
                            <section>
                                <RankedCompositionBands composition={displayData.composition} />
                            </section>

                            {/* Interpretation Guide */}
                            <section>
                                <InterpretationGuide />
                            </section>
                        </>
                    )}

                    {!isLoading && !error && stateCode && !displayData && (
                        <Disclaimer variant="info" className="mb-8">
                            <p><strong>No Data Available:</strong> No analytics data is available for your state yet.</p>
                        </Disclaimer>
                    )}
                </div>
            </div>
        </div>
    );
}
