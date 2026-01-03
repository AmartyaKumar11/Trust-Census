import React from 'react';

interface PolicySummaryCardsProps {
    composition: { category: string; percentage: number }[];
}

export function PolicySummaryCards({ composition }: PolicySummaryCardsProps) {
    const sorted = [...composition].sort((a, b) => b.percentage - a.percentage);
    const topShare = sorted[0]?.percentage || 0;

    let diversityText = "Maharashtra exhibits a broadly mixed caste composition with no single group forming an overwhelming majority.";
    if (topShare > 50) {
        diversityText = "Population distribution shows a significant concentration in a single dominant category.";
    } else if (topShare < 30) {
        diversityText = "State exhibits a highly diversified caste composition across multiple categories with no clearly dominant group.";
    }

    let governanceText = "Policy design should emphasize inclusive, cross-category welfare programs rather than narrowly targeted interventions.";
    if (topShare > 50) {
        governanceText = "Policy frameworks may require focused welfare interventions for the dominant group alongside general programs.";
    }

    const equityText = "No extreme population concentration detected at the state level. Distribution suggests balanced social representation.";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white border border-[var(--color-navy-100)] rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-[var(--color-navy-600)] uppercase tracking-wider mb-3">Diversity Profile</h3>
                <p className="text-[var(--color-charcoal-700)] text-sm leading-relaxed">{diversityText}</p>
            </div>
            <div className="p-6 bg-white border border-[var(--color-navy-100)] rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-[var(--color-navy-600)] uppercase tracking-wider mb-3">Governance Implication</h3>
                <p className="text-[var(--color-charcoal-700)] text-sm leading-relaxed">{governanceText}</p>
            </div>
            <div className="p-6 bg-white border border-[var(--color-navy-100)] rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-[var(--color-navy-600)] uppercase tracking-wider mb-3">Equity Signal</h3>
                <p className="text-[var(--color-charcoal-700)] text-sm leading-relaxed">{equityText}</p>
            </div>
        </div>
    );
}
