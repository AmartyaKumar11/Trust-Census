/**
 * National Summary Cards
 * 
 * Static summary cards for national-level insights.
 * 
 * MUST:
 * - Render backend-provided summaries only
 * - No client-side calculations
 * - Display policy-relevant insights
 * 
 * MUST NEVER:
 * - Calculate values on client
 * - Show exact counts
 * - Enable drill-down
 */

import { Card, CardContent } from '@/components/ui';

interface NationalSummary {
    nationalComposition: string;
    highestDiversity: string[];
    dataSufficiencyGaps: string[];
}

interface NationalSummaryCardsProps {
    summary: NationalSummary;
}

export function NationalSummaryCards({ summary }: NationalSummaryCardsProps) {
    return (
        <div className="grid md:grid-cols-3 gap-6">
            {/* National Composition */}
            <Card variant="data">
                <CardContent className="py-6">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-navy-100)] rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--color-navy-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-1">
                                National Composition
                            </div>
                            <div className="text-sm text-[var(--color-navy-800)] leading-relaxed">
                                {summary.nationalComposition}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Highest Diversity */}
            <Card variant="data">
                <CardContent className="py-6">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-status-success)]/10 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-2">
                                Highest Diversity
                            </div>
                            <div className="space-y-1">
                                {summary.highestDiversity.map((state, index) => (
                                    <div key={index} className="text-sm text-[var(--color-navy-800)]">
                                        • {state}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Sufficiency Gaps */}
            <Card variant="data">
                <CardContent className="py-6">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-status-warning)]/10 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-semibold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-2">
                                Data Sufficiency Gaps
                            </div>
                            <div className="space-y-1">
                                {summary.dataSufficiencyGaps.length > 0 ? (
                                    summary.dataSufficiencyGaps.map((state, index) => (
                                        <div key={index} className="text-sm text-[var(--color-navy-800)]">
                                            • {state}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-[var(--color-charcoal-600)] italic">
                                        No significant gaps identified
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
