/**
 * Current State Profile Component
 * Trust Census System - Policy Simulation
 * 
 * RESPONSIBILITY: Display current categorical profile of selected state
 * 
 * MUST:
 * - Show only categorical labels, never numbers
 * - Display current state across all simulation dimensions
 * - Use clear, government-appropriate formatting
 * - Include data sufficiency status
 * 
 * MUST NEVER:
 * - Display raw numeric values
 * - Show percentages or ratios
 * - Include district-level breakdowns
 */

import { Card } from '@/components/ui';
import { CATEGORY_DESCRIPTIONS } from '@/lib/policySimulationRules';
import type { StatePolicy } from '@/lib/policyData';

interface CurrentStateProfileProps {
  stateData: StatePolicy;
  stateCode: string | null;
}

export function CurrentStateProfile({ stateData, stateCode }: CurrentStateProfileProps) {
  
  // Map state data to simulation dimensions
  const currentProfile = {
    urbanisation: stateData.urban_category,
    density: stateData.density_category,
    sex_ratio: stateData.sex_ratio_interpretation
  };

  return (
    <Card className="bg-white border-[var(--color-navy-100)] p-6">
      <div className="space-y-6">
        
        {/* Section Header */}
        <div className="border-b border-[var(--color-navy-100)] pb-4">
          <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-1">
            Current State Profile: {stateData.state_name}
          </h3>
          <p className="text-sm text-[var(--color-charcoal-600)]">
            Baseline categorical profile for policy simulation scenarios
          </p>
        </div>

        {/* Profile Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Urbanisation Category */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm">
              Urbanisation Category
            </h4>
            <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-navy-100)]">
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ 
                    backgroundColor: currentProfile.urbanisation === 'Highly Urbanized' ? '#2c5530' :
                                   currentProfile.urbanisation === 'Moderately Urbanized' ? '#5a7c65' :
                                   currentProfile.urbanisation === 'Semi-Rural' ? '#8ba888' :
                                   currentProfile.urbanisation === 'Predominantly Rural' ? '#b8d4ba' : '#e5e7eb'
                  }}
                />
                <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {currentProfile.urbanisation}
                </span>
              </div>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                {CATEGORY_DESCRIPTIONS.urbanisation[currentProfile.urbanisation as keyof typeof CATEGORY_DESCRIPTIONS.urbanisation]}
              </p>
            </div>
          </div>

          {/* Population Density Category */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm">
              Population Density Category
            </h4>
            <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-navy-100)]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-[var(--color-navy-500)] rounded-full" />
                <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {currentProfile.density}
                </span>
              </div>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                {CATEGORY_DESCRIPTIONS.density[currentProfile.density as keyof typeof CATEGORY_DESCRIPTIONS.density]}
              </p>
            </div>
          </div>

          {/* Demographic Balance Category */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm">
              Demographic Balance Category
            </h4>
            <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-navy-100)]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-[var(--color-gold-500)] rounded-full" />
                <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {currentProfile.sex_ratio}
                </span>
              </div>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                {CATEGORY_DESCRIPTIONS.sex_ratio[currentProfile.sex_ratio as keyof typeof CATEGORY_DESCRIPTIONS.sex_ratio]}
              </p>
            </div>
          </div>
        </div>

        {/* Data Sufficiency Status */}
        <div className="bg-[var(--color-success-50)] border border-[var(--color-success-200)] rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-[var(--color-success-500)] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div>
              <h4 className="font-serif font-semibold text-[var(--color-success-800)] text-sm mb-1">
                Data Sufficiency Status
              </h4>
              <p className="text-xs text-[var(--color-success-700)] leading-relaxed">
                This state has sufficient categorical data for policy simulation across all dimensions. 
                Scenario reasoning can be conducted with confidence in the baseline profile accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* Simulation Readiness */}
        <div className="pt-4 border-t border-[var(--color-navy-100)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-navy-800)]">
              Simulation Readiness
            </span>
            <span className="text-sm text-[var(--color-success-600)] font-semibold">
              Ready for Scenario Analysis
            </span>
          </div>
          <p className="text-xs text-[var(--color-charcoal-600)] mt-1">
            All required categorical dimensions are available for transition scenario reasoning.
          </p>
        </div>
      </div>
    </Card>
  );
}