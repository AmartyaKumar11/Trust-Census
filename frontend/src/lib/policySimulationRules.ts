/**
 * Policy Simulation Rules Engine
 * Trust Census System - Privacy-First Categorical Scenario Reasoning
 * 
 * RESPONSIBILITY: Static, deterministic policy implication mapping
 * 
 * MUST:
 * - Provide categorical transition rules only
 * - Map transitions to predefined policy implications
 * - Remain completely deterministic and auditable
 * - Support only adjacent logical transitions
 * 
 * MUST NEVER:
 * - Include numeric calculations or predictions
 * - Generate dynamic text or use ML/AI
 * - Allow arbitrary transitions
 * - Include individual-level implications
 */

// Valid category transitions (only adjacent logical transitions allowed)
export const VALID_TRANSITIONS = {
  urbanisation: {
    'Predominantly Rural': ['Semi-Rural'],
    'Semi-Rural': ['Predominantly Rural', 'Moderately Urbanized'],
    'Moderately Urbanized': ['Semi-Rural', 'Highly Urbanized'],
    'Highly Urbanized': ['Moderately Urbanized'],
    'Insufficient Data': [] // Cannot simulate without data
  },
  density: {
    'Low Density': ['Medium Density'],
    'Medium Density': ['Low Density', 'High Density'],
    'High Density': ['Medium Density', 'Very High Density'],
    'Very High Density': ['High Density']
  },
  sex_ratio: {
    'Significantly below average': ['Below national average'],
    'Below national average': ['Significantly below average', 'Near national average'],
    'Near national average': ['Below national average', 'Above national average'],
    'Above national average': ['Near national average']
  }
} as const;

// Policy implication templates for each transition
export interface PolicyImplication {
  governance_pressures: string[];
  administrative_implications: string[];
  infrastructure_considerations: string[];
  welfare_delivery_shifts: string[];
  constitutional_safeguards: string[];
}

export const POLICY_IMPLICATIONS: Record<string, PolicyImplication> = {
  // Urbanisation Transitions
  'urbanisation_Predominantly Rural_to_Semi-Rural': {
    governance_pressures: [
      'Increased demand for urban-style governance structures',
      'Need for enhanced administrative capacity in emerging urban centers',
      'Pressure for improved connectivity between rural and urban areas'
    ],
    administrative_implications: [
      'Establishment of intermediate administrative units',
      'Training of personnel for mixed urban-rural governance',
      'Development of hybrid service delivery models'
    ],
    infrastructure_considerations: [
      'Expansion of transportation networks',
      'Upgrading of communication infrastructure',
      'Development of intermediate-scale utilities'
    ],
    welfare_delivery_shifts: [
      'Adaptation of rural welfare schemes for semi-urban contexts',
      'Introduction of urban-style service delivery mechanisms',
      'Enhanced focus on livelihood diversification programs'
    ],
    constitutional_safeguards: [
      'Ensure equitable resource allocation during transition',
      'Maintain constitutional protections for all demographic groups',
      'Preserve traditional governance structures where appropriate'
    ]
  },

  'urbanisation_Semi-Rural_to_Moderately Urbanized': {
    governance_pressures: [
      'Demand for comprehensive urban governance frameworks',
      'Need for metropolitan-style administrative coordination',
      'Pressure for enhanced civic amenities and services'
    ],
    administrative_implications: [
      'Establishment of urban local bodies with expanded mandates',
      'Integration of multiple administrative jurisdictions',
      'Development of professional urban management capabilities'
    ],
    infrastructure_considerations: [
      'Large-scale urban infrastructure development',
      'Integration of transport, water, and waste management systems',
      'Development of smart city infrastructure components'
    ],
    welfare_delivery_shifts: [
      'Transition to urban-focused welfare delivery mechanisms',
      'Enhanced emphasis on skill development and employment services',
      'Development of urban poverty alleviation programs'
    ],
    constitutional_safeguards: [
      'Ensure inclusive urban development without displacement',
      'Maintain access to constitutional rights during urbanization',
      'Protect vulnerable populations during demographic transitions'
    ]
  },

  'urbanisation_Moderately Urbanized_to_Highly Urbanized': {
    governance_pressures: [
      'Need for metropolitan governance structures',
      'Demand for specialized urban management expertise',
      'Pressure for regional coordination mechanisms'
    ],
    administrative_implications: [
      'Establishment of metropolitan administrative authorities',
      'Development of inter-jurisdictional coordination mechanisms',
      'Creation of specialized urban service departments'
    ],
    infrastructure_considerations: [
      'Development of metropolitan-scale infrastructure',
      'Integration of regional transport and utility networks',
      'Implementation of sustainable urban development practices'
    ],
    welfare_delivery_shifts: [
      'Focus on urban poverty and inequality management',
      'Development of metropolitan-scale social services',
      'Enhanced emphasis on environmental and health services'
    ],
    constitutional_safeguards: [
      'Ensure equitable access to urban services for all groups',
      'Maintain constitutional protections in high-density environments',
      'Prevent discrimination in urban service delivery'
    ]
  },

  // Density Transitions
  'density_Low Density_to_Medium Density': {
    governance_pressures: [
      'Increased demand for coordinated regional planning',
      'Need for enhanced inter-district administrative coordination',
      'Pressure for improved resource allocation mechanisms'
    ],
    administrative_implications: [
      'Strengthening of regional administrative structures',
      'Development of multi-district coordination mechanisms',
      'Enhanced capacity for population-responsive governance'
    ],
    infrastructure_considerations: [
      'Scaling up of infrastructure to serve increased population density',
      'Development of efficient resource distribution networks',
      'Enhancement of transportation connectivity'
    ],
    welfare_delivery_shifts: [
      'Optimization of service delivery for medium-density populations',
      'Development of scalable welfare program models',
      'Enhanced focus on community-based service delivery'
    ],
    constitutional_safeguards: [
      'Ensure proportional representation in increased density contexts',
      'Maintain equitable resource distribution',
      'Protect minority rights in changing demographic contexts'
    ]
  },

  'density_Medium Density_to_High Density': {
    governance_pressures: [
      'Need for intensive administrative management',
      'Demand for specialized high-density governance expertise',
      'Pressure for efficient resource utilization mechanisms'
    ],
    administrative_implications: [
      'Development of high-capacity administrative systems',
      'Implementation of technology-enabled governance solutions',
      'Creation of specialized population management units'
    ],
    infrastructure_considerations: [
      'Development of high-capacity infrastructure systems',
      'Implementation of efficient resource management technologies',
      'Creation of sustainable high-density living environments'
    ],
    welfare_delivery_shifts: [
      'Optimization of welfare delivery for high-density populations',
      'Development of technology-enabled service delivery',
      'Enhanced focus on community resilience and social cohesion'
    ],
    constitutional_safeguards: [
      'Ensure adequate representation in high-density constituencies',
      'Maintain quality of constitutional rights delivery',
      'Prevent overcrowding-related discrimination'
    ]
  },

  // Sex Ratio Transitions
  'sex_ratio_Significantly below average_to_Below national average': {
    governance_pressures: [
      'Continued focus on gender equality initiatives',
      'Need for sustained policy intervention',
      'Pressure for comprehensive social reform programs'
    ],
    administrative_implications: [
      'Strengthening of gender-focused administrative units',
      'Enhanced monitoring of gender equality programs',
      'Development of gender-responsive governance practices'
    ],
    infrastructure_considerations: [
      'Continued development of gender-inclusive infrastructure',
      'Enhancement of safety and security infrastructure',
      'Development of women-friendly public spaces'
    ],
    welfare_delivery_shifts: [
      'Sustained focus on women and child welfare programs',
      'Enhanced emphasis on gender equality in service delivery',
      'Continued implementation of protective social measures'
    ],
    constitutional_safeguards: [
      'Maintain constitutional protections for gender equality',
      'Ensure non-discrimination in all government services',
      'Protect women\'s constitutional rights and freedoms'
    ]
  },

  'sex_ratio_Below national average_to_Near national average': {
    governance_pressures: [
      'Transition to balanced gender-responsive governance',
      'Need for sustained but optimized policy interventions',
      'Focus on maintaining achieved gender balance'
    ],
    administrative_implications: [
      'Optimization of gender-focused administrative structures',
      'Integration of gender considerations into mainstream governance',
      'Development of balanced gender representation in administration'
    ],
    infrastructure_considerations: [
      'Maintenance of gender-inclusive infrastructure standards',
      'Continued focus on safety and accessibility',
      'Development of family-friendly public infrastructure'
    ],
    welfare_delivery_shifts: [
      'Balanced approach to gender-specific welfare programs',
      'Integration of gender considerations into universal programs',
      'Focus on family welfare and child development'
    ],
    constitutional_safeguards: [
      'Maintain achieved levels of gender equality protection',
      'Ensure continued constitutional rights for all genders',
      'Prevent regression in gender equality achievements'
    ]
  }
};

/**
 * Get valid transition options for a given category and current value
 */
export function getValidTransitions(
  dimension: keyof typeof VALID_TRANSITIONS,
  currentValue: string
): string[] {
  return VALID_TRANSITIONS[dimension][currentValue as keyof typeof VALID_TRANSITIONS[typeof dimension]] || [];
}

/**
 * Get policy implications for a specific transition
 */
export function getPolicyImplications(
  dimension: string,
  fromCategory: string,
  toCategory: string
): PolicyImplication | null {
  const key = `${dimension}_${fromCategory}_to_${toCategory}`;
  return POLICY_IMPLICATIONS[key] || null;
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(
  dimension: keyof typeof VALID_TRANSITIONS,
  fromCategory: string,
  toCategory: string
): boolean {
  const validOptions = getValidTransitions(dimension, fromCategory);
  return validOptions.includes(toCategory);
}

/**
 * Get dimension display names
 */
export const DIMENSION_LABELS = {
  urbanisation: 'Urbanisation Category',
  density: 'Population Density Category',
  sex_ratio: 'Demographic Balance Category'
} as const;

/**
 * Get category descriptions for policy context
 */
export const CATEGORY_DESCRIPTIONS = {
  urbanisation: {
    'Predominantly Rural': 'Traditional rural settlement patterns with agricultural focus',
    'Semi-Rural': 'Mixed rural-urban characteristics with emerging urban centers',
    'Moderately Urbanized': 'Balanced urban development with significant urban population',
    'Highly Urbanized': 'Metropolitan characteristics with concentrated urban development',
    'Insufficient Data': 'Limited data availability requiring enhanced collection infrastructure'
  },
  density: {
    'Low Density': 'Dispersed population requiring connectivity-focused governance',
    'Medium Density': 'Moderate population concentration enabling efficient service delivery',
    'High Density': 'Concentrated population requiring intensive resource management',
    'Very High Density': 'Metropolitan-level concentration requiring specialized governance'
  },
  sex_ratio: {
    'Significantly below average': 'Requires intensive gender equality interventions',
    'Below national average': 'Needs sustained gender-focused policy measures',
    'Near national average': 'Approaching demographic balance with continued monitoring',
    'Above national average': 'Achieved demographic balance with maintenance focus'
  }
} as const;