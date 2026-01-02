/**
 * Caste Composition Chart
 * 
 * Shared visualization component for displaying caste composition.
 * Used by both national and state pages.
 * 
 * MUST:
 * - Show rounded ranges only (~30-40%)
 * - Use neutral, government-style colors
 * - No hover tooltips with exact values
 * - No interactivity
 * 
 * MUST NEVER:
 * - Show exact percentages
 * - Allow drill-down
 * - Enable export
 */

interface CasteData {
    category: string;
    rangeText: string; // e.g., "~30-40%"
    color: string;
}

interface CasteCompositionChartProps {
    data: CasteData[];
    title?: string;
    type?: 'stacked-bar' | 'donut';
}

export function CasteCompositionChart({
    data,
    title = "Caste Composition",
    type = 'stacked-bar'
}: CasteCompositionChartProps) {
    if (type === 'stacked-bar') {
        return (
            <div className="space-y-4">
                {title && (
                    <h3 className="text-sm font-semibold text-[var(--color-charcoal-600)] uppercase tracking-wide">
                        {title}
                    </h3>
                )}

                <div className="space-y-3">
                    {data.map((item, index) => (
                        <div key={index} className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-medium text-[var(--color-navy-800)]">
                                    {item.category}
                                </span>
                                <span className="text-sm text-[var(--color-charcoal-600)] font-mono">
                                    {item.rangeText}
                                </span>
                            </div>
                            <div className="h-8 bg-[var(--color-cream-100)] rounded overflow-hidden">
                                <div
                                    className="h-full transition-all duration-300"
                                    style={{
                                        backgroundColor: item.color,
                                        width: '100%' // Full width since we don't show proportional bars
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-[var(--color-charcoal-400)] italic mt-4">
                    Ranges are approximate and privacy-protected. Not for precise comparison.
                </p>
            </div>
        );
    }

    // Donut chart - simple legend-based representation
    return (
        <div className="space-y-4">
            {title && (
                <h3 className="text-sm font-semibold text-[var(--color-charcoal-600)] uppercase tracking-wide">
                    {title}
                </h3>
            )}

            <div className="grid grid-cols-2 gap-4">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-[var(--color-cream-50)] rounded-lg">
                        <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--color-navy-800)] truncate">
                                {item.category}
                            </div>
                            <div className="text-xs text-[var(--color-charcoal-600)] font-mono">
                                {item.rangeText}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-[var(--color-charcoal-400)] italic mt-4">
                Ranges are approximate and privacy-protected. Not for precise comparison.
            </p>
        </div>
    );
}

/**
 * Government-approved neutral colors for caste categories.
 * These colors are deliberately neutral to avoid political or social associations.
 */
export const CASTE_COLORS = {
    SC: '#6B7280',      // Neutral gray
    ST: '#8B5CF6',      // Neutral purple
    OBC: '#10B981',     // Neutral green
    GENERAL: '#3B82F6', // Neutral blue
    OTHER: '#F59E0B',   // Neutral amber
} as const;

/**
 * Convert backend aggregate data to rounded range text.
 * This function ensures exact percentages are NEVER displayed.
 */
export function toRoundedRange(percentage: number): string {
    // Round to nearest 10
    const lower = Math.floor(percentage / 10) * 10;
    const upper = lower + 10;

    return `~${lower}–${upper}%`;
}
