/**
 * National Policy Analytics Data Loader
 * Trust Census System - Privacy-First Policy Analytics
 * 
 * RESPONSIBILITY: Load and expose policy-grade categorical analytics
 * 
 * MUST:
 * - Fetch static JSON asset from public directory
 * - Provide typed interface for policy data
 * - Handle state code mapping between formats
 * - Enforce privacy constraints at type level
 * - Work offline (static asset)
 * 
 * MUST NEVER:
 * - Transform or aggregate data in UI
 * - Expose raw numeric values
 * - Make backend API calls for national analytics
 * - Allow district-level data access
 */

// Type definitions for policy-grade analytics
export interface PolicyMetadata {
  source: string;
  policy_scope: string;
  data_type: string;
  generated_at: string;
  privacy_notes: string[];
  governance_notes: string[];
  state_code_formats: {
    csv_format: string;
    database_format: string;
    mapping_included: string;
  };
}

export interface StateCodeMapping {
  numeric_to_alpha: Record<string, string>;
  alpha_to_numeric: Record<string, string>;
  description: string;
}

export interface StatePolicy {
  state_name: string;
  csv_code: string;
  database_code: string;
  urban_category: 'Highly Urbanized' | 'Moderately Urbanized' | 'Semi-Rural' | 'Predominantly Rural' | 'Insufficient Data';
  caste_category?: string; // Added for Caste Composition Map
  density_category: 'Very High Density' | 'High Density' | 'Medium Density' | 'Low Density';
  sex_ratio_interpretation: string;
  policy_interpretation: string;
  urban_data_available: boolean;
}

export interface NationalPatterns {
  predominant_urban_category: string;
  predominant_density_category: string;
  data_gaps_count: number;
  data_gaps_states: string[];
  summary_insights: string[];
}

export interface PolicyAnalytics {
  metadata: PolicyMetadata;
  state_code_mapping: StateCodeMapping;
  states: Record<string, StatePolicy>;
  national_patterns: NationalPatterns;
}

// Urban category color mapping for visualization
export const URBAN_CATEGORY_COLORS = {
  'Highly Urbanized': '#2c5530',      // Dark green
  'Moderately Urbanized': '#5a7c65',  // Medium green  
  'Semi-Rural': '#8ba888',            // Light green
  'Predominantly Rural': '#b8d4ba',   // Very light green
  'Insufficient Data': '#e5e7eb'      // Gray
} as const;

// Urban category descriptions for policy interpretation
export const URBAN_CATEGORY_DESCRIPTIONS = {
  'Highly Urbanized': 'Metropolitan regions with concentrated urban development',
  'Moderately Urbanized': 'Balanced urban-rural regions with growing urban centers',
  'Semi-Rural': 'Predominantly rural with emerging urban pockets',
  'Predominantly Rural': 'Rural regions with traditional settlement patterns',
  'Insufficient Data': 'Regions requiring enhanced data collection infrastructure'
} as const;

/**
 * Load national policy analytics from static JSON asset
 * 
 * This function fetches the pre-generated policy JSON file.
 * No backend API calls are made for national analytics.
 * Data works offline as it's a static public asset.
 */
export async function loadPolicyAnalytics(): Promise<PolicyAnalytics> {
  try {
    const response = await fetch('/data/india_state_policy_analytics.json');

    if (!response.ok) {
      throw new Error(`Failed to load policy data: ${response.status}`);
    }

    const data: PolicyAnalytics = await response.json();

    // Validate data structure
    if (!data.metadata || !data.states || !data.national_patterns || !data.state_code_mapping) {
      throw new Error('Invalid policy data structure');
    }

    return data;

  } catch (error) {
    console.error('Policy data loading failed:', error);
    throw new Error('Unable to load national policy analytics. Please ensure the data file is available.');
  }
}

/**
 * Get state policy data by state code (supports both formats)
 */
export function getStatePolicy(data: PolicyAnalytics, stateCode: string): StatePolicy | null {
  // Try direct lookup first (CSV numeric format)
  const normalizedCode = stateCode.padStart(2, '0');
  let state = data.states[normalizedCode];

  if (state) {
    return state;
  }

  // Try reverse lookup (database alphabetic format)
  const numericCode = data.state_code_mapping.alpha_to_numeric[stateCode.toUpperCase()];
  if (numericCode) {
    return data.states[numericCode] || null;
  }

  return null;
}

/**
 * Convert CSV numeric code to database alphabetic code
 */
export function csvToDatabase(data: PolicyAnalytics, csvCode: string): string | null {
  const normalizedCode = csvCode.padStart(2, '0');
  return data.state_code_mapping.numeric_to_alpha[normalizedCode] || null;
}

/**
 * Convert database alphabetic code to CSV numeric code
 */
export function databaseToCsv(data: PolicyAnalytics, databaseCode: string): string | null {
  return data.state_code_mapping.alpha_to_numeric[databaseCode.toUpperCase()] || null;
}

/**
 * Get states by urban category for analysis
 */
export function getStatesByUrbanCategory(data: PolicyAnalytics): Record<string, StatePolicy[]> {
  const categorized: Record<string, StatePolicy[]> = {};

  Object.values(data.states).forEach(state => {
    const category = state.urban_category;
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(state);
  });

  return categorized;
}

/**
 * Get data coverage summary for governance reporting
 */
export function getDataCoverageSummary(data: PolicyAnalytics): {
  total_states: number;
  complete_data: number;
  data_gaps: number;
  coverage_percentage: string;
} {
  const totalStates = Object.keys(data.states).length;
  const dataGaps = data.national_patterns.data_gaps_count;
  const completeData = totalStates - dataGaps;
  const coveragePercentage = ((completeData / totalStates) * 100).toFixed(0);

  return {
    total_states: totalStates,
    complete_data: completeData,
    data_gaps: dataGaps,
    coverage_percentage: `${coveragePercentage}%`
  };
}

/**
 * Validate that data meets privacy constraints
 * This function ensures no raw numeric data is exposed in UI
 */
export function validatePrivacyConstraints(data: PolicyAnalytics): boolean {
  // Check that no raw percentages are in the data
  const stateEntries = Object.values(data.states);

  for (const state of stateEntries) {
    // Ensure only categorical data is present
    if (typeof state.urban_category !== 'string' ||
      typeof state.density_category !== 'string' ||
      typeof state.sex_ratio_interpretation !== 'string' ||
      typeof state.policy_interpretation !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Get policy summary for national overview
 */
export function getNationalPolicySummary(data: PolicyAnalytics): {
  title: string;
  insights: string[];
  data_status: string;
} {
  const patterns = data.national_patterns;

  return {
    title: 'National Urbanisation & Demographic Policy Overview',
    insights: patterns.summary_insights,
    data_status: patterns.data_gaps_count > 0
      ? `Data collection priorities identified in ${patterns.data_gaps_count} regions`
      : 'Complete national data coverage achieved'
  };
}

/**
 * Get state code mapping information for debugging/integration
 */
export function getStateCodeMappingInfo(data: PolicyAnalytics): {
  total_mappings: number;
  sample_mappings: Array<{ csv: string, database: string, state_name: string }>;
  mapping_description: string;
} {
  const sampleStates = ['27', '33', '29', '01']; // MH, TN, KA, JK
  const sampleMappings = sampleStates.map(csvCode => {
    const state = data.states[csvCode];
    return {
      csv: csvCode,
      database: state?.database_code || 'UNKNOWN',
      state_name: state?.state_name || 'UNKNOWN'
    };
  }).filter(mapping => mapping.database !== 'UNKNOWN');

  return {
    total_mappings: Object.keys(data.state_code_mapping.numeric_to_alpha).length,
    sample_mappings: sampleMappings,
    mapping_description: data.state_code_mapping.description
  };
}