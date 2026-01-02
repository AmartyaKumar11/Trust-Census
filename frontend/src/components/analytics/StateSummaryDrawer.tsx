/**
 * State Summary Drawer
 * 
 * Side panel that appears when a state is clicked on the India map.
 * 
 * MUST:
 * - Show rounded ranges only (~30-40%)
 * - Display aggregation window info
 * - Include confidence note about privacy
 * - Be dismissible
 * 
 * MUST NEVER:
 * - Show exact percentages
 * - Allow export
 * - Enable comparison toggles
 * - Navigate to another page
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CasteCompositionChart, CASTE_COLORS, toRoundedRange } from './CasteCompositionChart';
import type { DiversityCategory } from './IndiaCasteMap';

interface StateData {
    code: string;
    name: string;
    category: DiversityCategory;
    description: string;
}

interface StateSummaryDrawerProps {
    state: StateData;
    onClose: () => void;
}

export function StateSummaryDrawer({ state, onClose }: StateSummaryDrawerProps) {
    // Mock data - in real implementation, this would come from backend
    const mockComposition = [
        { category: 'SC', rangeText: toRoundedRange(16), color: CASTE_COLORS.SC },
        { category: 'ST', rangeText: toRoundedRange(9), color: CASTE_COLORS.ST },
        { category: 'OBC', rangeText: toRoundedRange(42), color: CASTE_COLORS.OBC },
        { category: 'General', rangeText: toRoundedRange(28), color: CASTE_COLORS.GENERAL },
        { category: 'Other', rangeText: toRoundedRange(5), color: CASTE_COLORS.OTHER },
    ];

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-[var(--color-cream-200)] px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)]">
                        {state.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--color-cream-100)] rounded-lg transition-colors"
                        aria-label="Close drawer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Category Badge */}
                    <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-cream-200)]">
                        <div className="text-xs font-semibold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-1">
                            Diversity Classification
                        </div>
                        <div className="text-sm text-[var(--color-navy-800)]">
                            {state.description}
                        </div>
                    </div>

                    {/* Composition Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Caste Composition Estimate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CasteCompositionChart
                                data={mockComposition}
                                type="stacked-bar"
                            />
                        </CardContent>
                    </Card>

                    {/* Aggregation Window Info */}
                    <Card variant="outlined" className="border-[var(--color-navy-200)] bg-[var(--color-cream-50)]">
                        <CardContent className="py-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[var(--color-charcoal-600)]">Aggregation Window:</span>
                                    <span className="font-mono text-[var(--color-navy-800)]">2024-Q4</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--color-charcoal-600)]">Data Points:</span>
                                    <span className="font-mono text-[var(--color-navy-800)]">~15,000–20,000</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--color-charcoal-600)]">Privacy Level:</span>
                                    <span className="font-mono text-[var(--color-navy-800)]">ε = 1.0</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Confidence Note */}
                    <div className="bg-[var(--color-status-info)]/10 border border-[var(--color-status-info)]/30 rounded-lg p-4">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-[var(--color-status-info)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-[var(--color-charcoal-700)]">
                                <strong className="font-semibold">Privacy Protection:</strong> All values include differential privacy noise.
                                Ranges are intentionally broad to prevent identification of individuals or small communities.
                            </div>
                        </div>
                    </div>

                    {/* Restrictions Notice */}
                    <div className="text-xs text-[var(--color-charcoal-500)] space-y-2">
                        <p className="font-semibold text-[var(--color-charcoal-600)]">
                            What you cannot do with this data:
                        </p>
                        <ul className="space-y-1 pl-4">
                            <li className="flex items-start gap-2">
                                <span className="text-[var(--color-status-error)] mt-0.5">✗</span>
                                <span>Export or download this information</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[var(--color-status-error)] mt-0.5">✗</span>
                                <span>View district or village-level breakdowns</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[var(--color-status-error)] mt-0.5">✗</span>
                                <span>Compare with other states (use national view)</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}
