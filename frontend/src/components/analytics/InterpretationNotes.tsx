/**
 * Interpretation Notes
 * 
 * Critical text-only section explaining how to interpret analytics.
 * Important for judges, IAS officers, and policymakers.
 * 
 * MUST:
 * - Explain why values are noisy
 * - Explain why district views are absent
 * - Explain policy sufficiency
 * 
 * MUST NEVER:
 * - Be hidden or collapsed
 * - Contain interactive elements
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export function InterpretationNotes() {
    return (
        <Card variant="outlined" className="border-[var(--color-navy-200)] bg-[var(--color-cream-50)]">
            <CardHeader>
                <CardTitle className="text-[var(--color-navy-800)]">
                    How to Interpret These Estimates
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 text-[var(--color-charcoal-700)]">
                    <div>
                        <h4 className="font-semibold text-[var(--color-navy-700)] mb-2">
                            Why Values Are Noisy
                        </h4>
                        <p className="text-sm leading-relaxed">
                            All displayed values have differential privacy noise applied to protect individual privacy.
                            This means the numbers you see are intentionally imprecise. The noise ensures that no individual
                            or small community can be identified or targeted based on this data. This is a deliberate
                            design choice, not a limitation.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-[var(--color-navy-700)] mb-2">
                            Why District-Level Views Are Absent
                        </h4>
                        <p className="text-sm leading-relaxed">
                            District, block, village, and ward-level caste data is not accessible through this system.
                            Such granular data could enable targeting, profiling, or discrimination. State and national
                            aggregates provide sufficient information for policy planning while preventing misuse.
                            This restriction is permanent and by design.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-[var(--color-navy-700)] mb-2">
                            Why This Level Is Sufficient for Policy
                        </h4>
                        <p className="text-sm leading-relaxed">
                            Macro-level aggregates enable evidence-based policy decisions for welfare schemes, resource
                            allocation, and development planning. Precise counts are not required for these purposes.
                            The estimates provided are statistically sound for policy analysis while maintaining the
                            highest standards of privacy protection.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-[var(--color-cream-200)]">
                        <p className="text-xs text-[var(--color-charcoal-500)] italic">
                            <strong>Legal Note:</strong> This system is designed to comply with privacy laws and
                            constitutional protections. The data presentation reflects India's commitment to both
                            evidence-based governance and individual privacy rights.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
