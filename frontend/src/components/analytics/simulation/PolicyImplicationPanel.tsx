/**
 * Policy Implication Panel Component
 * Trust Census System - Policy Simulation
 * 
 * RESPONSIBILITY: Display policy implications for selected transitions
 * 
 * MUST:
 * - Show structured policy briefs for each transition
 * - Use prewritten, deterministic templates
 * - Include constitutional safeguards
 * - Present in government report format
 * 
 * MUST NEVER:
 * - Generate dynamic text or use AI/ML
 * - Include numeric projections
 * - Suggest individual-level targeting
 * - Provide resource allocation specifics
 */

import { Card } from '@/components/ui';
import { getPolicyImplications, DIMENSION_LABELS } from '@/lib/policySimulationRules';
import type { StatePolicy } from '@/lib/policyData';

interface PolicyImplicationPanelProps {
  stateData: StatePolicy;
  simulationScenario: Record<string, string | undefined>;
}

export function PolicyImplicationPanel({ 
  stateData, 
  simulationScenario 
}: PolicyImplicationPanelProps) {
  
  // Map state data to current categories
  const currentCategories = {
    urbanisation: stateData.urban_category,
    density: stateData.density_category,
    sex_ratio: stateData.sex_ratio_interpretation
  };

  // Get policy implications for each selected transition
  const getTransitionImplications = () => {
    const implications = [];
    
    Object.entries(simulationScenario).forEach(([dimension, targetCategory]) => {
      if (targetCategory) {
        const currentCategory = currentCategories[dimension as keyof typeof currentCategories];
        const policyImplication = getPolicyImplications(dimension, currentCategory, targetCategory);
        
        if (policyImplication) {
          implications.push({
            dimension,
            from: currentCategory,
            to: targetCategory,
            implications: policyImplication
          });
        }
      }
    });
    
    return implications;
  };

  const transitionImplications = getTransitionImplications();

  if (transitionImplications.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border-[var(--color-navy-100)] p-6">
      <div className="space-y-6">
        
        {/* Section Header */}
        <div className="border-b border-[var(--color-navy-100)] pb-4">
          <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-2">
            Policy Implication Analysis
          </h3>
          <p className="text-sm text-[var(--color-charcoal-600)]">
            Governance considerations for selected categorical transitions in {stateData.state_name}
          </p>
        </div>

        {/* Transition Implications */}
        <div className="space-y-8">
          {transitionImplications.map((transition, index) => (
            <div key={index} className="space-y-4">
              
              {/* Transition Header */}
              <div className="bg-[var(--color-gold-50)] border border-[var(--color-gold-200)] rounded-lg p-4">
                <h4 className="font-serif font-semibold text-[var(--color-navy-800)] mb-1">
                  {DIMENSION_LABELS[transition.dimension as keyof typeof DIMENSION_LABELS]} Transition
                </h4>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-[var(--color-charcoal-700)]">{transition.from}</span>
                  <span className="text-[var(--color-gold-600)]">→</span>
                  <span className="font-semibold text-[var(--color-navy-800)]">{transition.to}</span>
                </div>
              </div>

              {/* Policy Implications Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Governance Pressures */}
                <div className="bg-[var(--color-navy-50)] border border-[var(--color-navy-200)] rounded-lg p-4">
                  <h5 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm mb-3">
                    Governance Pressures
                  </h5>
                  <ul className="space-y-2">
                    {transition.implications.governance_pressures.map((pressure, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-[var(--color-navy-500)] rounded-full mt-2 flex-shrink-0" />
                        <span className="text-xs text-[var(--color-charcoal-800)] leading-relaxed">
                          {pressure}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Administrative Implications */}
                <div className="bg-[var(--color-success-50)] border border-[var(--color-success-200)] rounded-lg p-4">
                  <h5 className="font-serif font-semibold text-[var(--color-success-800)] text-sm mb-3">
                    Administrative Implications
                  </h5>
                  <ul className="space-y-2">
                    {transition.implications.administrative_implications.map((implication, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-[var(--color-success-500)] rounded-full mt-2 flex-shrink-0" />
                        <span className="text-xs text-[var(--color-charcoal-800)] leading-relaxed">
                          {implication}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Infrastructure Considerations */}
                <div className="bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-lg p-4">
                  <h5 className="font-serif font-semibold text-[var(--color-warning-800)] text-sm mb-3">
                    Infrastructure Considerations
                  </h5>
                  <ul className="space-y-2">
                    {transition.implications.infrastructure_considerations.map((consideration, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-[var(--color-warning-500)] rounded-full mt-2 flex-shrink-0" />
                        <span className="text-xs text-[var(--color-charcoal-800)] leading-relaxed">
                          {consideration}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Welfare Delivery Shifts */}
                <div className="bg-[var(--color-charcoal-50)] border border-[var(--color-charcoal-200)] rounded-lg p-4">
                  <h5 className="font-serif font-semibold text-[var(--color-charcoal-800)] text-sm mb-3">
                    Welfare Delivery Shifts
                  </h5>
                  <ul className="space-y-2">
                    {transition.implications.welfare_delivery_shifts.map((shift, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-[var(--color-charcoal-500)] rounded-full mt-2 flex-shrink-0" />
                        <span className="text-xs text-[var(--color-charcoal-800)] leading-relaxed">
                          {shift}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Constitutional Safeguards */}
              <div className="bg-[var(--color-gold-50)] border border-[var(--color-gold-200)] rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 bg-[var(--color-gold-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">⚖</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-serif font-semibold text-[var(--color-gold-800)] text-sm mb-2">
                      Constitutional Safeguards
                    </h5>
                    <ul className="space-y-1">
                      {transition.implications.constitutional_safeguards.map((safeguard, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-[var(--color-gold-600)] rounded-full mt-2 flex-shrink-0" />
                          <span className="text-xs text-[var(--color-charcoal-800)] leading-relaxed">
                            {safeguard}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Summary */}
        <div className="bg-[var(--color-cream-100)] border border-[var(--color-navy-200)] rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-[var(--color-navy-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">📋</span>
            </div>
            <div>
              <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm mb-1">
                Policy Planning Summary
              </h4>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                This analysis provides categorical scenario reasoning for governance planning in {stateData.state_name}. 
                All implications are derived from established policy frameworks and constitutional principles. 
                Implementation should be adapted to local contexts while maintaining constitutional safeguards 
                and inclusive development principles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}