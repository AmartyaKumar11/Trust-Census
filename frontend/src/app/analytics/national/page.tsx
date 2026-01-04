'use client';

import { useState, useEffect } from 'react';
import { RequireAuth } from '@/lib/authContext';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsNavigation } from '@/components/analytics/AnalyticsNavigation';
import { PolicyDisclaimerBanner } from '@/components/analytics/PolicyDisclaimerBanner';
import { Disclaimer } from '@/components/ui';

// New Policy Analytics Components
import { NationalPolicyOverview } from '@/components/analytics/national/NationalPolicyOverview';
import { IndiaPoliticalMap } from '@/components/analytics/national/IndiaPoliticalMap';
import { IndiaCasteCompositionMap } from '@/components/analytics/national/IndiaCasteCompositionMap'; // Restored
import { StatePolicySnapshot } from '@/components/analytics/national/StatePolicySnapshot';
import { NationalPatternsSummary } from '@/components/analytics/national/NationalPatternsSummary';
import { DataCoverageNotice } from '@/components/analytics/national/DataCoverageNotice';
import { PolicyCategory } from '@/lib/stateCategories';

// Policy Data Loader
import {
    loadPolicyAnalytics,
    type PolicyAnalytics,
    type StatePolicy,
    getNationalPolicySummary,
    getDataCoverageSummary
} from '@/lib/policyData';

export default function NationalAnalyticsPage() {
    return (
        <RequireAuth
            allowedRoles={['CENTRAL_POLICY_VIEWER', 'STATE_ANALYST']}
            fallback={<UnauthorizedMessage />}
        >
            <NationalAnalyticsContent />
        </RequireAuth>
    );
}

function UnauthorizedMessage() {
    return (
        <div className="py-12 md:py-20 text-center">
            <h2 className="text-xl font-bold text-[var(--color-navy-800)]">Access Denied</h2>
            <p className="text-[var(--color-charcoal-600)]">
                Only Central Policy Viewers and State Analysts can access national policy analytics.
            </p>
        </div>
    );
}

function NationalAnalyticsContent() {
    // State management for policy analytics
    const [policyData, setPolicyData] = useState<PolicyAnalytics | null>(null);
    const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'caste' | 'urbanisation'>('caste'); // Default to Caste Map



    // State for live categories
    const [liveCategories, setLiveCategories] = useState<Record<string, PolicyCategory>>({});

    // Fetch live data from backend
    useEffect(() => {
        async function fetchLiveData() {
            try {
                // Import dynamically to avoid SSR issues if needed, or just standard import
                const { getAllStateAggregates } = await import('@/lib/apiClient');
                const { classifyState } = await import('@/lib/stateCategories');

                const liveData = await getAllStateAggregates();

                const newCategories: Record<string, PolicyCategory> = {};

                liveData.forEach(stateData => {
                    // Convert API aggregates to format expected by classifyState
                    const composition = stateData.aggregates.map(agg => ({
                        category: agg.category,
                        populationEstimate: agg.populationEstimate
                    }));

                    const category = classifyState(composition);
                    newCategories[stateData.stateName] = category;
                });

                setLiveCategories(newCategories);
            } catch (err) {
                console.error('Failed to fetch live policy data:', err);
                // Fallback to static data is handled by derivedStateCategories logic below
            }
        }

        fetchLiveData();
    }, []);

    // Merge: Live data takes precedence over static policyData
    const derivedStateCategories = (() => {
        const map: Record<string, PolicyCategory> = {};

        // 1. Start with static data
        if (policyData) {
            Object.values(policyData.states).forEach(state => {
                if (state.caste_category) {
                    map[state.state_name] = state.caste_category as PolicyCategory;
                }
            });
        }

        // 2. Override with live data (if available)
        // This ensures the map reflects the "colour coding logic" from the DB
        Object.entries(liveCategories).forEach(([name, category]) => {
            map[name] = category;
        });

        return map;
    })();

    // Load policy analytics on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const data = await loadPolicyAnalytics();
                setPolicyData(data);
                setError(null);
            } catch (err) {
                console.error('Failed to load policy analytics:', err);
                setError('Unable to load national policy analytics. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Handle state selection from map
    const handleStateSelect = (stateCode: string) => {
        setSelectedStateCode(stateCode);
    };

    // Get selected state data
    const selectedState: StatePolicy | null =
        policyData && selectedStateCode
            ? policyData.states[selectedStateCode] || null
            : null;

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-cream-50)] pb-20">
                <PolicyDisclaimerBanner />
                <AnalyticsHeader
                    title="National Policy Analytics"
                    subtitle="Loading urbanisation and demographic policy insights..."
                />
                <div className="container mx-auto px-4 md:px-6 py-12 text-center">
                    <div className="animate-pulse text-[var(--color-charcoal-600)]">
                        Loading policy analytics...
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !policyData) {
        return (
            <div className="min-h-screen bg-[var(--color-cream-50)] pb-20">
                <PolicyDisclaimerBanner />
                <AnalyticsHeader
                    title="National Policy Analytics"
                    subtitle="Error loading policy data"
                />
                <div className="container mx-auto px-4 md:px-6 py-12 text-center">
                    <div className="text-[var(--color-error-600)]">
                        {error || 'Unable to load policy analytics'}
                    </div>
                </div>
            </div>
        );
    }

    // Get summary data
    const nationalSummary = getNationalPolicySummary(policyData);
    const coverageSummary = getDataCoverageSummary(policyData);

    return (
        <div className="min-h-screen bg-[var(--color-cream-50)] pb-20">
            <PolicyDisclaimerBanner />
            <AnalyticsHeader
                title="National Policy Analytics"
                subtitle="Urbanisation & Demographic Policy Insights for India"
            />

            <main className="container mx-auto px-4 md:px-6 space-y-8 -mt-6 relative z-10">

                {/* Analytics Navigation - Direct Test */}


                {/* Analytics Navigation */}
                <AnalyticsNavigation />

                {/* Section 1: National Policy Overview */}
                <NationalPolicyOverview
                    summary={nationalSummary}
                    coverage={coverageSummary}
                    metadata={policyData.metadata}
                />

                {/* Section 2: Interactive Map and State Snapshot */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Political Map (Columns 1-7) */}
                    <div className="lg:col-span-7 h-full min-h-[600px]">
                        <div className="bg-white rounded-xl border border-[var(--color-navy-100)] p-6 h-full shadow-sm">
                            <div className="mb-4 flex justify-between items-start">
                                <div>
                                    <h3 className="font-serif font-bold text-lg text-[var(--color-navy-900)]">
                                        {viewMode === 'caste' ? 'India - Composition Patterns' : 'India - Urbanisation Categories'}
                                    </h3>
                                    <p className="text-sm text-[var(--color-charcoal-600)] mt-1">
                                        Click on any state to view policy insights
                                    </p>
                                </div>

                                {/* View Toggle */}
                                <div className="flex bg-[var(--color-navy-50)] p-1 rounded-lg border border-[var(--color-navy-100)]">
                                    <button
                                        onClick={() => setViewMode('caste')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'caste'
                                            ? 'bg-white text-[var(--color-navy-800)] shadow-sm'
                                            : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-navy-800)]'
                                            }`}
                                    >
                                        Composition
                                    </button>
                                    <button
                                        onClick={() => setViewMode('urbanisation')}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'urbanisation'
                                            ? 'bg-white text-[var(--color-navy-800)] shadow-sm'
                                            : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-navy-800)]'
                                            }`}
                                    >
                                        Urbanisation
                                    </button>
                                </div>
                            </div>

                            {viewMode === 'caste' ? (
                                <IndiaCasteCompositionMap
                                    stateCategories={derivedStateCategories}
                                    selectedState={selectedState?.state_name || null}
                                    onStateClick={(stateName: string) => {
                                        // Reverse lookup state code from name to maintain compatibility
                                        const entries = Object.entries(policyData.states);
                                        const found = entries.find(([_, s]) =>
                                            s.state_name.toLowerCase() === stateName.toLowerCase()
                                        );
                                        if (found) handleStateSelect(found[0]);
                                    }}
                                />
                            ) : (
                                <IndiaPoliticalMap
                                    policyData={policyData}
                                    selectedStateCode={selectedStateCode}
                                    onStateSelect={handleStateSelect}
                                />
                            )}
                        </div>
                    </div>

                    {/* State Policy Snapshot (Columns 8-12) */}
                    <div className="lg:col-span-5 h-full min-h-[600px]">
                        <StatePolicySnapshot
                            stateData={selectedState}
                            stateCode={selectedStateCode}
                        />
                    </div>
                </div>

                {/* Section 3: National Patterns Summary */}
                <NationalPatternsSummary
                    patterns={policyData.national_patterns}
                    statesData={policyData.states}
                />

                {/* Section 4: Data Coverage Notice */}
                <DataCoverageNotice
                    dataGaps={policyData.national_patterns.data_gaps_states}
                    coverage={coverageSummary}
                />

                {/* Privacy Disclaimer */}
                <div className="mt-12 text-center pb-8">
                    <Disclaimer variant="privacy" />
                </div>

            </main>
        </div>
    );
}
