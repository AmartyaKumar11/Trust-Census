'use client';

import { useState } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Input, 
  Select, 
  Disclaimer,
  Badge 
} from '@/components/ui';

const casteCategories = [
  { value: 'SC', label: 'Scheduled Caste (SC)' },
  { value: 'ST', label: 'Scheduled Tribe (ST)' },
  { value: 'OBC', label: 'Other Backward Class (OBC)' },
  { value: 'GENERAL', label: 'General' },
  { value: 'OTHER', label: 'Other' },
];

const stateOptions = [
  { value: 'MH', label: 'Maharashtra' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'TN', label: 'Tamil Nadu' },
  { value: 'UP', label: 'Uttar Pradesh' },
  { value: 'GJ', label: 'Gujarat' },
];

export default function SubmitPage() {
  const [step, setStep] = useState<'consent' | 'submission' | 'complete'>('consent');
  const [isLoading, setIsLoading] = useState(false);
  const [consentId, setConsentId] = useState<string | null>(null);

  const handleConsentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setConsentId('CONSENT-' + Math.random().toString(36).substring(7).toUpperCase());
      setStep('submission');
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmissionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setStep('complete');
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="py-12 md:py-20">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Census Data Submission</h1>
          <p className="text-lg text-[var(--color-charcoal-600)] max-w-2xl mx-auto">
            Submit aggregate census data for your assigned area. 
            All submissions require valid consent.
          </p>
        </div>

        {/* Online/Offline Status */}
        <div className="flex justify-center mb-8">
          <Badge variant="success">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[var(--color-status-success)] rounded-full" style={{ animation: 'pulse-subtle 2s ease-in-out infinite' }} />
              Online - Data will be submitted immediately
            </span>
          </Badge>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            <StepIndicator 
              number={1} 
              label="Consent" 
              status={step === 'consent' ? 'current' : 'complete'} 
            />
            <div className={`w-16 h-0.5 ${step !== 'consent' ? 'bg-[var(--color-navy-500)]' : 'bg-[var(--color-cream-300)]'}`} />
            <StepIndicator 
              number={2} 
              label="Submission" 
              status={step === 'submission' ? 'current' : step === 'complete' ? 'complete' : 'pending'} 
            />
            <div className={`w-16 h-0.5 ${step === 'complete' ? 'bg-[var(--color-navy-500)]' : 'bg-[var(--color-cream-300)]'}`} />
            <StepIndicator 
              number={3} 
              label="Complete" 
              status={step === 'complete' ? 'complete' : 'pending'} 
            />
          </div>
        </div>

        {/* Step Content */}
        {step === 'consent' && (
          <Card variant="elevated" className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Step 1: Capture Consent</CardTitle>
              <CardDescription>
                Record consent before collecting any census data. 
                Consent is stored separately from census data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Disclaimer variant="privacy" title="Consent Guarantee" className="mb-6">
                <p>
                  This consent record will contain NO caste data or personal identifiers. 
                  It serves only as legal proof that consent was obtained before data collection.
                </p>
              </Disclaimer>

              <form onSubmit={handleConsentSubmit} className="space-y-6">
                <Select
                  label="State"
                  options={stateOptions}
                  placeholder="Select state"
                  required
                />

                <Input
                  label="District Code"
                  type="text"
                  placeholder="e.g., 0101"
                  pattern="[0-9]{4}"
                  hint="4-digit district code"
                  required
                />

                <Input
                  label="Block Code"
                  type="text"
                  placeholder="e.g., 010101"
                  pattern="[0-9]{6}"
                  hint="6-digit block code"
                  required
                />

                <div className="bg-[var(--color-cream-50)] p-4 rounded-lg border border-[var(--color-cream-200)]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 w-5 h-5 rounded border-[var(--color-charcoal-300)] text-[var(--color-navy-600)] focus:ring-[var(--color-navy-500)]"
                    />
                    <span className="text-sm text-[var(--color-charcoal-700)]">
                      I confirm that the data subject has provided informed consent 
                      for census data collection, as per the prescribed consent text 
                      (Version V1_2024_INITIAL).
                    </span>
                  </label>
                </div>

                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                  Record Consent
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'submission' && (
          <Card variant="elevated" className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Step 2: Submit Census Data</CardTitle>
              <CardDescription>
                Enter aggregate community data. Individual records are never stored.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Consent Reference */}
              <div className="bg-[var(--color-status-success)]/5 border border-[var(--color-status-success)]/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-[var(--color-status-success)]">Consent Verified</p>
                    <p className="text-sm text-[var(--color-charcoal-600)]">Receipt ID: {consentId}</p>
                  </div>
                </div>
              </div>

              <Disclaimer variant="warning" title="Write-Only Submission" className="mb-6">
                <p>
                  Once submitted, this data cannot be viewed, edited, or deleted. 
                  Only a receipt ID will be returned. Verify all data before submitting.
                </p>
              </Disclaimer>

              <form onSubmit={handleSubmissionSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Household Count"
                    type="number"
                    min="0"
                    placeholder="e.g., 150"
                    required
                  />
                  <Input
                    label="Population Count"
                    type="number"
                    min="0"
                    placeholder="e.g., 750"
                    required
                  />
                </div>

                <Select
                  label="Caste Category"
                  options={casteCategories}
                  placeholder="Select category"
                  hint="As declared by the community"
                  required
                />

                <Disclaimer variant="info">
                  <p>
                    <strong>No personal identifiers:</strong> Do not enter names, 
                    addresses, Aadhaar numbers, or any other personally identifiable information.
                  </p>
                </Disclaimer>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep('consent')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" size="lg" isLoading={isLoading}>
                    Submit Data
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card variant="elevated" className="max-w-2xl mx-auto text-center">
            <CardContent className="py-12">
              <div className="w-20 h-20 bg-[var(--color-status-success)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-4">Submission Complete</h2>
              <p className="text-lg text-[var(--color-charcoal-600)] mb-8 max-w-md mx-auto">
                Your census data has been recorded. This data is now write-only 
                and cannot be retrieved or modified.
              </p>

              <div className="bg-[var(--color-cream-50)] rounded-lg p-6 mb-8 max-w-sm mx-auto">
                <p className="text-sm text-[var(--color-charcoal-500)] mb-2">Submission Receipt</p>
                <p className="font-mono text-lg text-[var(--color-navy-800)]">
                  SUB-{Math.random().toString(36).substring(2, 10).toUpperCase()}
                </p>
              </div>

              <Disclaimer variant="privacy" className="text-left mb-8">
                <p>
                  <strong>Privacy Guarantee:</strong> This submission will be aggregated 
                  with others and protected by k-anonymity and differential privacy 
                  before any analytics are published.
                </p>
              </Disclaimer>

              <Button onClick={() => setStep('consent')} size="lg">
                Submit Another Entry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ 
  number, 
  label, 
  status 
}: { 
  number: number; 
  label: string; 
  status: 'pending' | 'current' | 'complete';
}) {
  const styles = {
    pending: 'bg-[var(--color-cream-200)] text-[var(--color-charcoal-400)]',
    current: 'bg-[var(--color-navy-700)] text-white',
    complete: 'bg-[var(--color-status-success)] text-white',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${styles[status]}`}>
        {status === 'complete' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`text-xs ${status === 'current' ? 'text-[var(--color-navy-700)] font-medium' : 'text-[var(--color-charcoal-500)]'}`}>
        {label}
      </span>
    </div>
  );
}
