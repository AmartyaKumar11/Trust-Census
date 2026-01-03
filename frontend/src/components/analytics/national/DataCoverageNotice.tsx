import React from 'react';
import { Card } from '@/components/ui';

interface DataCoverageNoticeProps {
    insufficientStates: string[];
}

export function DataCoverageNotice({ insufficientStates }: DataCoverageNoticeProps) {
    if (insufficientStates.length === 0) return null;

    return (
        <div className="mt-8 bg-[var(--color-charcoal-50)] border border-[var(--color-charcoal-200)] rounded-lg p-6">
            <h4 className="flex items-center text-sm font-bold text-[var(--color-charcoal-700)] uppercase tracking-wide mb-3">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Governance Signal: Data Sufficiency Gaps
            </h4>
            <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-1">
                    <p className="text-sm text-[var(--color-charcoal-600)] mb-2">
                        The following regions matched the <strong>Insufficient Data</strong> criteria.
                        Aggregate generation was withheld due to low submission counts (&lt; 1000) or high noise-to-signal ratio.
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {insufficientStates.map(st => (
                            <li key={st} className="px-2 py-1 bg-[var(--color-charcoal-200)] text-[var(--color-charcoal-800)] text-xs font-mono rounded">
                                {st}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-1 border-l border-[var(--color-charcoal-200)] pl-6">
                    <h5 className="text-xs font-bold text-[var(--color-charcoal-800)] mb-2">REQUIRED ACTION</h5>
                    <ul className="space-y-1 text-xs text-[var(--color-charcoal-600)] list-disc pl-4">
                        <li>verify field operations in identified regions</li>
                        <li>Initiate supplementary enumeration rounds</li>
                        <li>Audit privacy budget allocation for small populations</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
