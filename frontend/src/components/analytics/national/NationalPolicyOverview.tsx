/**
 * National Policy Overview Component
 * Trust Census System - Privacy-First Policy Analytics
 * 
 * RESPONSIBILITY: Display national policy summary and metadata
 * 
 * MUST:
 * - Show policy interpretation, not raw data
 * - Display governance-grade summary
 * - Include privacy and data source information
 * - Use government report aesthetic
 * 
 * MUST NEVER:
 * - Show numeric percentages
 * - Include charts or graphs
 * - Allow data export
 * - Show district-level information
 */

import { Card } from '@/components/ui';
import type { PolicyMetadata } from '@/lib/policyData';

interface NationalPolicyOverviewProps {
  summary: {
    title: string;
    insights: string[];
    data_status: string;
  };
  coverage: {
    total_states: number;
    complete_data: number;
    data_gaps: number;
    coverage_percentage: string;
  };
  metadata: PolicyMetadata;
}

export function NationalPolicyOverview({ 
  summary, 
  coverage, 
  metadata 
}: NationalPolicyOverviewProps) {
  return (
    <div className="space-y-6">
      
      {/* Policy Brief Header */}
      <Card className="bg-white border-[var(--color-navy-200)] p-6">
        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl font-bold text-[var(--color-navy-900)] mb-2">
            {summary.title}
          </h2>
          <p className="text-[var(--color-charcoal-600)] text-sm">
            {metadata.source} • {metadata.policy_scope} Scope • {metadata.data_type}
          </p>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Policy Insights */}
          <div className="space-y-3">
            <h3 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm uppercase tracking-wide">
              Policy Insights
            </h3>
            <div className="space-y-2">
              {summary.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[var(--color-gold-500)] rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-[var(--color-charcoal-700)] leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Coverage */}
          <div className="space-y-3">
            <h3 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm uppercase tracking-wide">
              Data Coverage
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-charcoal-600)]">Total States/UTs</span>
                <span className="font-mono text-sm font-semibold text-[var(--color-navy-800)]">
                  {coverage.total_states}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-charcoal-600)]">Complete Data</span>
                <span className="font-mono text-sm font-semibold text-[var(--color-success-600)]">
                  {coverage.complete_data}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-charcoal-600)]">Data Gaps</span>
                <span className="font-mono text-sm font-semibold text-[var(--color-warning-600)]">
                  {coverage.data_gaps}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--color-navy-100)]">
                <p className="text-xs text-[var(--color-charcoal-600)]">
                  {summary.data_status}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Governance */}
          <div className="space-y-3">
            <h3 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm uppercase tracking-wide">
              Privacy & Governance
            </h3>
            <div className="space-y-2">
              {metadata.privacy_notes.map((note, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-1 h-1 bg-[var(--color-success-500)] rounded-full mt-2 flex-shrink-0" />
                  <p className="text-xs text-[var(--color-charcoal-600)] leading-relaxed">
                    {note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Governance Notice */}
      <Card className="bg-[var(--color-cream-100)] border-[var(--color-gold-200)] p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-[var(--color-gold-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div>
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm mb-1">
              Constitutional Governance Framework
            </h4>
            <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
              This analysis is conducted under constitutional principles of privacy, dignity, and 
              non-discrimination. All data is presented in categorical form to prevent individual 
              identification while enabling evidence-based policy development.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}