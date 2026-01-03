import { Disclaimer } from '@/components/ui';

export function PolicyDisclaimerBanner() {
    return (
        <div className="sticky top-0 z-50 w-full bg-[#FEF3C7] border-b border-[#F59E0B]/20 shadow-sm print:hidden">
            <div className="container-wide py-2">
                <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 text-[#D97706]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-[#92400E]">
                            <strong>Policy-Grade Estimates:</strong> All values shown are policy-grade estimates derived from privacy-preserving aggregation. These figures are not exact counts and must not be used for individual, community, or district-level inference.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
