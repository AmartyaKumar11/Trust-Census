/**
 * Policy Disclaimer Banner
 * 
 * CRITICAL: This banner is MANDATORY on all analytics pages.
 * It is sticky, non-dismissible, and provides legal protection.
 * 
 * MUST:
 * - Be visible at all times (sticky positioning)
 * - Cannot be dismissed or hidden
 * - Use exact text as specified
 * 
 * MUST NEVER:
 * - Be removable by user
 * - Be hidden or minimized
 * - Have modified text
 */

export function PolicyDisclaimerBanner() {
    return (
        <div
            className="sticky top-0 z-50 bg-[var(--color-status-warning)]/10 border-b-2 border-[var(--color-status-warning)]/30 backdrop-blur-sm"
            role="alert"
            aria-live="polite"
        >
            <div className="container-wide py-4">
                <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-0.5">
                        <svg
                            className="w-5 h-5 text-[var(--color-status-warning)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--color-charcoal-800)] leading-relaxed">
                            <strong className="font-semibold">Policy-Grade Estimates:</strong>{' '}
                            All values shown are policy-grade estimates derived from privacy-preserving aggregation.
                            These figures are not exact counts and must not be used for individual, community, or district-level inference.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
