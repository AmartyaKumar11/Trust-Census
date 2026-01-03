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

    const getBand = (p: number) => {
        if (p > 25) return { label: 'High Presence', width: 'w-full', color: 'bg-[var(--color-navy-700)]' };
        if (p > 10) return { label: 'Moderate Presence', width: 'w-2/3', color: 'bg-[var(--color-navy-500)]' };
        return { label: 'Lower Presence', width: 'w-1/3', color: 'bg-[var(--color-navy-300)]' };
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[var(--color-navy-100)] shadow-sm">
            <div className="mb-6">
                <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)]">
                    Caste Composition — Ranked Categories (Policy Bands)
                </h3>
                <p className="text-xs text-[var(--color-charcoal-500)] italic mt-1">
                    Categories are shown in ranked policy bands. Ranges are approximate and privacy-protected.
                </p>
            </div>

            <div className="space-y-6">
                {sorted.map((item) => {
                    const band = getBand(item.percentage);
                    return (
                        <div key={item.category} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <div className="w-32 shrink-0">
                                <span className="font-semibold text-[var(--color-navy-800)]">{item.category}</span>
                            </div>
                            <div className="flex-1 bg-[var(--color-cream-100)] rounded-md overflow-hidden relative h-12 md:h-14">
                                <div
                                    className={`h-full ${band.color} ${band.width} flex items-center px-4 transition-all duration-500`}
                                >
                                    <span className="text-white text-sm font-medium tracking-wide">~{toRoundedRange(item.percentage)}</span>
                                </div>
                            </div>
                            <div className="w-32 shrink-0 md:text-right text-xs text-[var(--color-charcoal-500)] uppercase tracking-wide font-medium">
                                {band.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
