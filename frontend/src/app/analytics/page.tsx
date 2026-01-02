'use client';

import { useState } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Select,
  Disclaimer,
  DataDisplay,
  Badge
} from '@/components/ui';

const stateOptions = [
  { value: '', label: 'All States' },
  { value: 'MH', label: 'Maharashtra' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'TN', label: 'Tamil Nadu' },
];

const sampleData = {
  national: {
    totalPopulation: 1428000000,
    totalSubmissions: 245678,
    categories: [
      { name: 'SC', population: 201000000, submissions: 34521 },
      { name: 'ST', population: 104000000, submissions: 22345 },
      { name: 'OBC', population: 600000000, submissions: 98765 },
      { name: 'General', population: 450000000, submissions: 76543 },
      { name: 'Other', population: 73000000, submissions: 13504 },
    ],
  },
};

export default function AnalyticsPage() {
  const [selectedState, setSelectedState] = useState('');
  const [viewLevel, setViewLevel] = useState<'national' | 'state'>('national');

  return (
    <div className="py-12 md:py-20">
      <div className="container-wide">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="mb-2">Analytics Dashboard</h1>
              <p className="text-lg text-[var(--color-charcoal-600)]">
                Privacy-protected aggregate census data
              </p>
            </div>
            <Badge variant="info" size="md">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Read-Only Access
              </span>
            </Badge>
          </div>
        </div>

        {/* Privacy Disclaimer */}
        <Disclaimer variant="privacy" title="Privacy-Preserving Estimates" className="mb-8">
          <p>
            All values shown are <strong>privacy-preserving estimates</strong> with 
            differential privacy noise applied. Individual values may differ from 
            true counts. Data is suitable for policy analysis only and cannot be 
            used to infer individual records.
          </p>
        </Disclaimer>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 max-w-xs">
                <Select
                  label="Geographic Level"
                  options={[
                    { value: 'national', label: 'National' },
                    { value: 'state', label: 'State' },
                  ]}
                  value={viewLevel}
                  onChange={(e) => setViewLevel(e.target.value as 'national' | 'state')}
                />
              </div>
              {viewLevel === 'state' && (
                <div className="flex-1 max-w-xs">
                  <Select
                    label="State"
                    options={stateOptions}
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    placeholder="Select a state"
                  />
                </div>
              )}
              <Button variant="secondary">
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card variant="data">
            <CardContent>
              <DataDisplay
                label="Total Population Estimate"
                value={viewLevel === 'national' ? 1428000000 : 125000000}
                isEstimate={true}
              />
            </CardContent>
          </Card>
          <Card variant="data">
            <CardContent>
              <DataDisplay
                label="Total Submissions"
                value={viewLevel === 'national' ? 245678 : 32456}
                isEstimate={true}
              />
            </CardContent>
          </Card>
          <Card variant="data">
            <CardContent>
              <DataDisplay
                label="Coverage Rate"
                value="78.4%"
                isEstimate={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle>Population by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-cream-200)]">
                    <th className="text-left p-4 text-sm font-semibold text-[var(--color-charcoal-600)]">Category</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--color-charcoal-600)]">Population Estimate*</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--color-charcoal-600)]">Percentage*</th>
                    <th className="text-right p-4 text-sm font-semibold text-[var(--color-charcoal-600)]">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.national.categories.map((category, index) => (
                    <tr key={index} className="border-b border-[var(--color-cream-100)] hover:bg-[var(--color-cream-50)]">
                      <td className="p-4 font-medium text-[var(--color-navy-800)]">{category.name}</td>
                      <td className="p-4 text-right font-mono text-[var(--color-charcoal-700)]">
                        {(category.population / 1000000).toFixed(1)}M
                      </td>
                      <td className="p-4 text-right font-mono text-[var(--color-charcoal-700)]">
                        {((category.population / sampleData.national.totalPopulation) * 100).toFixed(1)}%
                      </td>
                      <td className="p-4 text-right font-mono text-[var(--color-charcoal-500)]">
                        {category.submissions.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-[var(--color-charcoal-400)] italic">
              * All values are privacy-preserving estimates with differential privacy noise applied.
            </p>
          </CardContent>
        </Card>

        {/* Restrictions Notice */}
        <Card variant="outlined" className="border-[var(--color-status-warning)]/30 bg-[var(--color-status-warning)]/5">
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-status-warning)] mb-2">Access Restrictions</h3>
                <ul className="space-y-2 text-sm text-[var(--color-charcoal-700)]">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Export and download functionality is not available
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    District and village level data is not accessible
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Raw submission data cannot be viewed
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cross-state data access requires Central Policy Viewer role
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backend Integration Notice */}
        <div className="mt-8 text-center">
          <Disclaimer variant="info">
            <p>
              <strong>UI Demonstration:</strong> This page displays sample data. 
              Backend integration is pending. Actual data will be fetched from 
              the L3 (macro_aggregates) table via authenticated API calls.
            </p>
          </Disclaimer>
        </div>
      </div>
    </div>
  );
}
