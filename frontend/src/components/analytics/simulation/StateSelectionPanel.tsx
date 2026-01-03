/**
 * State Selection Panel
 * Trust Census System - Policy Simulation
 * 
 * RESPONSIBILITY: Allow selection of a single state for simulation
 * 
 * MUST:
 * - Provide dropdown selection of states from JSON data
 * - Show only states with sufficient data for simulation
 * - Use clear, accessible interface
 * - Default to no selection
 * 
 * MUST NEVER:
 * - Allow multi-select
 * - Show states without sufficient data
 * - Include district or sub-state options
 */

import { Card } from '@/components/ui';
import type { PolicyAnalytics } from '@/lib/policyData';

interface StateSelectionPanelProps {
  policyData: PolicyAnalytics;
  selectedStateCode: string | null;
  onStateSelect: (stateCode: string | null) => void;
}

export function StateSelectionPanel({ 
  policyData, 
  selectedStateCode, 
  onStateSelect 
}: StateSelectionPanelProps) {
  
  // Get states suitable for simulation (those with sufficient data)
  const getSimulationReadyStates = () => {
    return Object.entries(policyData.states)
      .filter(([_, state]) => {
        // Only include states with sufficient data for simulation
        return state.urban_category !== 'Insufficient Data' && 
               state.urban_data_available;
      })
      .sort(([_, a], [__, b]) => a.state_name.localeCompare(b.state_name));
  };

  const simulationReadyStates = getSimulationReadyStates();
  const selectedState = selectedStateCode ? policyData.states[selectedStateCode] : null;

  return (
    <Card className="bg-white border-[var(--color-navy-100)] p-6">
      <div className="space-y-4">
        
        {/* Section Header */}
        <div>
          <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-2">
            State Selection for National Policy Coordination
          </h3>
          <p className="text-sm text-[var(--color-charcoal-600)]">
            Select a state or union territory for national-level policy scenario analysis. 
            This tool provides macro-level governance implications for constitutional coordination 
            and inter-state policy framework development.
          </p>
        </div>

        {/* State Selection Dropdown */}
        <div className="space-y-3">
          <label 
            htmlFor="state-select" 
            className="block font-semibold text-sm text-[var(--color-navy-800)]"
          >
            State/Union Territory
          </label>
          
          <select
            id="state-select"
            value={selectedStateCode || ''}
            onChange={(e) => onStateSelect(e.target.value || null)}
            className="w-full max-w-md px-3 py-2 border border-[var(--color-navy-200)] rounded-lg 
                     bg-white text-[var(--color-charcoal-800)] focus:outline-none 
                     focus:ring-2 focus:ring-[var(--color-navy-500)] focus:border-transparent"
          >
            <option value="">-- Select a State/UT for Simulation --</option>
            {simulationReadyStates.map(([stateCode, state]) => (
              <option key={stateCode} value={stateCode}>
                {state.state_name}
              </option>
            ))}
          </select>
        </div>

        {/* Selection Status */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-navy-100)]">
          <div className="text-sm text-[var(--color-charcoal-600)]">
            {selectedState ? (
              <span>
                <span className="font-semibold text-[var(--color-navy-800)]">Selected:</span> {selectedState.state_name}
              </span>
            ) : (
              <span>No state selected</span>
            )}
          </div>
          
          <div className="text-xs text-[var(--color-charcoal-500)]">
            {simulationReadyStates.length} of {Object.keys(policyData.states).length} states available for simulation
          </div>
        </div>

        {/* Data Availability Notice */}
        {Object.keys(policyData.states).length > simulationReadyStates.length && (
          <div className="bg-[var(--color-warning-50)] border border-[var(--color-warning-200)] rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 bg-[var(--color-warning-500)] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-[var(--color-warning-800)] mb-1">
                  Data Availability Notice
                </h4>
                <p className="text-xs text-[var(--color-warning-700)] leading-relaxed">
                  Some states are not available for simulation due to insufficient data. 
                  Policy simulation requires complete categorical data for reliable scenario reasoning.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}