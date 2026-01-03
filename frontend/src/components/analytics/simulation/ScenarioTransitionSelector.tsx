/**
 * Scenario Transition Selector Component
 * Trust Census System - Policy Simulation
 * 
 * RESPONSIBILITY: Allow selection of categorical transitions for simulation
 * 
 * MUST:
 * - Provide dropdown selection for each dimension
 * - Show only valid adjacent transitions
 * - Use deterministic transition rules
 * - Disable invalid or unavailable transitions
 * 
 * MUST NEVER:
 * - Allow arbitrary transitions
 * - Use sliders or numeric inputs
 * - Show transitions that skip categories
 * - Include predictive elements
 */

import { Card } from '@/components/ui';
import { 
  getValidTransitions, 
  DIMENSION_LABELS,
  CATEGORY_DESCRIPTIONS 
} from '@/lib/policySimulationRules';
import type { StatePolicy } from '@/lib/policyData';

interface ScenarioTransitionSelectorProps {
  stateData: StatePolicy;
  simulationScenario: Record<string, string | undefined>;
  onScenarioUpdate: (dimension: string, targetCategory: string | null) => void;
}

export function ScenarioTransitionSelector({ 
  stateData, 
  simulationScenario, 
  onScenarioUpdate 
}: ScenarioTransitionSelectorProps) {
  
  // Map state data to simulation dimensions
  const currentCategories = {
    urbanisation: stateData.urban_category,
    density: stateData.density_category,
    sex_ratio: stateData.sex_ratio_interpretation
  };

  // Get valid transitions for each dimension
  const getTransitionOptions = (dimension: keyof typeof currentCategories) => {
    const currentValue = currentCategories[dimension];
    return getValidTransitions(dimension, currentValue);
  };

  return (
    <Card className="bg-white border-[var(--color-navy-100)] p-6">
      <div className="space-y-6">
        
        {/* Section Header */}
        <div className="border-b border-[var(--color-navy-100)] pb-4">
          <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-2">
            Scenario Transition Selection
          </h3>
          <p className="text-sm text-[var(--color-charcoal-600)]">
            Select target categories for policy scenario reasoning. Only adjacent logical 
            transitions are permitted to ensure realistic governance planning.
          </p>
        </div>

        {/* Transition Selectors */}
        <div className="space-y-6">
          
          {/* Urbanisation Transition */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)]">
              {DIMENSION_LABELS.urbanisation}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Category */}
              <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-navy-100)]">
                <div className="text-xs text-[var(--color-charcoal-600)] mb-1">Current Category</div>
                <div className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {currentCategories.urbanisation}
                </div>
                <div className="text-xs text-[var(--color-charcoal-700)] mt-1">
                  {CATEGORY_DESCRIPTIONS.urbanisation[currentCategories.urbanisation as keyof typeof CATEGORY_DESCRIPTIONS.urbanisation]}
                </div>
              </div>
              
              {/* Target Category Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-navy-800)]">
                  Scenario Target Category
                </label>
                <select
                  value={simulationScenario.urbanisation || ''}
                  onChange={(e) => onScenarioUpdate('urbanisation', e.target.value || null)}
                  className="w-full px-3 py-2 border border-[var(--color-navy-200)] rounded-lg 
                           bg-white text-sm text-[var(--color-charcoal-800)] focus:outline-none 
                           focus:ring-2 focus:ring-[var(--color-navy-500)] focus:border-transparent"
                  disabled={currentCategories.urbanisation === 'Insufficient Data'}
                >
                  <option value="">-- No Transition Selected --</option>
                  {getTransitionOptions('urbanisation').map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {currentCategories.urbanisation === 'Insufficient Data' && (
                  <p className="text-xs text-[var(--color-warning-600)]">
                    Simulation disabled: Insufficient baseline data
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Population Density Transition */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)]">
              {DIMENSION_LABELS.density}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Category */}
              <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-navy-100)]">
                <div className="text-xs text-[var(--color-charcoal-600)] mb-1">Current Category</div>
                <div className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {currentCategories.density}
                </div>
                <div className="text-xs text-[var(--color-charcoal-700)] mt-1">
                  {CATEGORY_DESCRIPTIONS.density[currentCategories.density as keyof typeof CATEGORY_DESCRIPTIONS.density]}
                </div>
              </div>
              
              {/* Target Category Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-navy-800)]">
                  Scenario Target Category
                </label>
                <select
                  value={simulationScenario.density || ''}
                  onChange={(e) => onScenarioUpdate('density', e.target.value || null)}
                  className="w-full px-3 py-2 border border-[var(--color-navy-200)] rounded-lg 
                           bg-white text-sm text-[var(--color-charcoal-800)] focus:outline-none 
                           focus:ring-2 focus:ring-[var(--color-navy-500)] focus:border-transparent"
                >
                  <option value="">-- No Transition Selected --</option>
                  {getTransitionOptions('density').map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Demographic Balance Transition */}
          <div className="space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)]">
              {DIMENSION_LABELS.sex_ratio}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Category */}
              <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-navy-100)]">
                <div className="text-xs text-[var(--color-charcoal-600)] mb-1">Current Category</div>
                <div className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {currentCategories.sex_ratio}
                </div>
                <div className="text-xs text-[var(--color-charcoal-700)] mt-1">
                  {CATEGORY_DESCRIPTIONS.sex_ratio[currentCategories.sex_ratio as keyof typeof CATEGORY_DESCRIPTIONS.sex_ratio]}
                </div>
              </div>
              
              {/* Target Category Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--color-navy-800)]">
                  Scenario Target Category
                </label>
                <select
                  value={simulationScenario.sex_ratio || ''}
                  onChange={(e) => onScenarioUpdate('sex_ratio', e.target.value || null)}
                  className="w-full px-3 py-2 border border-[var(--color-navy-200)] rounded-lg 
                           bg-white text-sm text-[var(--color-charcoal-800)] focus:outline-none 
                           focus:ring-2 focus:ring-[var(--color-navy-500)] focus:border-transparent"
                >
                  <option value="">-- No Transition Selected --</option>
                  {getTransitionOptions('sex_ratio').map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transition Rules Notice */}
        <div className="bg-[var(--color-navy-50)] border border-[var(--color-navy-200)] rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-[var(--color-navy-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm mb-1">
                Transition Rules
              </h4>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                Only adjacent logical transitions are permitted to ensure realistic policy scenarios. 
                For example, a state cannot transition directly from "Predominantly Rural" to 
                "Highly Urbanized" without passing through intermediate categories. This constraint 
                ensures governance planning remains grounded in practical demographic patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}