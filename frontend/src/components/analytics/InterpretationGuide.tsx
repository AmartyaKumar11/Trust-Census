import React from 'react';

export function InterpretationGuide() {
    return (
        <div className="bg-[var(--color-cream-100)] rounded-xl p-6 border border-[var(--color-navy-100)]">
            <h3 className="text-sm font-bold text-[var(--color-navy-800)] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Interpret This Data
            </h3>
            <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-[var(--color-charcoal-700)]">
                    <span className="text-[var(--color-navy-400)]">•</span>
                    <span>Values are <strong>policy-grade estimates</strong> with differential privacy (ε=1.0) applied to protect citizen anonymity.</span>
                </li>
                <li className="flex gap-3 text-sm text-[var(--color-charcoal-700)]">
                    <span className="text-[var(--color-navy-400)]">•</span>
                    <span><strong>Rankings and relative dominance</strong> are meaningful for planning; exact decimals are intentionally suppressed.</span>
                </li>
                <li className="flex gap-3 text-sm text-[var(--color-charcoal-700)]">
                    <span className="text-[var(--color-navy-400)]">•</span>
                    <span>Data is suitable for <strong>state-level resource allocation</strong> only.</span>
                </li>
                <li className="flex gap-3 text-sm text-[var(--color-charcoal-700)]">
                    <span className="text-[var(--color-navy-400)]">•</span>
                    <span>Sub-state inference (district/block level) is <strong>intentionally unavailable</strong> to prevent targeting.</span>
                </li>
            </ul>
        </div>
    );
}
