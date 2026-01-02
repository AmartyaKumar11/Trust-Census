import { Card, CardContent, Disclaimer } from '@/components/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Principles',
  description: 'The non-negotiable principles that guide the Trust-First Census System design.',
};

export default function PrinciplesPage() {
  return (
    <div className="py-12 md:py-20">
      {/* Hero */}
      <section className="container-wide mb-16">
        <div className="max-w-3xl">
          <h1 className="mb-6">Trust-First Principles</h1>
          <p className="text-xl text-[var(--color-charcoal-600)] leading-relaxed">
            These principles are not guidelines—they are architectural constraints. 
            Every feature, every endpoint, every database table is designed to make 
            violation of these principles structurally impossible.
          </p>
        </div>
      </section>

      {/* Principles Grid */}
      <section className="container-wide">
        <div className="space-y-12">
          {principles.map((principle, index) => (
            <div key={index} className="grid md:grid-cols-3 gap-8 items-start">
              <div className="md:col-span-1">
                <div className="sticky top-24">
                  <div className="w-16 h-16 bg-[var(--color-navy-100)] rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">{principle.icon}</span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-2">{principle.title}</h2>
                  <p className="text-[var(--color-charcoal-600)]">{principle.subtitle}</p>
                </div>
              </div>
              <div className="md:col-span-2 space-y-6">
                <Card variant="elevated">
                  <CardContent>
                    <h3 className="font-serif text-lg text-[var(--color-navy-800)] mb-4">What This Means</h3>
                    <p className="text-[var(--color-charcoal-700)] leading-relaxed mb-6">
                      {principle.explanation}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-[var(--color-status-success)]/5 border border-[var(--color-status-success)]/20 rounded-lg p-4">
                        <h4 className="font-semibold text-[var(--color-status-success)] text-sm mb-2">
                          ✓ What the system does
                        </h4>
                        <ul className="space-y-2">
                          {principle.does.map((item, i) => (
                            <li key={i} className="text-sm text-[var(--color-charcoal-700)] flex items-start gap-2">
                              <span className="text-[var(--color-status-success)] mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-[var(--color-status-error)]/5 border border-[var(--color-status-error)]/20 rounded-lg p-4">
                        <h4 className="font-semibold text-[var(--color-status-error)] text-sm mb-2">
                          ✗ What the system never does
                        </h4>
                        <ul className="space-y-2">
                          {principle.doesNot.map((item, i) => (
                            <li key={i} className="text-sm text-[var(--color-charcoal-700)] flex items-start gap-2">
                              <span className="text-[var(--color-status-error)] mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {principle.technicalNote && (
                  <Disclaimer variant="info" title="Technical Implementation">
                    {principle.technicalNote}
                  </Disclaimer>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Summary */}
      <section className="container-wide mt-20">
        <Card variant="data" className="bg-[var(--color-navy-50)]">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-4">The Core Guarantee</h2>
            <p className="text-xl text-[var(--color-charcoal-700)] max-w-3xl mx-auto leading-relaxed">
              Even if every administrator, every database, and every server were compromised, 
              it would still be <strong>mathematically impossible</strong> to identify 
              individual citizens or target specific communities from this system&apos;s data.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const principles = [
  {
    icon: '🔐',
    title: 'Consent First',
    subtitle: 'No data without permission',
    explanation: `Consent is not a checkbox—it is a first-class legal artifact stored separately from census data. 
    Every submission must be linked to a valid consent record. Consent records contain no caste information, 
    preventing any connection between identity and sensitive data.`,
    does: [
      'Require explicit consent before any submission',
      'Store consent as immutable, append-only records',
      'Provide receipts for all consent actions',
      'Separate consent from census data entirely',
    ],
    doesNot: [
      'Accept submissions without valid consent',
      'Store personal identifiers in consent records',
      'Allow consent records to be modified or deleted',
      'Link consent to caste or demographic data',
    ],
    technicalNote: 'Consent records are stored in a separate table with database triggers preventing UPDATE and DELETE operations. The only link between consent and submission is a non-identifying receipt ID.',
  },
  {
    icon: '🚫',
    title: 'No Raw Data Access',
    subtitle: 'Write-only submissions',
    explanation: `Census submissions are a one-way data sink. Data can be written but never read back through any API. 
    There is no endpoint, no admin panel, no database query that returns individual submission records. 
    The only output is aggregated, privacy-protected statistics.`,
    does: [
      'Accept submissions through write-only endpoints',
      'Return only a receipt ID after submission',
      'Process data through offline aggregation only',
      'Publish only aggregated, noised statistics',
    ],
    doesNot: [
      'Provide any endpoint to read raw submissions',
      'Allow administrators to query individual records',
      'Echo back submitted data in responses',
      'Export or download submission data',
    ],
    technicalNote: 'The api_writer database role has INSERT permission only on the submissions table. No role has SELECT permission on raw submissions except the offline aggregation_worker.',
  },
  {
    icon: '⚖️',
    title: 'No Super-Admin',
    subtitle: 'Separation of powers',
    explanation: `No single role, no single person, no single credential can access all system functions. 
    Power is structurally divided: those who can write cannot read, those who can aggregate cannot access raw data, 
    those who can view analytics cannot export.`,
    does: [
      'Enforce strict role separation at database level',
      'Reject any role named SUPER_ADMIN, ROOT, GOD, etc.',
      'Limit each role to specific data layers',
      'Audit all actions regardless of role',
    ],
    doesNot: [
      'Allow any role to bypass access controls',
      'Provide override mechanisms for administrators',
      'Accept wildcard or universal scope assignments',
      'Trust any single entity with full access',
    ],
    technicalNote: 'Database roles are defined with explicit GRANT statements. The application code validates role names against a forbidden patterns list and rejects any attempt to create privileged roles.',
  },
  {
    icon: '🛡️',
    title: 'Privacy by Mathematics',
    subtitle: 'K-anonymity and differential privacy',
    explanation: `Privacy is not enforced by policy or access control—it is enforced by mathematics. 
    K-anonymity ensures groups smaller than 5 are completely suppressed (not masked, not rounded—removed). 
    Differential privacy adds calibrated noise that makes it mathematically impossible to determine if any individual is in the dataset.`,
    does: [
      'Apply k-anonymity with k=5 minimum',
      'Completely suppress (drop) small groups',
      'Add Laplace noise with ε=1.0 to all aggregates',
      'Make differencing attacks mathematically futile',
    ],
    doesNot: [
      'Publish any group with fewer than 5 members',
      'Round or mask small values (they are dropped)',
      'Allow exact counts to be recovered',
      'Enable before/after comparison attacks',
    ],
    technicalNote: 'Micro-aggregation (L1→L2) applies k-anonymity by dropping groups below threshold. Macro-aggregation (L2→L3) applies differential privacy using the Laplace mechanism. Both transformations are irreversible.',
  },
  {
    icon: '🔇',
    title: 'Fail Closed',
    subtitle: 'When in doubt, deny',
    explanation: `The system is designed to fail safely. If audit logging fails, requests are rejected. 
    If database connection fails, no data is accepted. If scope validation fails, access is denied. 
    There is no degraded mode, no fallback, no silent failure.`,
    does: [
      'Reject requests if audit logging fails',
      'Deny access if scope cannot be verified',
      'Stop operations if database is unavailable',
      'Return explicit errors for all failures',
    ],
    doesNot: [
      'Continue operating with degraded security',
      'Silently skip failed validations',
      'Provide fallback access mechanisms',
      'Hide errors from users or logs',
    ],
    technicalNote: 'All middleware is configured with fail-closed behavior. The audit logging middleware will reject requests if it cannot write to the audit log. Database transactions are atomic—partial writes are impossible.',
  },
];
