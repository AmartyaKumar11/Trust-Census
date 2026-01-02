import Link from 'next/link';
import { Button, Card, CardContent, Disclaimer } from '@/components/ui';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-institutional text-white py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-10" />
        <div className="container-wide relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-8">
              <span className="w-2 h-2 bg-[var(--color-gold-400)] rounded-full" style={{ animation: 'pulse-subtle 2s ease-in-out infinite' }} />
              <span>Privacy-First by Design</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 text-balance font-serif font-bold">
              Trust-First Caste Census System
            </h1>
            <p className="text-xl text-[var(--color-cream-200)] mb-10 max-w-2xl mx-auto leading-relaxed">
              A governance-grade data collection system where privacy is not a feature—
              it is the architecture. Misuse is not discouraged—it is impossible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/principles">
                <Button size="lg" className="bg-[var(--color-gold-500)] hover:bg-[var(--color-gold-600)] text-[var(--color-navy-900)]">
                  Learn Our Principles
                </Button>
              </Link>
              <Link href="/architecture">
                <Button variant="ghost" size="lg" className="text-white border border-white/30 hover:bg-white/10">
                  View Architecture
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles Section */}
      <section className="section bg-gradient-cream">
        <div className="container-wide">
          <div className="section-header">
            <h2 className="mb-4">Core Principles</h2>
            <p className="text-lg text-[var(--color-charcoal-600)]">
              Every design decision is guided by these non-negotiable principles.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((principle, index) => (
              <Card key={index} variant="elevated" className="text-center">
                <CardContent>
                  <div className="w-14 h-14 bg-[var(--color-navy-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">{principle.icon}</span>
                  </div>
                  <h3 className="font-serif text-lg text-[var(--color-navy-800)] mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-[var(--color-charcoal-600)]">
                    {principle.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section">
        <div className="container-wide">
          <div className="section-header">
            <h2 className="mb-4">How It Works</h2>
            <p className="text-lg text-[var(--color-charcoal-600)]">
              A one-way data flow that protects privacy at every stage.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Flow Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[var(--color-cream-300)] hidden md:block" />
              
              {steps.map((step, index) => (
                <div key={index} className="relative flex gap-6 mb-8 last:mb-0">
                  <div className="flex-shrink-0 w-16 h-16 bg-[var(--color-navy-700)] text-white rounded-full flex items-center justify-center font-serif text-xl font-bold z-10">
                    {index + 1}
                  </div>
                  <Card className="flex-1">
                    <CardContent>
                      <h3 className="font-serif text-lg text-[var(--color-navy-800)] mb-2">
                        {step.title}
                      </h3>
                      <p className="text-[var(--color-charcoal-600)] mb-3">{step.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {step.guarantees.map((guarantee, gIndex) => (
                          <span
                            key={gIndex}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] text-xs rounded"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {guarantee}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Non-Goals Section */}
      <section className="section bg-[var(--color-navy-50)]">
        <div className="container-wide">
          <div className="section-header">
            <h2 className="mb-4">What This System Will Never Do</h2>
            <p className="text-lg text-[var(--color-charcoal-600)]">
              These exclusions are deliberate design choices, not limitations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {nonGoals.map((item, index) => (
              <Card key={index} variant="outlined" className="border-[var(--color-status-error)]/20">
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-status-error)]/10 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--color-navy-800)] mb-1">{item.title}</h4>
                      <p className="text-sm text-[var(--color-charcoal-600)]">{item.reason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container-narrow text-center">
          <Disclaimer variant="privacy" title="Demo Environment">
            <p>
              This is a demonstration of the Trust-First Census System. 
              No real data is collected. For authorized access, please contact 
              your designated administrator.
            </p>
          </Disclaimer>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg">
                Access System
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Data
const principles = [
  {
    icon: '🔒',
    title: 'Consent First',
    description: 'No data is collected without explicit, recorded consent. Consent is a legal artifact.',
  },
  {
    icon: '🚫',
    title: 'No Raw Access',
    description: 'Individual records are never accessible—not even to administrators.',
  },
  {
    icon: '⚖️',
    title: 'No Super-Admin',
    description: 'No single role can override all controls. Power is structurally separated.',
  },
  {
    icon: '🛡️',
    title: 'Privacy by Math',
    description: 'K-anonymity and differential privacy make re-identification mathematically impossible.',
  },
];

const steps = [
  {
    title: 'Consent Capture',
    description: 'Citizens provide explicit consent before any data collection. Consent is stored separately from census data.',
    guarantees: ['Immutable record', 'No caste data', 'Receipt provided'],
  },
  {
    title: 'Data Submission',
    description: 'Enumerators submit aggregate community data. Data is write-only—it cannot be read back.',
    guarantees: ['Write-only', 'No personal IDs', 'Consent verified'],
  },
  {
    title: 'Offline Aggregation',
    description: 'Batch processing applies privacy protections. Small groups are suppressed. Noise is added.',
    guarantees: ['K-anonymity (k=5)', 'Differential privacy', 'No HTTP trigger'],
  },
  {
    title: 'Policy Analytics',
    description: 'Analysts access only aggregated, noised data. Geographic scope is enforced.',
    guarantees: ['State-level only', 'No export', 'Scoped access'],
  },
];

const nonGoals = [
  {
    title: 'Individual Identification',
    reason: 'No names, addresses, or personal identifiers are ever stored.',
  },
  {
    title: 'Real-Time Analytics',
    reason: 'Delayed processing prevents probing attacks.',
  },
  {
    title: 'Data Export',
    reason: 'No bulk download or export functionality exists.',
  },
  {
    title: 'Caste Inference',
    reason: 'All classifications are explicit. No ML or prediction.',
  },
  {
    title: 'Cross-Database Linking',
    reason: 'No integration with Aadhaar, voter rolls, or other systems.',
  },
  {
    title: 'Behavioral Tracking',
    reason: 'No analytics on user behavior or access patterns.',
  },
];
