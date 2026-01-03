import React from 'react';
import { Card, CardContent } from '@/components/ui';
import { PolicyCategory, CATEGORY_DEFINITIONS } from '@/lib/stateCategories';

interface NationalPatternsPanelProps {
    counts: Record<PolicyCategory, number>;
}

export function NationalPatternsPanel({ counts }: NationalPatternsPanelProps) {
    const categories = Object.keys(CATEGORY_DEFINITIONS) as PolicyCategory[];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {categories.map((cat) => {
                if (cat === 'INSUFFICIENT_DATA') return null; // Don't show in patterns

                const count = counts[cat] || 0;
                const def = CATEGORY_DEFINITIONS[cat];
                if (count === 0) return null; // Only show active patterns? Or show all?
                // Show all to give context of emptiness? No, cleaner to show only present.
                // But User might want to see the zeroes. 
                // Let's show all except insufficient.

                return (
                    <Card key={cat} variant="outlined" className="border-t-4" style={{ borderTopColor: def.color }}>
                        <CardContent className="pt-4">
                            <h3 className="text-3xl font-serif font-bold text-[var(--color-navy-900)] mb-1">
                                {count}
                            </h3>
                            <div className="text-xs font-bold text-[var(--color-charcoal-500)] uppercase tracking-wide mb-2">
                                States: {def.label}
                            </div>
                            <p className="text-xs text-[var(--color-charcoal-600)] leading-tight">
                                {def.description.split('.')[0]}. {/* Shorten for card */}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
