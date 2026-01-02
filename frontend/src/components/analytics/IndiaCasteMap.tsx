/**
 * India Caste Map
 * 
 * CORE VISUAL for Central Policy Viewer.
 * 
 * MUST:
 * - Use static SVG (no external libraries)
 * - Show state boundaries only (NO districts)
 * - Use categorical coloring (4 fixed bands)
 * - Hover shows state name + text description only
 * - Click opens StateSummaryDrawer (NO navigation)
 * 
 * MUST NEVER:
 * - Show exact percentages on map
 * - Enable drill-down to districts
 * - Use numeric coloring
 * - Allow export
 */

'use client';

import { useState } from 'react';
import { StateSummaryDrawer } from './StateSummaryDrawer';

/**
 * State diversity categories (fixed, non-configurable)
 */
export type DiversityCategory =
    | 'highly-diverse'
    | 'sc-st-predominant'
    | 'obc-predominant'
    | 'mixed-composition';

interface StateData {
    code: string;
    name: string;
    category: DiversityCategory;
    description: string;
}

interface IndiaCasteMapProps {
    statesData: StateData[];
}

/**
 * Category colors (neutral, government-style)
 */
const CATEGORY_COLORS: Record<DiversityCategory, string> = {
    'highly-diverse': '#8B5CF6',      // Purple
    'sc-st-predominant': '#10B981',   // Green
    'obc-predominant': '#3B82F6',     // Blue
    'mixed-composition': '#6B7280',   // Gray
};

const CATEGORY_LABELS: Record<DiversityCategory, string> = {
    'highly-diverse': 'Highly Diverse',
    'sc-st-predominant': 'SC or ST Predominant',
    'obc-predominant': 'OBC Predominant',
    'mixed-composition': 'No Single Dominant Group',
};

export function IndiaCasteMap({ statesData }: IndiaCasteMapProps) {
    const [hoveredState, setHoveredState] = useState<string | null>(null);
    const [selectedState, setSelectedState] = useState<StateData | null>(null);

    const getStateData = (code: string): StateData | undefined => {
        return statesData.find(s => s.code === code);
    };

    const handleStateClick = (code: string) => {
        const state = getStateData(code);
        if (state) {
            setSelectedState(state);
        }
    };

    return (
        <div className="space-y-6">
            {/* Legend */}
            <div className="bg-[var(--color-cream-50)] rounded-lg p-4 border border-[var(--color-cream-200)]">
                <h3 className="text-sm font-semibold text-[var(--color-charcoal-700)] mb-3">
                    Diversity Categories
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(Object.entries(CATEGORY_LABELS) as [DiversityCategory, string][]).map(([category, label]) => (
                        <div key={category} className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded flex-shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[category] }}
                            />
                            <span className="text-xs text-[var(--color-charcoal-700)]">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-[var(--color-charcoal-500)] mt-3 italic">
                    Categories are determined by privacy-protected aggregates. Click a state for details.
                </p>
            </div>

            {/* Map Container */}
            <div className="bg-white rounded-lg border border-[var(--color-cream-200)] p-6">
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                    <svg
                        viewBox="0 0 800 900"
                        className="absolute inset-0 w-full h-full"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Simplified India map - Major states only */}
                        {/* This is a simplified representation for demonstration */}

                        {/* Maharashtra */}
                        <path
                            d="M 250 400 L 350 400 L 350 500 L 250 500 Z"
                            fill={CATEGORY_COLORS[getStateData('MH')?.category || 'mixed-composition']}
                            stroke="#fff"
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleStateClick('MH')}
                            onMouseEnter={() => setHoveredState('MH')}
                            onMouseLeave={() => setHoveredState(null)}
                        >
                            <title>Maharashtra</title>
                        </path>

                        {/* Karnataka */}
                        <path
                            d="M 250 500 L 350 500 L 350 600 L 250 600 Z"
                            fill={CATEGORY_COLORS[getStateData('KA')?.category || 'mixed-composition']}
                            stroke="#fff"
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleStateClick('KA')}
                            onMouseEnter={() => setHoveredState('KA')}
                            onMouseLeave={() => setHoveredState(null)}
                        >
                            <title>Karnataka</title>
                        </path>

                        {/* Tamil Nadu */}
                        <path
                            d="M 300 600 L 400 600 L 400 700 L 300 700 Z"
                            fill={CATEGORY_COLORS[getStateData('TN')?.category || 'mixed-composition']}
                            stroke="#fff"
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleStateClick('TN')}
                            onMouseEnter={() => setHoveredState('TN')}
                            onMouseLeave={() => setHoveredState(null)}
                        >
                            <title>Tamil Nadu</title>
                        </path>

                        {/* Add more states as needed - this is a simplified demo */}
                    </svg>

                    {/* Hover tooltip */}
                    {hoveredState && (
                        <div className="absolute top-4 left-4 bg-[var(--color-navy-800)] text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none">
                            <div className="font-semibold">{getStateData(hoveredState)?.name}</div>
                            <div className="text-xs opacity-90 mt-1">
                                {getStateData(hoveredState)?.description}
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-xs text-[var(--color-charcoal-400)] text-center mt-4 italic">
                    Simplified map for demonstration. Click states for detailed composition.
                </p>
            </div>

            {/* State Summary Drawer */}
            {selectedState && (
                <StateSummaryDrawer
                    state={selectedState}
                    onClose={() => setSelectedState(null)}
                />
            )}
        </div>
    );
}
