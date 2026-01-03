/**
 * National Patterns Summary Component
 * Trust Census System - Privacy-First Policy Analytics
 * 
 * RESPONSIBILITY: Display national-level policy patterns and insights
 * 
 * MUST:
 * - Show categorical patterns only
 * - Provide policy interpretation
 * - Use static governance-grade cards
 * - Include constitutional context
 * 
 * MUST NEVER:
 * - Display charts with numeric axes
 * - Show raw percentages or counts
 * - Include interactive filters
 * - Allow data manipulation
 */

import { Card } from '@/components/ui';
import { URBAN_CATEGORY_COLORS } from '@/lib/policyData';
import type { NationalPatterns, StatePolicy } from '@/lib/policyData';

interface NationalPatternsSummaryProps {
  patterns: NationalPatterns;
  statesData: Record<string, StatePolicy>;
}

export function NationalPatternsSummary({ patterns, statesData }: NationalPatternsSummaryProps) {
  
  // Calculate categorical distributions (for display, not computation)
  const getCategoricalDistribution = () => {
    const distribution: Record<string, string[]> = {};
    
    Object.values(statesData).forEach(state => {
      const category = state.urban_category;
      if (!distribution[category]) {
        distribution[category] = [];
      }
      distribution[category].push(state.state_name);
    });
    
    return distribution;
  };

  const distribution = getCategoricalDistribution();

  // Policy insights based on patterns
  const getPolicyInsights = () => {
    const insights = [];
    
    if (patterns.predominant_urban_category === 'Predominantly Rural') {
      insights.push({
        title: 'Rural Development Priority',
        description: 'National focus on rural infrastructure, connectivity, and service delivery enhancement.',
        icon: '🏘️'
      });
    }
    
    if (patterns.predominant_urban_category === 'Semi-Rural') {
      insights.push({
        title: 'Transitional Development',
        description: 'Balanced approach needed for emerging urban centers and rural connectivity.',
        icon: '🌆'
      });
    }
    
    if (patterns.data_gaps_count > 0) {
      insights.push({
        title: 'Data Infrastructure',
        description: 'Statistical capacity building required in select regions for comprehensive planning.',
        icon: '📊'
      });
    }
    
    insights.push({
      title: 'Constitutional Compliance',
      description: 'All analysis conducted under privacy-first principles with categorical data only.',
      icon: '⚖️'
    });
    
    return insights;
  };

  const policyInsights = getPolicyInsights();

  return (
    <div className="space-y-6">
      
      {/* Section Header */}
      <div>
        <h3 className="font-serif text-lg font-bold text-[var(--color-navy-900)] mb-2">
          National Patterns Summary
        </h3>
        <p className="text-sm text-[var(--color-charcoal-600)]">
          Categorical analysis of urbanisation and demographic patterns across India
        </p>
      </div>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {policyInsights.map((insight, index) => (
          <Card key={index} className="bg-white border-[var(--color-navy-100)] p-4">
            <div className="text-center space-y-3">
              <div className="text-2xl">{insight.icon}</div>
              <div>
                <h4 className="font-serif font-semibold text-sm text-[var(--color-navy-800)] mb-1">
                  {insight.title}
                </h4>
                <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Categorical Distribution */}
      <Card className="bg-white border-[var(--color-navy-100)] p-6">
        <h4 className="font-serif font-semibold text-[var(--color-navy-800)] mb-4">
          Urbanisation Category Distribution
        </h4>
        
        <div className="space-y-4">
          {Object.entries(distribution).map(([category, states]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded border border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: URBAN_CATEGORY_COLORS[category as keyof typeof URBAN_CATEGORY_COLORS] }}
                />
                <span className="font-semibold text-sm text-[var(--color-navy-800)]">
                  {category}
                </span>
                <span className="text-xs text-[var(--color-charcoal-500)]">
                  ({states.length} states/UTs)
                </span>
              </div>
              
              <div className="ml-7">
                <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
                  {states.slice(0, 5).join(', ')}
                  {states.length > 5 && ` and ${states.length - 5} others`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Insights */}
      <Card className="bg-[var(--color-cream-100)] border-[var(--color-gold-200)] p-6">
        <h4 className="font-serif font-semibold text-[var(--color-navy-800)] mb-4">
          Policy Summary Insights
        </h4>
        
        <div className="space-y-3">
          {patterns.summary_insights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-1.5 h-1.5 bg-[var(--color-gold-500)] rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-[var(--color-charcoal-800)] leading-relaxed">
                {insight}
              </p>
            </div>
          ))}
        </div>
        
        {/* Governance Context */}
        <div className="mt-6 pt-4 border-t border-[var(--color-gold-200)]">
          <p className="text-xs text-[var(--color-charcoal-700)] leading-relaxed italic">
            Analysis based on Census of India 2011 data, presented in categorical form to ensure 
            privacy protection while enabling evidence-based policy development under constitutional 
            principles of dignity and non-discrimination.
          </p>
        </div>
      </Card>
    </div>
  );
}