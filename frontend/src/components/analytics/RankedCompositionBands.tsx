import React from 'react';

interface RankedCompositionBandsProps {
    composition: { category: string; percentage: number }[];
}

function toRoundedRange(percentage: number): string {
    const floor = Math.floor(percentage / 10) * 10;
    return `${floor}–${floor + 10}%`;
}

export function RankedCompositionBands({ composition }: RankedCompositionBandsProps) {
    const sorted = [...composition].sort((a, b) => b.percentage - a.percentage);

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[var(--color-navy-100)] shadow-sm">
            <div className="mb-6">
                <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)]">
                    Caste Composition — Ranked Categories
                </h3>
                <p className="text-xs text-[var(--color-charcoal-500)] italic mt-1">
                    Visual proportions based on noisy estimates. Ranges are approximate.
                </p>
            </div>

            <div className="space-y-5">
                {sorted.map((item) => {
                    const widthPct = Math.max(item.percentage, 1);

                    return (
                        <div key={item.category} className="group">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-sm text-[var(--color-navy-800)] group-hover:text-[var(--color-navy-600)] transition-colors">
                                    {item.category}
                                </span>
                                <span className="text-xs font-mono text-[var(--color-charcoal-600)]">
                                    ~{toRoundedRange(item.percentage)}
                                </span>
                            </div>

                            <div className="w-full bg-[var(--color-cream-200)] rounded-md h-3 overflow-hidden">
                                <div
                                    className="h-full bg-[var(--color-navy-600)] rounded-md shadow-sm transition-all duration-1000 ease-out"
                                    style={{ width: `${widthPct}%` }}
                                >
                                    {/* Optical flare for aesthetics */}
                                    <div className="w-full h-full opacity-10 bg-gradient-to-r from-white/20 to-transparent" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
