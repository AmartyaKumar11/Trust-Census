/**
 * Simulation Safeguards Component
 * Trust Census System - Policy Simulation
 * 
 * RESPONSIBILITY: Display safeguards and interpretation notices
 * 
 * MUST:
 * - Clearly explain limitations of simulation
 * - Emphasize non-predictive nature
 * - Include constitutional context
 * - Use formal government language
 * 
 * MUST NEVER:
 * - Suggest this is forecasting
 * - Imply individual-level applicability
 * - Include disclaimers that could enable misuse
 */

import { Card } from '@/components/ui';

export function SimulationSafeguards() {
  return (
    <div className="space-y-6">
      
      {/* Main Safeguards Notice */}
      <Card className="bg-[var(--color-warning-50)] border-[var(--color-warning-200)] p-6">
        <div className="space-y-4">
          
          {/* Header */}
          <div className="text-center">
            <h3 className="font-serif text-lg font-bold text-[var(--color-warning-800)] mb-2">
              Safeguards & Interpretation Notice
            </h3>
            <p className="text-sm text-[var(--color-warning-700)]">
              Constitutional Framework for Policy Simulation Usage
            </p>
          </div>

          {/* Key Safeguards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* What This Is */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-[var(--color-warning-800)] text-sm">
                ✓ What This Simulation Provides
              </h4>
              <ul className="space-y-2 text-xs text-[var(--color-warning-700)]">
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-warning-600)]">•</span>
                  <span>Categorical scenario reasoning for macro-level governance planning</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-warning-600)]">•</span>
                  <span>Constitutional safeguard considerations for demographic transitions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-warning-600)]">•</span>
                  <span>Administrative preparedness guidance for policy implementation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-warning-600)]">•</span>
                  <span>Infrastructure and welfare delivery planning considerations</span>
                </li>
              </ul>
            </div>

            {/* What This Is NOT */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-[var(--color-error-800)] text-sm">
                ⚠ What This Simulation Does NOT Provide
              </h4>
              <ul className="space-y-2 text-xs text-[var(--color-error-700)]">
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-error-600)]">•</span>
                  <span>Predictions or forecasts of future demographic changes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-error-600)]">•</span>
                  <span>Individual, household, or community-level targeting guidance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-error-600)]">•</span>
                  <span>Resource allocation formulas or entitlement determinations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-[var(--color-error-600)]">•</span>
                  <span>Numeric projections, statistical modeling, or quantitative analysis</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Constitutional Framework */}
      <Card className="bg-[var(--color-navy-50)] border-[var(--color-navy-200)] p-6">
        <div className="flex items-start space-x-4">
          <div className="w-8 h-8 bg-[var(--color-navy-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <span className="text-white text-sm font-bold">⚖</span>
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="font-serif font-semibold text-[var(--color-navy-800)]">
              Constitutional Framework & Governance Principles
            </h4>
            <p className="text-sm text-[var(--color-charcoal-800)] leading-relaxed">
              All policy simulation scenarios are conducted under the constitutional framework 
              of the Republic of India, emphasizing principles of equality, non-discrimination, 
              dignity, and inclusive development. This tool supports evidence-based governance 
              planning that upholds fundamental rights and promotes social justice for all citizens.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="font-semibold text-sm text-[var(--color-navy-800)]">Article 14</div>
                <div className="text-xs text-[var(--color-charcoal-700)]">Equality before Law</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm text-[var(--color-navy-800)]">Article 15</div>
                <div className="text-xs text-[var(--color-charcoal-700)]">Non-Discrimination</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm text-[var(--color-navy-800)]">Article 21</div>
                <div className="text-xs text-[var(--color-charcoal-700)]">Right to Privacy</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Guidelines */}
      <Card className="bg-[var(--color-success-50)] border-[var(--color-success-200)] p-6">
        <div className="space-y-4">
          <h4 className="font-serif font-semibold text-[var(--color-success-800)]">
            Appropriate Usage Guidelines
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recommended Uses */}
            <div>
              <h5 className="font-semibold text-sm text-[var(--color-success-800)] mb-2">
                ✓ Recommended Uses
              </h5>
              <ul className="space-y-1 text-xs text-[var(--color-success-700)]">
                <li>• National governance capacity coordination planning</li>
                <li>• Constitutional framework preparedness assessment</li>
                <li>• Inter-state policy coordination scenario planning</li>
                <li>• Macro-level administrative structure preparedness</li>
                <li>• Constitutional safeguard implementation coordination</li>
              </ul>
            </div>

            {/* Prohibited Uses */}
            <div>
              <h5 className="font-semibold text-sm text-[var(--color-error-800)] mb-2">
                ❌ Prohibited Uses
              </h5>
              <ul className="space-y-1 text-xs text-[var(--color-error-700)]">
                <li>• Individual, community, or operational-level targeting</li>
                <li>• District-level or sub-state operational planning</li>
                <li>• Resource allocation or budget determination</li>
                <li>• Entitlement or eligibility criteria setting</li>
                <li>• Operational enforcement or intervention planning</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Methodology Transparency */}
      <Card className="bg-[var(--color-cream-100)] border-[var(--color-charcoal-200)] p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-[var(--color-charcoal-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">📋</span>
          </div>
          <div>
            <h5 className="font-serif font-semibold text-[var(--color-charcoal-800)] text-sm mb-1">
              Methodology Transparency
            </h5>
            <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
              This simulation uses deterministic, rule-based categorical reasoning derived from 
              established governance frameworks and constitutional principles. All policy implications 
              are pre-written templates based on administrative best practices. No artificial 
              intelligence, machine learning, or predictive algorithms are employed. The system 
              is fully auditable and explainable for democratic accountability.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}