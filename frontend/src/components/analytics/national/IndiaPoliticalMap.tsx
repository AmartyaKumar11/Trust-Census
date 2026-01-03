/**
 * India Political Map Component
 * Trust Census System - Privacy-First Policy Analytics
 * 
 * RESPONSIBILITY: Render India political map with urbanisation categories
 * 
 * MUST:
 * - Use SVG-based map rendering
 * - Color states by urban_category only
 * - Show Jammu & Kashmir + Ladakh as integral parts
 * - Provide click interaction for state selection
 * - Use government-appropriate color scheme
 * 
 * MUST NEVER:
 * - Show numeric legends or values
 * - Include gradients or animations
 * - Display district-level boundaries
 * - Allow data export from map
 */

import { useState } from 'react';
import { URBAN_CATEGORY_COLORS, URBAN_CATEGORY_DESCRIPTIONS } from '@/lib/policyData';
import type { PolicyAnalytics } from '@/lib/policyData';

interface IndiaPoliticalMapProps {
  policyData: PolicyAnalytics;
  selectedStateCode: string | null;
  onStateSelect: (stateCode: string) => void;
}

// Simplified India state boundaries (key states for demonstration)
// In production, this would use proper GeoJSON/TopoJSON data
const INDIA_STATES_PATHS = {
  // Major states with simplified SVG paths
  '27': { // Maharashtra
    name: 'MAHARASHTRA',
    path: 'M200,300 L280,300 L280,380 L200,380 Z'
  },
  '29': { // Karnataka  
    name: 'KARNATAKA',
    path: 'M200,380 L280,380 L280,450 L200,450 Z'
  },
  '33': { // Tamil Nadu
    name: 'TAMIL NADU', 
    path: 'M200,450 L280,450 L280,520 L200,520 Z'
  },
  '32': { // Kerala
    name: 'KERALA',
    path: 'M150,450 L200,450 L200,520 L150,520 Z'
  },
  '28': { // Andhra Pradesh
    name: 'ANDHRA PRADESH',
    path: 'M280,380 L360,380 L360,450 L280,450 Z'
  },
  '24': { // Gujarat
    name: 'GUJARAT',
    path: 'M100,250 L200,250 L200,330 L100,330 Z'
  },
  '08': { // Rajasthan
    name: 'RAJASTHAN',
    path: 'M100,150 L250,150 L250,250 L100,250 Z'
  },
  '23': { // Madhya Pradesh
    name: 'MADHYA PRADESH',
    path: 'M200,200 L350,200 L350,300 L200,300 Z'
  },
  '09': { // Uttar Pradesh
    name: 'UTTAR PRADESH',
    path: 'M250,100 L400,100 L400,200 L250,200 Z'
  },
  '19': { // West Bengal
    name: 'WEST BENGAL',
    path: 'M400,150 L480,150 L480,250 L400,250 Z'
  },
  '10': { // Bihar
    name: 'BIHAR',
    path: 'M350,100 L450,100 L450,150 L350,150 Z'
  },
  '07': { // Delhi
    name: 'NCT OF DELHI',
    path: 'M250,120 L270,120 L270,140 L250,140 Z'
  },
  '01': { // Jammu & Kashmir (including Ladakh)
    name: 'JAMMU  KASHMIR',
    path: 'M200,50 L350,50 L350,100 L200,100 Z'
  },
  // Add more states as needed
};

export function IndiaPoliticalMap({ 
  policyData, 
  selectedStateCode, 
  onStateSelect 
}: IndiaPoliticalMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const getStateColor = (stateCode: string): string => {
    const state = policyData.states[stateCode];
    if (!state) return URBAN_CATEGORY_COLORS['Insufficient Data'];
    return URBAN_CATEGORY_COLORS[state.urban_category];
  };

  const getStateOpacity = (stateCode: string): number => {
    if (selectedStateCode === stateCode) return 1;
    if (hoveredState === stateCode) return 0.8;
    return 0.7;
  };

  const handleStateClick = (stateCode: string) => {
    onStateSelect(stateCode);
  };

  return (
    <div className="w-full h-full flex flex-col">
      
      {/* Map Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <svg 
          viewBox="0 0 600 600" 
          className="w-full h-full max-w-lg max-h-96"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        >
          {/* Background */}
          <rect width="600" height="600" fill="#f8fafc" />
          
          {/* State Boundaries */}
          {Object.entries(INDIA_STATES_PATHS).map(([stateCode, stateInfo]) => {
            const state = policyData.states[stateCode];
            if (!state) return null;

            return (
              <g key={stateCode}>
                <path
                  d={stateInfo.path}
                  fill={getStateColor(stateCode)}
                  opacity={getStateOpacity(stateCode)}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200 hover:stroke-[var(--color-navy-600)]"
                  onMouseEnter={() => setHoveredState(stateCode)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => handleStateClick(stateCode)}
                />
                
                {/* State Labels (for major states) */}
                {(selectedStateCode === stateCode || hoveredState === stateCode) && (
                  <text
                    x={stateCode === '07' ? 260 : 240} // Adjust for Delhi
                    y={stateCode === '07' ? 135 : 
                      stateCode === '01' ? 80 :
                      stateCode === '09' ? 150 : 
                      stateCode === '27' ? 340 : 300}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-[var(--color-navy-900)]"
                    style={{ pointerEvents: 'none' }}
                  >
                    {state.state_name.length > 12 
                      ? state.state_name.substring(0, 12) + '...' 
                      : state.state_name}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Map Title */}
          <text
            x="300"
            y="30"
            textAnchor="middle"
            className="text-sm font-serif font-bold fill-[var(--color-navy-800)]"
          >
            Republic of India - Urbanisation Categories
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-[var(--color-cream-50)] rounded-lg border border-[var(--color-navy-100)]">
        <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-3">
          Urbanisation Categories
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(URBAN_CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border border-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-[var(--color-charcoal-700)]">
                {category}
              </span>
            </div>
          ))}
        </div>
        
        {/* Legend Note */}
        <p className="text-xs text-[var(--color-charcoal-600)] mt-3 italic">
          Categories based on Census 2011 data. Click states for detailed policy insights.
        </p>
      </div>

      {/* Interaction Hint */}
      {!selectedStateCode && (
        <div className="mt-2 text-center">
          <p className="text-xs text-[var(--color-charcoal-500)]">
            Click on any state to view policy analysis
          </p>
        </div>
      )}
    </div>
  );
}