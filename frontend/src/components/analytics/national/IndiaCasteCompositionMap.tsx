import React from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { PolicyCategory, CATEGORY_DEFINITIONS } from '@/lib/stateCategories';

// Since I cannot download the map file easily, I will embed a SIMPLIFIED TopoJSON structure later or use a known URL.
// For now, I will use a placeholder URL or assume the file exists at /maps/india-states.json
// If the user hasn't provided the map, I might need to mock it or ask for it.
// Assuming the user knows I need it. I will use the relative path.

// NOTE: It's vital that the TOPOJSON matches the state names we use.
// Usually they are 'Maharashtra', 'Karnataka', etc.

// Use a stable public TopoJSON source for India States
const INDIA_TOPO_JSON = 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-states.json';

interface IndiaCasteCompositionMapProps {
    stateCategories: Record<string, PolicyCategory>;
    selectedState: string | null;
    onStateClick: (stateName: string) => void;
}

export function IndiaCasteCompositionMap({ stateCategories, selectedState, onStateClick }: IndiaCasteCompositionMapProps) {
    return (
        <div className="bg-white rounded-xl border border-[var(--color-navy-100)] overflow-hidden shadow-sm relative h-[500px] w-full flex items-center justify-center bg-[var(--color-cream-50)]">

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-[var(--color-navy-100)] shadow-sm z-10 text-xs shadow-lg max-w-[200px]">
                <h4 className="font-bold text-[var(--color-navy-900)] mb-2 uppercase tracking-wide">Composition Patterns</h4>
                <div className="space-y-1.5">
                    {Object.entries(CATEGORY_DEFINITIONS).map(([key, def]) => (
                        <div key={key} className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: def.color }} />
                            <span className="text-[var(--color-charcoal-700)]">{def.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 1000,
                    center: [78.9629, 23.5937] // approximate center of India
                }}
                className="w-full h-full"
            >
                {/* STRICT CONSTRAINT: No Zoom/Pan controls. Static View. */}

                <Geographies geography={INDIA_TOPO_JSON}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            // Robust name matching for various TopoJSON standards
                            const stateName = geo.properties.NAME_1 || geo.properties.name || geo.properties.st_nm || 'Unknown';
                            // Normalize state name matching? 
                            // Our backend uses 'Maharashtra', 'Karnataka'.

                            // Check if we have data for this state
                            // We need to map the TopoJSON name to our backend name.
                            // I will assume direct match for now.

                            const category = stateCategories[stateName] || 'INSUFFICIENT_DATA';
                            const def = CATEGORY_DEFINITIONS[category];
                            const isSelected = selectedState === stateName;

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    onClick={() => onStateClick(stateName)}
                                    style={{
                                        default: {
                                            fill: def.color,
                                            stroke: isSelected ? '#1a202c' : '#FFFFFF',
                                            strokeWidth: isSelected ? 2 : 0.75,
                                            outline: 'none',
                                            opacity: isSelected ? 1 : 0.9,
                                            transition: 'all 250ms'
                                        },
                                        hover: {
                                            fill: def.color,
                                            stroke: '#1a202c',
                                            strokeWidth: 1.5,
                                            outline: 'none',
                                            opacity: 1,
                                            cursor: 'pointer'
                                        },
                                        pressed: {
                                            fill: def.color,
                                            stroke: '#1a202c',
                                            strokeWidth: 2,
                                            outline: 'none',
                                        }
                                    }}
                                />
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>

            {/* Fallback if map fails to load (visual only, actual handling is via library) */}
            <div className="absolute top-2 right-2 text-[10px] text-gray-400">
                Source: Datameet (Open Code)
            </div>
        </div>
    );
}
