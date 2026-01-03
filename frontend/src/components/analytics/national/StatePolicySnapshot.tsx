/**
 * State Policy Snapshot Component
 * Trust Census System - Privacy-First Policy Analytics
 * 
 * RESPONSIBILITY: Display detailed policy insights for selected state
 * 
 * MUST:
 * - Show policy interpretation, not raw data
 * - Provide textual analysis only
 * - Include governance recommendations
 * - Use government report formatting
 * 
 * MUST NEVER:
 * - Display numeric percentages or ratios
 * - Show charts or graphs
 * - Include export functionality
 * - Reveal district-level data
 */

import { Card } from '@/components/ui';
import { URBAN_CATEGORY_DESCRIPTIONS } from '@/lib/policyData';
import type { StatePolicy } from '@/lib/policyData';

interface StatePolicySnapshotProps {
  stateData: StatePolicy | null;
  stateCode: string | null;
}

export function StatePolicySnapshot({ stateData, stateCode }: StatePolicySnapshotProps) {
  
  // Default state when no state is selected
  if (!stateData || !stateCode) {
    return (
      <Card className="bg-white border-[var(--color-navy-100)] p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--color-cream-100)] rounded-full flex items-center justify-center mx-auto">
            <svg 
              className="w-8 h-8 text-[var(--color-charcoal-400)]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
              />
            </svg>
          </div>
          <div>
            <h3 className="font-serif font-semibold text-[var(--color-navy-800)] mb-2">
              Select a State
            </h3>
            <p className="text-sm text-[var(--color-charcoal-600)] leading-relaxed">
              Click on any state in the map to view detailed policy insights and 
              governance recommendations.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Get policy recommendations based on categories
  const getPolicyRecommendations = (state: StatePolicy): string[] => {
    const recommendations: string[] = [];
    
    // Urban category recommendations
    switch (state.urban_category) {
      case 'Highly Urbanized':
        recommendations.push('Infrastructure capacity expansion and urban service optimization');
        recommendations.push('Sustainable urban development and metropolitan governance');
        break;
      case 'Moderately Urbanized':
        recommendations.push('Balanced urban-rural development strategies');
        recommendations.push('Urban growth management and infrastructure scaling');
        break;
      case 'Semi-Rural':
        recommendations.push('Rural infrastructure connectivity enhancement');
        recommendations.push('Service delivery access improvement in rural areas');
        break;
      case 'Predominantly Rural':
        recommendations.push('Rural development and connectivity prioritization');
        recommendations.push('Traditional settlement pattern preservation with modern amenities');
        break;
      case 'Insufficient Data':
        recommendations.push('Data collection infrastructure development');
        recommendations.push('Governance capacity building and statistical systems');
        break;
    }
    
    // Density category recommendations
    switch (state.density_category) {
      case 'Very High Density':
        recommendations.push('Population pressure management and resource optimization');
        break;
      case 'High Density':
        recommendations.push('Efficient resource allocation and service delivery systems');
        break;
      case 'Medium Density':
        recommendations.push('Balanced development approach with infrastructure planning');
        break;
      case 'Low Density':
        recommendations.push('Connectivity enhancement and service access improvement');
        break;
    }
    
    return recommendations;
  };

  const recommendations = getPolicyRecommendations(stateData);

  return (
    <Card className="bg-white border-[var(--color-navy-100)] p-6 h-full">
      <div className="space-y-6">
        
        {/* State Header */}
        <div className="border-b border-[var(--color-navy-100)] pb-4">
          <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-1">
            {stateData.state_name}
          </h3>
          <p className="text-sm text-[var(--color-charcoal-600)]">
            Policy Analysis & Governance Insights
          </p>
        </div>

        {/* Categorization */}
        <div className="space-y-4">
          <div>
            <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-2">
              Urbanisation Profile
            </h4>
            <div className="bg-[var(--color-cream-50)] rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ 
                    backgroundColor: stateData.urban_category === 'Highly Urbanized' ? '#2c5530' :
                                   stateData.urban_category === 'Moderately Urbanized' ? '#5a7c65' :
                                   stateData.urban_category === 'Semi-Rural' ? '#8ba888' :
                                   stateData.urban_category === 'Predominantly Rural' ? '#b8d4ba' : '#e5e7eb'
                  }}
                />
                <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {stateData.urban_category}
                </span>
              </div>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                {URBAN_CATEGORY_DESCRIPTIONS[stateData.urban_category]}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-2">
              Population Density Profile
            </h4>
            <div className="bg-[var(--color-cream-50)] rounded-lg p-3">
              <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                {stateData.density_category}
              </span>
              <p className="text-xs text-[var(--color-charcoal-700)] mt-1 leading-relaxed">
                Population distribution pattern affecting infrastructure and service delivery requirements.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-2">
              Demographic Balance
            </h4>
            <div className="bg-[var(--color-cream-50)] rounded-lg p-3">
              <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                {stateData.sex_ratio_interpretation}
              </span>
              <p className="text-xs text-[var(--color-charcoal-700)] mt-1 leading-relaxed">
                Gender balance indicator for social development planning.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Interpretation */}
        <div>
          <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-3">
            Policy Interpretation
          </h4>
          <div className="bg-[var(--color-gold-50)] border border-[var(--color-gold-200)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-charcoal-800)] leading-relaxed">
              {stateData.policy_interpretation}
            </p>
          </div>
        </div>

        {/* Governance Recommendations */}
        <div>
          <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-3">
            Governance Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-[var(--color-gold-500)] rounded-full mt-2 flex-shrink-0" />
                <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                  {recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Status */}
        <div className="pt-4 border-t border-[var(--color-navy-100)]">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              stateData.urban_data_available 
                ? 'bg-[var(--color-success-500)]' 
                : 'bg-[var(--color-warning-500)]'
            }`} />
            <span className="text-xs text-[var(--color-charcoal-600)]">
              {stateData.urban_data_available 
                ? 'Complete urbanisation data available'
                : 'Limited urbanisation data - collection priority'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}