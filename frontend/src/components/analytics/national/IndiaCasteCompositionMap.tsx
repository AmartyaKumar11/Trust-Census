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
// Source 1: Sovereign Outline (Full Claimed Territory including PoK/Aksai Chin)
const INDIA_SOVEREIGN_JSON = 'https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson';

// Source 2: Administrative States (For Data Binding)
const INDIA_STATES_JSON = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson';

interface IndiaCasteCompositionMapProps {
    stateCategories: Record<string, PolicyCategory>;
    selectedState: string | null;
    onStateClick: (stateName: string) => void;
}

export function IndiaCasteCompositionMap({ stateCategories, selectedState, onStateClick }: IndiaCasteCompositionMapProps) {
    const [mapScale, setMapScale] = React.useState(1100);

    const handleZoomIn = () => setMapScale(s => Math.min(s + 200, 2000));
    const handleZoomOut = () => setMapScale(s => Math.max(s - 200, 600));

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

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col space-y-1 z-10">
                <button
                    onClick={handleZoomIn}
                    className="w-6 h-6 flex items-center justify-center bg-white rounded border border-gray-200 shadow text-gray-600 hover:bg-gray-50 hover:text-navy-700 font-bold active:scale-95 transition-all text-xs"
                    title="Zoom In"
                >
                    +
                </button>
                <button
                    onClick={handleZoomOut}
                    className="w-6 h-6 flex items-center justify-center bg-white rounded border border-gray-200 shadow text-gray-600 hover:bg-gray-50 hover:text-navy-700 font-bold active:scale-95 transition-all text-xs"
                    title="Zoom Out"
                >
                    -
                </button>
            </div>

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: mapScale, // Slightly reduced to fit height
                    center: [78.96, 24] // Shifted North to include J&K
                }}
                className="w-full h-full"
            >
                {/* STRICT CONSTRAINT: No Zoom/Pan controls. Static View. */}

                {/* LAYER 1: Sovereign Base Layer (Neutral/Claimed Territory) */}
                {/* Renders full claimed territory (india-composite) as a neutral base. */}
                <Geographies geography={INDIA_SOVEREIGN_JSON}>
                    {({ geographies }) =>
                        geographies.map((geo) => (
                            <Geography
                                key={`base-${geo.rsmKey}`}
                                geography={geo}
                                fill="var(--color-charcoal-200)" // Neutral Gray for Base
                                stroke="var(--color-navy-200)"   // Outer sovereign border
                                strokeWidth={1}
                                style={{
                                    default: { outline: 'none' },
                                    hover: { outline: 'none' },
                                    pressed: { outline: 'none' }
                                }}
                            />
                        ))
                    }
                </Geographies>

                {/* LAYER 2: Policy Data Overlay (States) */}
                {/* Renders ALL states borders, but only fills those with data. */}
                <Geographies geography={INDIA_STATES_JSON}>
                    {({ geographies }) => {
                        return geographies.map((geo) => {
                            // Robust name matching
                            // console.log('Region Props:', geo.properties);
                            const stateName = geo.properties.name || geo.properties.NAME_1 || geo.properties.st_nm || 'Unknown';
                            const category = stateCategories[stateName];

                            const isInsufficient = !category || category === 'INSUFFICIENT_DATA';
                            const def = !isInsufficient ? CATEGORY_DEFINITIONS[category] : null;
                            const isSelected = selectedState === stateName;

                            return (
                                <Geography
                                    key={`data-${geo.rsmKey}`}
                                    geography={geo}
                                    onClick={() => onStateClick(stateName)}
                                    style={{
                                        default: {
                                            fill: isInsufficient ? 'transparent' : def?.color, // Reveal base if no data
                                            stroke: '#FFFFFF', // Internal borders always white
                                            strokeWidth: 0.5,
                                            outline: 'none',
                                            opacity: 1,
                                            transition: 'all 250ms'
                                        },
                                        hover: {
                                            fill: isInsufficient ? 'transparent' : def?.color,
                                            stroke: isInsufficient ? '#FFFFFF' : '#1a202c',
                                            strokeWidth: isInsufficient ? 1 : 1.5, // Slightly thicker on hover even for insufficient
                                            outline: 'none',
                                            opacity: 1,
                                            cursor: 'pointer' // Always pointer now
                                        },
                                        pressed: {
                                            fill: isInsufficient ? 'transparent' : def?.color,
                                            stroke: isInsufficient ? '#FFFFFF' : '#1a202c',
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
