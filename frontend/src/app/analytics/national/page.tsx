'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, RequireAuth } from '@/lib/authContext';
import { getStateAggregates, type AnalyticsStateResponse, ApiError } from '@/lib/apiClient';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { PolicyDisclaimerBanner } from '@/components/analytics/PolicyDisclaimerBanner';
import { Disclaimer } from '@/components/ui';

// New Components
import { NationalPolicyContextBanner } from '@/components/analytics/national/NationalPolicyContextBanner';
import { IndiaCasteCompositionMap } from '@/components/analytics/national/IndiaCasteCompositionMap';
import { StatePolicySnapshotPanel } from '@/components/analytics/national/StatePolicySnapshotPanel';
import { NationalPatternsPanel } from '@/components/analytics/national/NationalPatternsPanel';
import { DataCoverageNotice } from '@/components/analytics/national/DataCoverageNotice';

// Logic
import { classifyState, type PolicyCategory } from '@/lib/stateCategories';

// List of supported states for the prototype.
// In a real system, this might come from a metadata API or be exhaustive.
const SUPPORTED_STATES = [
    { code: 'MH', name: 'Maharashtra' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'WB', name: 'West Bengal' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'TG', name: 'Telangana' },
    { code: 'DL', name: 'Delhi' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'PB', name: 'Punjab' },
    { code: 'HR', name: 'Haryana' },
    { code: 'OD', name: 'Odisha' },
    { code: 'BR', name: 'Bihar' },
    // Add more as needed
];

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
    return (
        <div className="py-12 md:py-20 text-center">
            <h2 className="text-xl font-bold text-[var(--color-navy-800)]">Access Denied</h2>
            <p className="text-[var(--color-charcoal-600)]">Only Central Policy Viewers can access this page.</p>
        </div>
    );
}

function NationalAnalyticsContent() {
    const { user } = useAuth();

    // State
    const [stateCategories, setStateCategories] = useState<Record<string, PolicyCategory>>({});
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [loadingStates, setLoadingStates] = useState<string[]>([]);
    const [loadedCount, setLoadedCount] = useState(0);
    const [errors, setErrors] = useState<string[]>([]);

    // Use an effect to SEQUENTIALLY fetch state data for all supported states.
    // This respects the "Rate-limited/Sequential" mandate.
    useEffect(() => {
        let isMounted = true;

        const fetchAllStates = async () => {
            // Hardcoded map of API State Codes to Map State Names (TopoJSON keys)
            const nameMap: Record<string, string> = {
                'MH': 'Maharashtra',
                'KA': 'Karnataka',
                'TN': 'Tamil Nadu',
                'UP': 'Uttar Pradesh',
                'WB': 'West Bengal',
                'GJ': 'Gujarat',
                'RJ': 'Rajasthan',
                'AP': 'Andhra Pradesh',
                'TG': 'Telangana',
                'DL': 'Delhi', // Map often uses Delhi or NCT of Delhi. 'Delhi' is usually safe in simpler maps.
                'MP': 'Madhya Pradesh',
                'PB': 'Punjab',
                'HR': 'Haryana',
                'OD': 'Odisha',
                'BR': 'Bihar'
            };

            for (const state of SUPPORTED_STATES) {
                if (!isMounted) break;

                setLoadingStates(prev => [...prev, state.code]);

                try {
                    // National policy view derived from state-level policy aggregates.
                    // This is not a raw national enumeration.
                    const response = await getStateAggregates(state.code);

                    if (isMounted && response.aggregates) {
                        const category = classifyState(response.aggregates);
                        const mapName = nameMap[state.code] || state.name;

                        setStateCategories(prev => ({
                            ...prev,
                            [mapName]: category
                        }));
                    }
                } catch (err) {
                    // Mark failure as Insufficient
                    if (isMounted) {
                        const mapName = nameMap[state.code] || state.name;
                        setStateCategories(prev => ({
                            ...prev,
                            [mapName]: 'INSUFFICIENT_DATA'
                        }));
                        // console.warn(`Failed to fetch ${state.code}`, err);
                    }
                } finally {
                    if (isMounted) {
                        setLoadedCount(prev => prev + 1);
                        setLoadingStates(prev => prev.filter(c => c !== state.code));
                    }
                }

                // Small delay to be polite to backend (simulating sequential processing)
                await new Promise(r => setTimeout(r, 50));
            }
        };

        fetchAllStates();

        return () => { isMounted = false; };
    }, []); // Run once on mount

    // Compute Derived Summaries
    const patternCounts = useMemo(() => {
        const counts: Record<PolicyCategory, number> = {
            'OBC_PREDOMINANT': 0,
            'SC_ST_PREDOMINANT': 0,
            'MIXED_COMPOSITION': 0,
            'HIGHLY_DIVERSE': 0,
            'INSUFFICIENT_DATA': 0
        };

        Object.values(stateCategories).forEach(cat => {
            if (counts[cat] !== undefined) counts[cat]++;
        });

        return counts;
    }, [stateCategories]);

    const insufficientList = useMemo(() => {
        return Object.entries(stateCategories)
            .filter(([_, cat]) => cat === 'INSUFFICIENT_DATA')
            .map(([name]) => name);
    }, [stateCategories]);


    return (
        <div className="min-h-screen bg-[var(--color-cream-50)] pb-20">
            <PolicyDisclaimerBanner />
            <AnalyticsHeader
                title="National Policy Patterns"
                subtitle="Macro-level categorical analysis of caste composition across states"
            />

            <main className="container mx-auto px-4 md:px-6 space-y-8 -mt-6 relative z-10">

                {/* Section 1: Context Banner */}
                <NationalPolicyContextBanner />

                {/* Main Interactive Area: Map + Snapshot */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Section 2: Map (Columns 1-7) */}
                    <div className="lg:col-span-7 h-full min-h-[500px]">
                        <div className="bg-white rounded-xl border border-[var(--color-navy-100)] p-1 h-full shadow-sm">
                            <div className="mb-2 px-4 pt-4 flex justify-between items-center">
                                <h3 className="font-serif font-bold text-[var(--color-navy-900)]">National Categorical Map</h3>
                                {loadedCount < SUPPORTED_STATES.length && (
                                    <span className="text-xs font-mono text-[var(--color-charcoal-500)] animate-pulse">
                                        Synthesizing... {loadedCount}/{SUPPORTED_STATES.length}
                                    </span>
                                )}
                            </div>

                            <IndiaCasteCompositionMap
                                stateCategories={stateCategories}
                                selectedState={selectedState}
                                onStateClick={setSelectedState}
                            />
                        </div>
                    </div>

                    {/* Section 3: Snapshot Panel (Columns 8-12) */}
                    <div className="lg:col-span-5 h-full min-h-[500px]">
                        <StatePolicySnapshotPanel
                            stateName={selectedState}
                            category={selectedState ? stateCategories[selectedState] : null}
                        />
                    </div>
                </div>

                {/* Section 4: Patterns Summary */}
                <div>
                    <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-4 px-1">
                        National Pattern Summary
                    </h3>
                    <NationalPatternsPanel counts={patternCounts} />
                </div>

                {/* Section 5: Data Coverage */}
                <DataCoverageNotice insufficientStates={insufficientList} />

                <div className="mt-12 text-center pb-8">
                    <Disclaimer variant="privacy" />
                </div>

            </main>
        </div>
    );
}
