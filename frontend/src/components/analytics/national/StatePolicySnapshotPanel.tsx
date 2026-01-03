import React from 'react';
import { Card, CardContent } from '@/components/ui';
import { PolicyCategory, CATEGORY_DEFINITIONS } from '@/lib/stateCategories';

interface StatePolicySnapshotPanelProps {
    stateName: string | null;
    category: PolicyCategory | null;
}

export function StatePolicySnapshotPanel({ stateName, category }: StatePolicySnapshotPanelProps) {
    if (!stateName || !category) {
        return (
            <Card variant="outlined" className="h-full flex items-center justify-center p-8 bg-[var(--color-cream-50)] border-dashed">
                <div className="text-center text-[var(--color-charcoal-400)]">
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
                    </svg>
                    <p className="font-medium">Select a state on the map<br />to view policy snapshot</p>
                </div>
            </Card>
        );
    }

    const def = CATEGORY_DEFINITIONS[category];

    return (
        <Card variant="elevated" className="h-full border-l-4" style={{ borderLeftColor: def.color }}>
            <CardContent className="space-y-6">

                {/* Header */}
                <div className="border-b border-[var(--color-navy-100)] pb-4">
                    <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-900)] mb-1">
                        {stateName}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: def.color }} />
                        <span className="font-mono text-sm font-bold uppercase tracking-wide text-[var(--color-charcoal-600)]">
                            {def.label}
                        </span>
                    </div>
                </div>

                {/* Interpretation */}
                <div className="bg-[var(--color-cream-50)] p-4 rounded-lg">
                    <h4 className="text-xs font-bold text-[var(--color-navy-600)] uppercase tracking-wide mb-2">
                        Policy Interpretation
                    </h4>
                    <p className="text-sm text-[var(--color-navy-800)] leading-relaxed">
                        {def.description}
                    </p>
                    <p className="text-xs text-[var(--color-charcoal-500)] italic mt-2 border-t border-[var(--color-navy-100)] pt-2">
                        Note: This classification reflects state-level composition patterns only and does not indicate district or community-level demographics.
                    </p>
                </div>

                {/* Direction */}
                <div>
                    <h4 className="text-xs font-bold text-[var(--color-navy-600)] uppercase tracking-wide mb-3">
                        Indicative Policy Direction
                    </h4>
                    <ul className="space-y-3">
                        {def.direction.map((item, idx) => (
                            <li key={idx} className="flex items-start space-x-3 text-sm text-[var(--color-charcoal-800)]">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-navy-400)] flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Anti-Inference Warning */}
                <div className="text-[10px] text-[var(--color-charcoal-400)] text-center pt-4">
                    No numeric data is exposed in this view to maintain privacy guardrails.
                </div>

            </CardContent>
        </Card>
    );
}
