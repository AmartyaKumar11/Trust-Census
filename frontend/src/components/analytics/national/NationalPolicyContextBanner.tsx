import React from 'react';
import { Card } from '@/components/ui';

export function NationalPolicyContextBanner() {
    return (
        <Card variant="default" className="bg-[var(--color-navy-50)] border-l-4 border-l-[var(--color-navy-600)] mb-8">
            <div className="p-4 md:p-5 flex items-start space-x-4">
                <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[var(--color-navy-700)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--color-navy-900)] uppercase tracking-wide mb-1">
                        National Policy Context
                    </h3>
                    <p className="text-sm text-[var(--color-navy-800)] leading-relaxed font-medium">
                        This view presents policy-grade caste composition patterns across Indian states to support Union-level welfare and development planning.
                        Values are privacy-protected and suitable only for macro-level decision-making.
                    </p>
                </div>
            </div>
        </Card>
    );
}
