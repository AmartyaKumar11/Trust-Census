import { Card, CardContent, CardHeader, CardTitle, Disclaimer } from '@/components/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture',
  description: 'Technical architecture of the Trust-First Census System showing one-way data flow.',
};

export default function ArchitecturePage() {
  return (
    <div className="py-12 md:py-20">
      {/* Hero */}
      <section className="container-wide mb-16">
        <div className="max-w-3xl">
          <h1 className="mb-6">System Architecture</h1>
          <p className="text-xl text-[var(--color-charcoal-600)] leading-relaxed">
            A one-way data flow where privacy is enforced at every layer. 
            Data moves from consent to submission to aggregates—never backward.
          </p>
        </div>
      </section>

      {/* Data Flow Diagram */}
      <section className="container-wide mb-16">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>One-Way Data Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px] p-8">
                {/* Flow Diagram */}
                <div className="flex items-center justify-between gap-4">
                  {dataLayers.map((layer, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-40 p-4 rounded-lg border-2 ${layer.borderColor} ${layer.bgColor}`}>
                        <div className="text-center">
                          <span className="text-2xl mb-2 block">{layer.icon}</span>
                          <h4 className="font-semibold text-[var(--color-navy-800)] mb-1">{layer.name}</h4>
                          <p className="text-xs text-[var(--color-charcoal-600)]">{layer.description}</p>
                        </div>
                      </div>
                      {index < dataLayers.length - 1 && (
                        <div className="flex flex-col items-center">
                          <svg className="w-8 h-8 text-[var(--color-navy-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="text-xs text-[var(--color-charcoal-500)] mt-1">{layer.transform}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-8 pt-6 border-t border-[var(--color-cream-200)]">
                  <div className="flex flex-wrap gap-6 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[var(--color-gold-100)] border-2 border-[var(--color-gold-300)] rounded" />
                      <span className="text-sm text-[var(--color-charcoal-600)]">Consent Layer (L0)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[var(--color-status-error)]/10 border-2 border-[var(--color-status-error)]/30 rounded" />
                      <span className="text-sm text-[var(--color-charcoal-600)]">Raw Data (L1) - No Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[var(--color-status-warning)]/10 border-2 border-[var(--color-status-warning)]/30 rounded" />
                      <span className="text-sm text-[var(--color-charcoal-600)]">Micro-Aggregates (L2)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[var(--color-status-success)]/10 border-2 border-[var(--color-status-success)]/30 rounded" />
                      <span className="text-sm text-[var(--color-charcoal-600)]">Macro-Aggregates (L3)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data Layers Detail */}
      <section className="container-wide mb-16">
        <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-8">Data Layers</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {layerDetails.map((layer, index) => (
            <Card key={index} variant="default">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${layer.iconBg}`}>
                    <span className="text-xl">{layer.icon}</span>
                  </div>
                  <div>
                    <CardTitle>{layer.name}</CardTitle>
                    <p className="text-sm text-[var(--color-charcoal-500)]">{layer.code}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--color-charcoal-700)] mb-4">{layer.description}</p>
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-semibold text-[var(--color-navy-700)] mb-1">Contains</h5>
                    <p className="text-sm text-[var(--color-charcoal-600)]">{layer.contains}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-[var(--color-navy-700)] mb-1">Access</h5>
                    <p className="text-sm text-[var(--color-charcoal-600)]">{layer.access}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-[var(--color-navy-700)] mb-1">Protection</h5>
                    <p className="text-sm text-[var(--color-charcoal-600)]">{layer.protection}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Role Separation */}
      <section className="container-wide mb-16">
        <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-8">Role Separation</h2>
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--color-navy-50)]">
                    <th className="text-left p-4 font-semibold text-[var(--color-navy-800)]">Role</th>
                    <th className="text-center p-4 font-semibold text-[var(--color-navy-800)]">L0 (Consent)</th>
                    <th className="text-center p-4 font-semibold text-[var(--color-navy-800)]">L1 (Raw)</th>
                    <th className="text-center p-4 font-semibold text-[var(--color-navy-800)]">L2 (Micro)</th>
                    <th className="text-center p-4 font-semibold text-[var(--color-navy-800)]">L3 (Macro)</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr key={index} className="border-t border-[var(--color-cream-200)]">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[var(--color-navy-800)]">{role.name}</p>
                          <p className="text-xs text-[var(--color-charcoal-500)]">{role.description}</p>
                        </div>
                      </td>
                      {role.access.map((access, i) => (
                        <td key={i} className="text-center p-4">
                          <AccessBadge access={access} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Disclaimer variant="info" title="No Super-Admin" className="mt-4">
          Notice that no single role has full access to all layers. This is by design—
          separation of powers is enforced at the database level.
        </Disclaimer>
      </section>

      {/* Deployment */}
      <section className="container-wide">
        <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-8">Deployment Model</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {deploymentComponents.map((component, index) => (
            <Card key={index}>
              <CardContent className="text-center">
                <div className="w-16 h-16 bg-[var(--color-navy-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{component.icon}</span>
                </div>
                <h3 className="font-serif text-lg text-[var(--color-navy-800)] mb-2">{component.name}</h3>
                <p className="text-sm text-[var(--color-charcoal-600)] mb-4">{component.description}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-cream-100)] rounded-full">
                  <span className={`w-2 h-2 rounded-full ${component.running ? 'bg-[var(--color-status-success)]' : 'bg-[var(--color-status-warning)]'}`} />
                  <span className="text-xs text-[var(--color-charcoal-600)]">{component.schedule}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccessBadge({ access }: { access: string }) {
  const styles: Record<string, string> = {
    'Write': 'bg-[var(--color-status-info)]/10 text-[var(--color-status-info)]',
    'Read': 'bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]',
    'None': 'bg-[var(--color-charcoal-100)] text-[var(--color-charcoal-400)]',
    'Append': 'bg-[var(--color-gold-100)] text-[var(--color-gold-700)]',
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${styles[access] || styles['None']}`}>
      {access}
    </span>
  );
}

const dataLayers = [
  {
    icon: '📝',
    name: 'Consent',
    description: 'L0 - Legal artifact',
    bgColor: 'bg-[var(--color-gold-50)]',
    borderColor: 'border-[var(--color-gold-300)]',
    transform: 'Verify',
  },
  {
    icon: '📥',
    name: 'Submission',
    description: 'L1 - Write-only',
    bgColor: 'bg-[var(--color-status-error)]/5',
    borderColor: 'border-[var(--color-status-error)]/30',
    transform: 'Aggregate',
  },
  {
    icon: '📊',
    name: 'Micro-Agg',
    description: 'L2 - K-anonymity',
    bgColor: 'bg-[var(--color-status-warning)]/5',
    borderColor: 'border-[var(--color-status-warning)]/30',
    transform: 'Add Noise',
  },
  {
    icon: '📈',
    name: 'Macro-Agg',
    description: 'L3 - DP Protected',
    bgColor: 'bg-[var(--color-status-success)]/5',
    borderColor: 'border-[var(--color-status-success)]/30',
    transform: '',
  },
];

const layerDetails = [
  {
    icon: '📝',
    iconBg: 'bg-[var(--color-gold-100)]',
    name: 'Consent Layer',
    code: 'L0',
    description: 'Immutable consent records stored separately from census data.',
    contains: 'Consent receipts, timestamps, enumerator IDs, geographic scope',
    access: 'Citizen (create), Enumerator (create), Supervisor (read metadata)',
    protection: 'Append-only table, no UPDATE/DELETE triggers',
  },
  {
    icon: '📥',
    iconBg: 'bg-[var(--color-status-error)]/10',
    name: 'Raw Submissions',
    code: 'L1',
    description: 'Census submissions in their original form. Never accessible via API.',
    contains: 'Geographic codes, household counts, population counts, caste categories',
    access: 'Enumerator (write-only), Aggregation Worker (read for processing)',
    protection: 'No SELECT permission for any API role',
  },
  {
    icon: '📊',
    iconBg: 'bg-[var(--color-status-warning)]/10',
    name: 'Micro-Aggregates',
    code: 'L2',
    description: 'District and state level aggregates with k-anonymity protection.',
    contains: 'Aggregated counts by geography and category, suppression flags',
    access: 'Aggregation Worker (write), Internal processing only',
    protection: 'K-anonymity (k=5), small groups completely suppressed',
  },
  {
    icon: '📈',
    iconBg: 'bg-[var(--color-status-success)]/10',
    name: 'Macro-Aggregates',
    code: 'L3',
    description: 'State and national level data with differential privacy noise.',
    contains: 'Noised population estimates, submission counts, privacy disclaimers',
    access: 'State Analyst (own state), Central Policy Viewer (all states/national)',
    protection: 'Differential privacy (ε=1.0), Laplace noise mechanism',
  },
];

const roles = [
  {
    name: 'Citizen',
    description: 'Provides consent',
    access: ['Write', 'None', 'None', 'None'],
  },
  {
    name: 'Enumerator',
    description: 'Collects data',
    access: ['Write', 'Write', 'None', 'None'],
  },
  {
    name: 'Supervisor',
    description: 'Oversees collection',
    access: ['Read', 'None', 'None', 'None'],
  },
  {
    name: 'State Analyst',
    description: 'Views state data',
    access: ['None', 'None', 'None', 'Read'],
  },
  {
    name: 'Central Policy Viewer',
    description: 'Views national data',
    access: ['None', 'None', 'None', 'Read'],
  },
  {
    name: 'Aggregation Worker',
    description: 'Offline processing',
    access: ['None', 'Read', 'Write', 'Write'],
  },
];

const deploymentComponents = [
  {
    icon: '🖥️',
    name: 'API Server',
    description: 'Handles authentication, consent, submissions, and analytics queries.',
    schedule: 'Runs continuously',
    running: true,
  },
  {
    icon: '🗄️',
    name: 'PostgreSQL',
    description: 'Stores all data with role-based access control at database level.',
    schedule: 'Runs continuously',
    running: true,
  },
  {
    icon: '⚙️',
    name: 'Aggregation Worker',
    description: 'Transforms raw data into privacy-protected aggregates.',
    schedule: 'Scheduled (daily/weekly)',
    running: false,
  },
];
