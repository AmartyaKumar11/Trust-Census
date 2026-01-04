'use client';

import { useState, useEffect } from 'react';
import { RequireAuth } from '@/lib/authContext';
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsNavigation } from '@/components/analytics/AnalyticsNavigation';
import { PolicyDisclaimerBanner } from '@/components/analytics/PolicyDisclaimerBanner';
import { Disclaimer } from '@/components/ui';

// Policy Simulation Components
import { PolicySimulationContextBanner } from '@/components/analytics/simulation/PolicySimulationContextBanner';
import { StateSelectionPanel } from '@/components/analytics/simulation/StateSelectionPanel';
import { CurrentStateProfile } from '@/components/analytics/simulation/CurrentStateProfile';
import { ScenarioTransitionSelector } from '@/components/analytics/simulation/ScenarioTransitionSelector';
import { PolicyImplicationPanel } from '@/components/analytics/simulation/PolicyImplicationPanel';
import { SimulationSafeguards } from '@/components/analytics/simulation/SimulationSafeguards';

// Data and Rules
import {
    loadPolicyAnalytics,
    type PolicyAnalytics,
    type StatePolicy
} from '@/lib/policyData';

export default function PolicySimulationPage() {
    return (
        <RequireAuth
            allowedRoles={['CENTRAL_POLICY_VIEWER']}
            fallback={<UnauthorizedMessage />}
        >
            <PolicySimulationContent />
        </RequireAuth>
    );
}

function UnauthorizedMessage() {
    return (
        <div className="min-h-screen bg-[var(--color-cream-50)] pb-20">
            <PolicyDisclaimerBanner />
            <AnalyticsHeader
                title="Policy Simulation"
                subtitle="Access Restricted - National Policy Planning Tool"
            />

            <main className="container mx-auto px-4 md:px-6 py-12">
                {/* 403-Style Access Denied UI */}
                <div className="max-w-2xl mx-auto text-center space-y-8">

                    {/* Access Denied Icon */}
                    <div className="w-24 h-24 bg-[var(--color-error-100)] rounded-full flex items-center justify-center mx-auto">
                        <svg
                            className="w-12 h-12 text-[var(--color-error-600)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 15v2m0 0v2m0-2h2m-2 0H10m12-6a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    {/* Access Denied Message */}
                    <div className="space-y-4">
                        <h2 className="font-serif text-2xl font-bold text-[var(--color-error-800)]">
                            Access Denied
                        </h2>
                        <p className="text-lg text-[var(--color-charcoal-700)]">
                            Policy Simulation Tool - Restricted Access
                        </p>
                    </div>

                    {/* Role Requirement Notice */}
                    <div className="bg-[var(--color-error-50)] border border-[var(--color-error-200)] rounded-lg p-6 text-left">
                        <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 bg-[var(--color-error-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-white text-sm font-bold">!</span>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-serif font-semibold text-[var(--color-error-800)]">
                                    Role Authorization Required
                                </h3>
                                <p className="text-sm text-[var(--color-error-700)] leading-relaxed">
                                    This policy simulation tool is intended exclusively for national-level
                                    policy planning and requires <strong>CENTRAL_POLICY_VIEWER</strong> role authorization.
                                </p>
                                <div className="bg-white rounded-lg p-4 border border-[var(--color-error-200)]">
                                    <div className="text-xs text-[var(--color-charcoal-600)] mb-2">Required Role:</div>
                                    <div className="font-mono text-sm font-semibold text-[var(--color-error-800)]">
                                        CENTRAL_POLICY_VIEWER
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Constitutional Context */}
                    <div className="bg-[var(--color-navy-50)] border border-[var(--color-navy-200)] rounded-lg p-6 text-left">
                        <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 bg-[var(--color-navy-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-white text-sm font-bold">⚖</span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-serif font-semibold text-[var(--color-navy-800)]">
                                    Constitutional Separation of Roles
                                </h3>
                                <p className="text-sm text-[var(--color-charcoal-700)] leading-relaxed">
                                    Access restrictions preserve constitutional separation of governance roles
                                    and prevent misuse of macro-level policy reasoning tools. This ensures
                                    appropriate use within the framework of democratic accountability and
                                    institutional responsibility.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-[var(--color-cream-100)] border border-[var(--color-charcoal-200)] rounded-lg p-4">
                        <p className="text-sm text-[var(--color-charcoal-700)]">
                            For role authorization requests, contact your system administrator or
                            the appropriate constitutional authority responsible for national policy planning access.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

interface SimulationScenario {
    [key: string]: string | undefined;
    urban?: string | undefined;
    density?: string | undefined;
    sex_ratio?: string | undefined;
}

function PolicySimulationContent() {
    // State management
    const [policyData, setPolicyData] = useState<PolicyAnalytics | null>(null);
    const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
    const [simulationScenario, setSimulationScenario] = useState<SimulationScenario>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                setError('Unable to load policy simulation data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Reset simulation when state changes
    useEffect(() => {
        setSimulationScenario({});
    }, [selectedStateCode]);

    // Handle state selection
    const handleStateSelect = (stateCode: string | null) => {
        setSelectedStateCode(stateCode);
    };

    // Handle scenario transition updates
    const handleScenarioUpdate = (dimension: string, targetCategory: string | null) => {
        setSimulationScenario(prev => ({
            ...prev,
            [dimension]: targetCategory || undefined
        }));
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
                    title="Policy Simulation"
                    subtitle="Loading categorical scenario reasoning tools..."
                />
                <div className="container mx-auto px-4 md:px-6 py-12 text-center">
                    <div className="animate-pulse text-[var(--color-charcoal-600)]">
                        Loading policy simulation environment...
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
                    title="Policy Simulation"
                    subtitle="Error loading simulation data"
                />
                <div className="container mx-auto px-4 md:px-6 py-12 text-center">
                    <div className="text-[var(--color-error-600)]">
                        {error || 'Unable to load policy simulation tools'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-cream-50)] pb-20">
            <PolicyDisclaimerBanner />
            <AnalyticsHeader
                title="Policy Simulation"
                subtitle="Categorical Scenario Reasoning for National Policy Planning"
            />

            <main className="container mx-auto px-4 md:px-6 space-y-8 -mt-6 relative z-10">

                {/* Analytics Navigation */}
                <AnalyticsNavigation />

                {/* Mandatory Access Scope Disclaimer */}
                <div className="bg-[var(--color-navy-100)] border-2 border-[var(--color-navy-300)] rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-[var(--color-navy-600)] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">⚖</span>
                        </div>
                        <div>
                            <h4 className="font-serif font-semibold text-[var(--color-navy-900)] text-sm">
                                National Policy Planning Tool - Restricted Access
                            </h4>
                            <p className="text-sm text-[var(--color-navy-800)] mt-1">
                                This policy simulation tool is intended exclusively for national-level policy planning.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 1: Context Banner */}
                <PolicySimulationContextBanner />

                {/* Section 2: State Selection */}
                <StateSelectionPanel
                    policyData={policyData}
                    selectedStateCode={selectedStateCode}
                    onStateSelect={handleStateSelect}
                />

                {/* Section 3: Current State Profile (only if state selected) */}
                {selectedState && (
                    <CurrentStateProfile
                        stateData={selectedState}
                        stateCode={selectedStateCode}
                    />
                )}

                {/* Section 4: Scenario Transition Selector (only if state selected) */}
                {selectedState && (
                    <ScenarioTransitionSelector
                        stateData={selectedState}
                        simulationScenario={simulationScenario}
                        onScenarioUpdate={handleScenarioUpdate}
                    />
                )}

                {/* Section 5: Policy Implication Panel (only if transitions selected) */}
                {selectedState && Object.keys(simulationScenario).length > 0 && (
                    <PolicyImplicationPanel
                        stateData={selectedState}
                        simulationScenario={simulationScenario}
                    />
                )}

                {/* Section 6: Safeguards & Interpretation Notice */}
                <SimulationSafeguards />

                {/* Privacy Disclaimer */}
                <div className="mt-12 text-center pb-8">
                    <Disclaimer variant="privacy" />
                </div>

            </main>
        </div>
    );
}