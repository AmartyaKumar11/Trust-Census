/**
 * State Summary Visualization
 * 
 * Single-state visualization for State Analyst role.
 * 
 * MUST:
 * - Show entire state composition only
 * - No district or sub-state breakdown
 * - No interactivity
 * - Use rounded ranges
 * 
 * MUST NEVER:
 * - Show district-level data
 * - Enable drill-down
 * - Allow export
 * - Create dynamic zones
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CasteCompositionChart, CASTE_COLORS, toRoundedRange } from './CasteCompositionChart';

interface StateSummaryData {
    stateCode: string;
    stateName: string;
    composition: Array<{
        category: string;
        percentage: number;
    }>;
    windowId: string;
    generatedAt: string;
}

interface StateSummaryVisualizationProps {
    data: StateSummaryData;
}

export function StateSummaryVisualization({ data }: StateSummaryVisualizationProps) {
    // Convert backend data to chart format with rounded ranges
    const chartData = data.composition.map(item => ({
        category: item.category,
        rangeText: toRoundedRange(item.percentage),
        color: CASTE_COLORS[item.category as keyof typeof CASTE_COLORS] || '#6B7280',
    }));

    return (
        <div className="space-y-6">
            {/* Main Visualization */}
            <Card variant="elevated">
                <CardHeader>
                    <CardTitle>
                        {data.stateName} - Caste Composition Estimate
                    </CardTitle>
                    <p className="text-sm text-[var(--color-charcoal-600)] mt-2">
                        State-level aggregate data with privacy protection applied
                    </p>
                </CardHeader>
                <CardContent>
                    <CasteCompositionChart
                        data={chartData}
                        type="stacked-bar"
                    />
                </CardContent>
            </Card>

            {/* Metadata */}
            <Card variant="outlined" className="border-[var(--color-navy-200)] bg-[var(--color-cream-50)]">
                <CardContent className="py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-xs font-semibold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-1">
                                Aggregation Window
                            </div>
                            <div className="font-mono text-[var(--color-navy-800)]">
                                {data.windowId}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-1">
                                Generated At
                            </div>
                            <div className="font-mono text-[var(--color-navy-800)]">
                                {new Date(data.generatedAt).toLocaleDateString('en-IN')}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Restrictions Notice */}
            <div className="bg-[var(--color-status-info)]/10 border border-[var(--color-status-info)]/30 rounded-lg p-4">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-[var(--color-status-info)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-[var(--color-charcoal-700)]">
                        <strong className="font-semibold">State-Level View Only:</strong> District, block, village, and ward-level
                        caste data is not accessible. This state-level aggregate provides sufficient information for welfare
                        planning and resource allocation while protecting individual privacy.
                    </div>
                </div>
            </div>
        </div>
    );
}
