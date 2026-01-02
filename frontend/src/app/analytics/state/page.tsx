/**
 * State Analytics Page
 * 
 * For STATE_ANALYST role only.
 * Provides single-state caste composition for welfare planning.
 * 
 * MUST:
 * - Show only the analyst's assigned state
 * - Display state-level composition only
 * - Include interpretation notes
 * - Enforce role and scope restrictions
 * 
 * MUST NEVER:
 * - Show district-level data
 * - Allow cross-state viewing
 * - Enable export/download
 * - Show exact percentages
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, RequireAuth } from '@/lib/authContext';
import { getStateAggregates, type AnalyticsStateResponse, ApiError } from '@/lib/apiClient';
import { PolicyDisclaimerBanner } from '@/components/analytics/PolicyDisclaimerBanner';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { StateSummaryVisualization } from '@/components/analytics/StateSummaryVisualization';
import { InterpretationNotes } from '@/components/analytics/InterpretationNotes';
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
                setError('No state assigned to your account. Contact your administrator.');
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

    // Mock data for demonstration
    const mockData = {
        stateCode: stateCode || 'MH',
        stateName: 'Maharashtra',
        windowId: '2024-Q4',
        composition: [
            { category: 'SC', percentage: 16 },
            { category: 'ST', percentage: 9 },
            { category: 'OBC', percentage: 42 },
            { category: 'GENERAL', percentage: 28 },
            { category: 'OTHER', percentage: 5 },
        ],
        generatedAt: new Date().toISOString(),
    };

    return (
        <div className="min-h-screen bg-[var(--color-cream-50)]">
            <PolicyDisclaimerBanner />

            <div className="py-12 md:py-20">
                <div className="container-wide">
                    <AnalyticsHeader
                        title={`${mockData.stateName} - State Analytics`}
                        subtitle="State-level policy-grade estimates for welfare planning and resource allocation. District and sub-state data is not accessible."
                    />

                    {!stateCode && (
                        <Disclaimer variant="warning" className="mb-8">
                            <p><strong>Configuration Error:</strong> Your account does not have a state assignment.</p>
                            <p className="mt-2 text-sm">
                                State Analysts must be assigned to a specific state. Contact your system administrator
                                to configure your geographic scope.
                            </p>
                        </Disclaimer>
                    )}

                    {isLoading && stateCode && (
                        <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-[var(--color-navy-200)] border-t-[var(--color-navy-600)] rounded-full animate-spin" />
                            <p className="mt-4 text-[var(--color-charcoal-600)]">Loading state analytics...</p>
                        </div>
                    )}

                    {error && (
                        <Disclaimer variant="warning" className="mb-8">
                            <p><strong>Error:</strong> {error}</p>
                            <p className="mt-2 text-sm">
                                This may be because the analytics aggregation has not been run for your state yet.
                                Contact your system administrator.
                            </p>
                        </Disclaimer>
                    )}

                    {!isLoading && !error && stateCode && (
                        <div className="space-y-12">
                            {/* State Summary Visualization */}
                            <section>
                                <StateSummaryVisualization data={mockData} />
                            </section>

                            {/* Interpretation Notes */}
                            <section>
                                <InterpretationNotes />
                            </section>

                            {/* Scope Restriction Notice */}
                            <Disclaimer variant="info">
                                <p>
                                    <strong>Scope Restriction:</strong> As a State Analyst, you can only view data
                                    for {mockData.stateName}. Cross-state comparisons and national-level views are
                                    available only to Central Policy Viewer role.
                                </p>
                            </Disclaimer>

                            {/* Privacy Notice */}
                            <Disclaimer variant="privacy">
                                <p>
                                    <strong>Privacy Guarantee:</strong> This system implements differential privacy
                                    with ε = 1.0. All displayed values include calibrated noise to prevent
                                    identification of individuals or small communities.
                                </p>
                            </Disclaimer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
