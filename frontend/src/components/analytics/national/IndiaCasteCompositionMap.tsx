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
// Use GeoHacker GeoJSON (Standard Lat/Long) - Proven D3 Compatible
const INDIA_TOPO_JSON = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson';

interface IndiaCasteCompositionMapProps {
    stateCategories: Record<string, PolicyCategory>;
    selectedState: string | null;
    onStateClick: (stateName: string) => void;
}

export function IndiaCasteCompositionMap({ stateCategories, selectedState, onStateClick }: IndiaCasteCompositionMapProps) {
    return (
        <div className="bg-white rounded-xl border border-[var(--color-navy-100)] overflow-hidden shadow-sm relative h-[500px] w-full flex items-center justify-center bg-[var(--color-cream-50)]">

            {/* Legend Overlay */}
            {/* Legend Overlay - Ultra Compact */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg border border-[var(--color-navy-100)] shadow-sm z-10 shadow-md w-auto min-w-[120px]">
                <h4 className="font-bold text-[var(--color-navy-900)] mb-1 text-[9px] uppercase tracking-wider opacity-80">Composition Patterns</h4>
                <div className="space-y-1">
                    {Object.entries(CATEGORY_DEFINITIONS).map(([key, def]) => (
                        <div key={key} className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def.color }} />
                            <span className="text-[8px] font-medium text-[var(--color-charcoal-600)] uppercase tracking-wide">{def.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 1000,
                    center: [78.9629, 23.5937]
                }}
                className="w-full h-full"
            >
                {/* STRICT CONSTRAINT: No Zoom/Pan controls. Static View. */}

                {/* LAYER 1: Sovereign Base Layer (Neutral/Claimed Territory) */}
                {/* Renders full claimed territory as a neutral base to ensure no region is omitted, regardless of data availability. */}
                <Geographies geography={INDIA_TOPO_JSON}>
                    {({ geographies }) =>
                        geographies.map((geo) => (
                            <Geography
                                key={`base-${geo.rsmKey}`}
                                geography={geo}
                                fill="var(--color-charcoal-200)" // Neutral Gray for Insufficient Data/Base
                                stroke="var(--color-navy-200)"   // Subtle border for base
                                strokeWidth={0.5}
                                style={{
                                    default: { outline: 'none' },
                                    hover: { outline: 'none' }, // Base layer specific hover disabled/neutral?
                                    pressed: { outline: 'none' }
                                }}
                            // No interaction on base layer
                            />
                        ))
                    }
                </Geographies>

                {/* LAYER 2: Policy Data Overlay */}
                {/* Only renders states where categorization exists. Holes reveal the base layer. */}
                <Geographies geography={INDIA_TOPO_JSON}>
                    {({ geographies }) => {
                        return geographies.map((geo) => {
                            // Robust name matching
                            // console.log('Region Props:', geo.properties); 
                            const stateName = geo.properties.name || geo.properties.NAME_1 || geo.properties.st_nm || 'Unknown';

                            const category = stateCategories[stateName];

                            // FILTER: Only render if data exists. If undefined (Insufficient), skip to reveal Base Layer.
                            if (!category || category === 'INSUFFICIENT_DATA') return null;

                            const def = CATEGORY_DEFINITIONS[category];
                            const isSelected = selectedState === stateName;

                            return (
                                <Geography
                                    key={`data-${geo.rsmKey}`}
                                    geography={geo}
                                    onClick={() => onStateClick(stateName)}
                                    style={{
                                        default: {
                                            fill: def.color,
                                            stroke: isSelected ? '#1a202c' : '#FFFFFF',
                                            strokeWidth: isSelected ? 2 : 1, // Distinct admin borders
                                            outline: 'none',
                                            opacity: isSelected ? 1 : 0.95, // Slight transparency to blend? No, solid.
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
                        });
                    }}
                </Geographies>
            </ComposableMap>

            {/* Explanatory Note / Source */}
            <div className="absolute top-2 right-2 text-right">
                <div className="text-[9px] text-[var(--color-charcoal-500)] bg-white/50 backdrop-blur-sm px-1.5 py-0.5 rounded leading-tight">
                    Map outlines reflect sovereign claims.<br />Analytics reflect data availability.
                </div>
                <div className="text-[8px] text-gray-400 mt-0.5">
                    Source: Datameet (Open Code)
                </div>
            </div>
        </div >
    );
}
