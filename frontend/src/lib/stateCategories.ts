export type PolicyCategory =
    | 'GENERAL_PREDOMINANT'
    | 'OBC_PREDOMINANT'
    | 'SC_ST_PREDOMINANT'
    | 'MIXED_COMPOSITION'
    | 'HIGHLY_DIVERSE'
    | 'INSUFFICIENT_DATA';

export interface PolicyCategorySemantics {
    label: string;
    color: string;
    description: string;
    direction: string[];
}

export const CATEGORY_DEFINITIONS: Record<PolicyCategory, PolicyCategorySemantics> = {
    'GENERAL_PREDOMINANT': {
        label: 'General Predominant',
        color: '#C0392B', // Muted Red
        description: 'General Category populations form the largest demographic block according to available aggregates.',
        direction: [
            'Maintain economic criteria (EWS) focus',
            'Ensure competitive merit-based access',
            'Review reservation caps relative to composition'
        ]
    },
    'OBC_PREDOMINANT': {
        label: 'OBC Predominant',
        color: '#E67E22', // Muted Orange
        description: 'One caste category (OBC) shows clear statistical dominance relative to others.',
        direction: [
            'Prioritize OBC-targeted welfare schemes',
            'Ensure representation in local governance bodies',
            'Monitor educational capacity in backward regions'
        ]
    },
    'SC_ST_PREDOMINANT': {
        label: 'SC/ST Predominant',
        color: '#8E44AD', // Muted Purple
        description: 'Aggregated SC and ST populations form the largest demographic block.',
        direction: [
            'Strengthen Scheduled Area protections',
            'Focus on tribal welfare and Forest Rights Act',
            'Enforce atrocities prevention rigorously'
        ]
    },
    'MIXED_COMPOSITION': {
        label: 'Mixed Composition',
        color: '#3498DB', // Muted Blue
        description: 'Multiple groups are present in significant numbers without a single overwhelming majority.',
        direction: [
            'Balance general and targeted schemes',
            'Focus on economic criteria over purely caste-based targeting',
            'Ensure equitable resource distribution across groups'
        ]
    },
    'HIGHLY_DIVERSE': {
        label: 'Highly Diverse',
        color: '#2ECC71', // Muted Green
        description: 'Population is distributed broadly across all categories with low variance.',
        direction: [
            'Favor universal welfare schemes',
            'Monitor regional equity rather than caste-specific targeting',
            'Avoid narrow beneficiary definitions'
        ]
    },
    'INSUFFICIENT_DATA': {
        label: 'Insufficient Data',
        color: '#95A5A6', // Muted Grey
        description: 'Data sufficiency thresholds were not met for this region.',
        direction: [
            'Initiate supplementary enumeration rounds',
            'Verify field submission integrity',
            'Withhold policy decisions until coverage improves'
        ]
    }
};

/**
 * Deterministic classifier for noisy aggregates
 * Uses RELATIVE DOMINANCE logic (not hard numeric thresholds).
 */
export function classifyState(composition: { category: string; populationEstimate: number }[]): PolicyCategory {
    if (!composition || composition.length === 0) return 'INSUFFICIENT_DATA';

    const total = composition.reduce((sum, c) => sum + c.populationEstimate, 0);
    if (total === 0) return 'INSUFFICIENT_DATA';

    // Calculate shares
    const shares: Record<string, number> = {};
    composition.forEach(c => {
        shares[c.category] = (c.populationEstimate / total) * 100;
    });

    const obc = shares['OBC'] || 0;
    const sc = shares['SC'] || 0;
    const st = shares['ST'] || 0;
    const general = shares['GENERAL'] || 0;
    const sc_st = sc + st;

    // Relative Dominance Logic
    // Using robust operational definitions for "Policy Grade":

    if (general > 40) return 'GENERAL_PREDOMINANT';
    if (obc > 40) return 'OBC_PREDOMINANT';
    if (sc_st > 40) return 'SC_ST_PREDOMINANT';

    // Flatness Check for "Highly Diverse"
    // If variability is low. Max - Min < 10%?
    const values = Object.values(shares);
    const max = Math.max(...values);
    const min = Math.min(...values);

    if ((max - min) < 15 && max < 30) {
        return 'HIGHLY_DIVERSE';
    }

    return 'MIXED_COMPOSITION';
}
