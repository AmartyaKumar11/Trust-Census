/**
 * Data Coverage Notice Component
 * Trust Census System - Privacy-First Policy Analytics
 * 
 * RESPONSIBILITY: Display data coverage status and governance actions
 * 
 * MUST:
 * - Show data gaps without blame language
 * - Provide governance recommendations
 * - Use constructive, solution-oriented tone
 * - Include constitutional context
 * 
 * MUST NEVER:
 * - Blame specific regions or administrations
 * - Show exact coverage percentages
 * - Include punitive language
 * - Suggest discriminatory actions
 */

import { Card } from '@/components/ui';

interface DataCoverageNoticeProps {
  dataGaps: string[];
  coverage: {
    total_states: number;
    complete_data: number;
    data_gaps: number;
    coverage_percentage: string;
  };
}

export function DataCoverageNotice({ dataGaps, coverage }: DataCoverageNoticeProps) {
  
  // Governance recommendations based on data gaps
  const getGovernanceRecommendations = () => {
    if (dataGaps.length === 0) {
      return [
        'Maintain current data collection standards across all states and UTs',
        'Continue periodic validation and quality assurance processes',
        'Strengthen inter-state coordination for consistent methodology'
      ];
    }
    
    return [
      'Enhance statistical infrastructure in regions with data collection challenges',
      'Provide technical assistance and capacity building support',
      'Develop region-specific data collection methodologies',
      'Establish collaborative frameworks between central and state statistical offices'
    ];
  };

  const recommendations = getGovernanceRecommendations();

  return (
    <div className="space-y-6">
      
      {/* Section Header */}
      <div>
        <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-2">
          Data Coverage & Governance Actions
        </h3>
        <p className="text-sm text-[var(--color-charcoal-600)]">
          Statistical infrastructure status and recommended governance improvements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Coverage Status */}
        <Card className="bg-white border-[var(--color-navy-100)] p-6">
          <h4 className="font-serif font-semibold text-[var(--color-navy-800)] mb-4">
            National Data Coverage Status
          </h4>
          
          <div className="space-y-4">
            {/* Coverage Summary */}
            <div className="bg-[var(--color-cream-50)] rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-[var(--color-success-600)]">
                    {coverage.complete_data}
                  </div>
                  <div className="text-xs text-[var(--color-charcoal-600)]">
                    Complete Data
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg font-bold text-[var(--color-warning-600)]">
                    {coverage.data_gaps}
                  </div>
                  <div className="text-xs text-[var(--color-charcoal-600)]">
                    Enhancement Needed
                  </div>
                </div>
              </div>
            </div>

            {/* Data Gaps (if any) */}
            {dataGaps.length > 0 && (
              <div>
                <h5 className="font-semibold text-sm text-[var(--color-navy-800)] mb-2">
                  Regions Requiring Statistical Infrastructure Enhancement
                </h5>
                <div className="space-y-1">
                  {dataGaps.map((region, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-[var(--color-warning-500)] rounded-full flex-shrink-0" />
                      <span className="text-sm text-[var(--color-charcoal-700)]">
                        {region}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Positive Framing */}
            <div className="pt-3 border-t border-[var(--color-navy-100)]">
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                {dataGaps.length === 0 
                  ? 'Comprehensive data coverage achieved across all states and union territories, enabling robust policy analysis.'
                  : 'Opportunities identified for statistical infrastructure development to achieve comprehensive national coverage.'
                }
              </p>
            </div>
          </div>
        </Card>

        {/* Governance Recommendations */}
        <Card className="bg-[var(--color-gold-50)] border-[var(--color-gold-200)] p-6">
          <h4 className="font-serif font-semibold text-[var(--color-navy-800)] mb-4">
            Recommended Governance Actions
          </h4>
          
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-[var(--color-gold-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <p className="text-sm text-[var(--color-charcoal-800)] leading-relaxed">
                  {recommendation}
                </p>
              </div>
            ))}
          </div>

          {/* Constitutional Context */}
          <div className="mt-6 pt-4 border-t border-[var(--color-gold-200)]">
            <h5 className="font-semibold text-sm text-[var(--color-navy-800)] mb-2">
              Constitutional Framework
            </h5>
            <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
              All data collection and analysis activities are conducted under Article 21 
              (Right to Privacy) and constitutional principles of dignity, equality, and 
              non-discrimination. Statistical infrastructure development aims to strengthen 
              evidence-based governance while protecting individual privacy.
            </p>
          </div>
        </Card>
      </div>

      {/* Methodology Note */}
      <Card className="bg-[var(--color-cream-100)] border-[var(--color-navy-200)] p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-[var(--color-navy-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">ℹ</span>
          </div>
          <div>
            <h5 className="font-semibold text-sm text-[var(--color-navy-800)] mb-1">
              Methodology & Privacy Protection
            </h5>
            <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
              This analysis uses categorical classifications derived from Census of India 2011 
              data. No individual-level data is processed or stored. All insights are presented 
              at state level only, with no district or sub-district disaggregation, ensuring 
              complete privacy protection while enabling policy-relevant analysis.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}