/**
 * Policy Simulation Context Banner
 * Trust Census System - Categorical Scenario Reasoning
 * 
 * RESPONSIBILITY: Explain the purpose and limitations of policy simulation
 * 
 * MUST:
 * - Clearly explain this is categorical scenario reasoning
 * - Emphasize non-predictive nature
 * - Use government report tone
 * - Include constitutional context
 * 
 * MUST NEVER:
 * - Suggest this is forecasting or prediction
 * - Imply numeric accuracy
 * - Reference individual-level implications
 */

import { Card } from '@/components/ui';

export function PolicySimulationContextBanner() {
  return (
    <Card className="bg-[var(--color-gold-50)] border-[var(--color-gold-200)] p-6">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="font-serif text-xl font-bold text-[var(--color-navy-900)] mb-2">
            Policy Simulation: Categorical Scenario Reasoning
          </h2>
          <p className="text-sm text-[var(--color-charcoal-700)]">
            Constitutional Framework for Governance Planning • Non-Predictive Analysis Tool
          </p>
        </div>

        {/* Purpose Statement */}
        <div className="bg-white rounded-lg p-4 border border-[var(--color-gold-200)]">
          <h3 className="font-serif font-semibold text-[var(--color-navy-800)] mb-3">
            Purpose & Scope
          </h3>
          <p className="text-sm text-[var(--color-charcoal-800)] leading-relaxed mb-3">
            This simulation tool allows national policymakers to explore governance implications of 
            hypothetical demographic pattern shifts at the macro level. All scenarios are categorical 
            and non-predictive, designed to support constitutional governance planning and 
            inter-state coordination frameworks.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-semibold text-[var(--color-navy-800)]">Methodology:</span>
              <span className="text-[var(--color-charcoal-700)]"> Categorical transition analysis</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--color-navy-800)]">Scope:</span>
              <span className="text-[var(--color-charcoal-700)]"> National policy coordination</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--color-navy-800)]">Framework:</span>
              <span className="text-[var(--color-charcoal-700)]"> Constitutional compliance</span>
            </div>
          </div>
        </div>

        {/* Key Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* What This Tool Does */}
          <div className="bg-[var(--color-success-50)] border border-[var(--color-success-200)] rounded-lg p-4">
            <h4 className="font-serif font-semibold text-[var(--color-success-800)] mb-2 text-sm">
              ✓ What This Tool Provides
            </h4>
            <ul className="space-y-1 text-xs text-[var(--color-success-700)]">
              <li>• National-level categorical scenario reasoning</li>
              <li>• Constitutional governance implication analysis</li>
              <li>• Inter-state coordination preparedness guidance</li>
              <li>• Macro-level administrative framework planning</li>
            </ul>
          </div>

          {/* What This Tool Does NOT Do */}
          <div className="bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-lg p-4">
            <h4 className="font-serif font-semibold text-[var(--color-warning-800)] mb-2 text-sm">
              ⚠ What This Tool Does NOT Provide
            </h4>
            <ul className="space-y-1 text-xs text-[var(--color-warning-700)]">
              <li>• Predictions or forecasts of demographic changes</li>
              <li>• Individual, community, or operational-level guidance</li>
              <li>• Resource allocation or entitlement determinations</li>
              <li>• District-level or sub-state operational context</li>
            </ul>
          </div>
        </div>

        {/* Constitutional Context */}
        <div className="border-t border-[var(--color-gold-200)] pt-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-[var(--color-navy-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">⚖</span>
            </div>
            <div>
              <h4 className="font-serif font-semibold text-[var(--color-navy-800)] text-sm mb-1">
                Constitutional Framework
              </h4>
              <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                All scenario reasoning is conducted under constitutional principles of equality, 
                non-discrimination, and dignity. This tool supports governance planning that 
                upholds fundamental rights and promotes inclusive development for all citizens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}