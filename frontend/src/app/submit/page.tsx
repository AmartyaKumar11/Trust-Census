'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAuth, RequireAuth } from '@/lib/authContext';
import { 
  createConsent, 
  createSubmission, 
  ApiError,
  type ConsentCreateParams,
  type SubmissionCreateParams,
} from '@/lib/apiClient';
import {
  savePendingSubmission,
  getPendingCount,
  syncPendingSubmissions,
  isOfflineStorageAvailable,
  type SyncResult,
} from '@/lib/offlineStorage';
import {
  getStateOptions,
  getDistrictOptions,
  getBlockOptions,
  stateHasDistricts,
  districtHasBlocks,
  getStateName,
  getDistrictName,
  getBlockName,
} from '@/lib/geographyData';

// =============================================================================
// CONSTANTS
// =============================================================================

const CONSENT_TEXT_VERSION = 'V1_2024_INITIAL';

const CASTE_CATEGORIES = [
  { value: 'SC', label: 'Scheduled Caste (SC)' },
  { value: 'ST', label: 'Scheduled Tribe (ST)' },
  { value: 'OBC', label: 'Other Backward Class (OBC)' },
  { value: 'GENERAL', label: 'General' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Consent text to display
const CONSENT_TEXT = `
I understand that:

1. My community's aggregate data (not individual information) will be collected for census purposes.

2. This data will be used ONLY for statistical analysis and policy planning.

3. My individual identity will NOT be linked to any census data.

4. The data cannot be retrieved, modified, or deleted after submission.

5. Only aggregated, privacy-protected statistics will be published.

6. I have the right to refuse participation.

By providing consent, I confirm that I have read and understood the above terms.
`;

// =============================================================================
// TYPES
// =============================================================================

type Step = 'consent' | 'submission' | 'complete';

interface ConsentFormData {
  stateCode: string;
  districtCode: string;
  blockCode: string;
  consentConfirmed: boolean;
}

interface SubmissionFormData {
  villageCode: string;
  householdCount: string;
  populationCount: string;
  casteCategory: string;
}

interface CompletionData {
  receiptId: string;
  timestamp: string;
  wasOffline: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SubmitPage() {
  return (
    <RequireAuth 
      allowedRoles={['ENUMERATOR', 'SUPERVISOR']}
      fallback={<UnauthorizedMessage />}
    >
      <SubmitPageContent />
    </RequireAuth>
  );
}

function UnauthorizedMessage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return (
    <div className="py-12 md:py-20">
      <div className="container-narrow">
        <Card variant="elevated" className="max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <div className="w-16 h-16 bg-[var(--color-status-warning)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-serif font-bold text-[var(--color-navy-800)] mb-4">
              {isAuthenticated ? 'Access Denied' : 'Authentication Required'}
            </h2>
            <p className="text-[var(--color-charcoal-600)] mb-6">
              {isAuthenticated 
                ? 'You do not have permission to submit census data. Only Enumerators and Supervisors can access this page.'
                : 'Please sign in to submit census data.'}
            </p>
            <Button onClick={() => router.push(isAuthenticated ? '/' : '/login')}>
              {isAuthenticated ? 'Go Home' : 'Sign In'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubmitPageContent() {
  const { user } = useAuth();
  
  // Step management
  const [step, setStep] = useState<Step>('consent');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Online/offline status
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
  
  // Consent data (stored in memory only)
  const [consentReceiptId, setConsentReceiptId] = useState<string | null>(null);
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);
  
  // Form data
  const [consentForm, setConsentForm] = useState<ConsentFormData>({
    stateCode: '',
    districtCode: '',
    blockCode: '',
    consentConfirmed: false,
  });
  
  const [submissionForm, setSubmissionForm] = useState<SubmissionFormData>({
    villageCode: '',
    householdCount: '',
    populationCount: '',
    casteCategory: '',
  });
  
  // Completion data (receipt only, no submitted values)
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);

  // =============================================================================
  // ONLINE/OFFLINE DETECTION
  // =============================================================================
  
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // =============================================================================
  // PENDING COUNT
  // =============================================================================
  
  const refreshPendingCount = useCallback(async () => {
    if (isOfflineStorageAvailable()) {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {
        // Silently fail - not critical
      }
    }
  }, []);
  
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // =============================================================================
  // GEOGRAPHY CASCADING RESET
  // =============================================================================
  
  const handleStateChange = useCallback((stateCode: string) => {
    setConsentForm(prev => ({
      ...prev,
      stateCode,
      districtCode: '', // Reset district when state changes
      blockCode: '',    // Reset block when state changes
    }));
  }, []);

  const handleDistrictChange = useCallback((districtCode: string) => {
    setConsentForm(prev => ({
      ...prev,
      districtCode,
      blockCode: '', // Reset block when district changes
    }));
  }, []);

  const handleBlockChange = useCallback((blockCode: string) => {
    setConsentForm(prev => ({
      ...prev,
      blockCode,
    }));
  }, []);

  // =============================================================================
  // CONSENT SUBMISSION
  // =============================================================================
  
  const handleConsentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!consentForm.consentConfirmed) {
      setError('You must confirm consent before proceeding.');
      setIsLoading(false);
      return;
    }

    try {
      const params: ConsentCreateParams = {
        stateCode: consentForm.stateCode,
        districtCode: consentForm.districtCode,
        blockCode: consentForm.blockCode,
        consentTextVersion: CONSENT_TEXT_VERSION,
      };

      const response = await createConsent(params);
      
      // Store consent receipt in memory ONLY
      setConsentReceiptId(response.receiptId);
      setConsentTimestamp(response.timestamp);
      
      // Move to submission step
      setStep('submission');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isNetworkError) {
          setError('Unable to connect to server. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // CENSUS SUBMISSION
  // =============================================================================
  
  const handleSubmissionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!consentReceiptId) {
      setError('Consent is required. Please complete the consent step first.');
      setIsLoading(false);
      return;
    }

    const householdCount = parseInt(submissionForm.householdCount, 10);
    const populationCount = parseInt(submissionForm.populationCount, 10);

    if (isNaN(householdCount) || householdCount < 0) {
      setError('Please enter a valid household count.');
      setIsLoading(false);
      return;
    }

    if (isNaN(populationCount) || populationCount < 0) {
      setError('Please enter a valid population count.');
      setIsLoading(false);
      return;
    }

    if (populationCount < householdCount) {
      setError('Population count must be at least equal to household count.');
      setIsLoading(false);
      return;
    }

    // Submission payload uses canonical codes (NEVER human-readable names)
    const submissionPayload = {
      stateCode: consentForm.stateCode,
      districtCode: consentForm.districtCode,
      blockCode: consentForm.blockCode,
      villageCode: submissionForm.villageCode,
      householdCount,
      populationCount,
      casteCategory: submissionForm.casteCategory,
    };

    try {
      if (isOnline) {
        // Online: Submit directly
        const params: SubmissionCreateParams = {
          consentReceiptId,
          ...submissionPayload,
        };

        const response = await createSubmission(params);
        
        // IMMEDIATELY discard form data
        setSubmissionForm({
          villageCode: '',
          householdCount: '',
          populationCount: '',
          casteCategory: '',
        });
        
        // Store ONLY receipt data
        setCompletionData({
          receiptId: response.receiptId,
          timestamp: response.timestamp,
          wasOffline: false,
        });
        
        setStep('complete');
      } else {
        // Offline: Save to IndexedDB
        if (!isOfflineStorageAvailable()) {
          setError('Offline storage is not available in this browser.');
          setIsLoading(false);
          return;
        }

        await savePendingSubmission(consentReceiptId, submissionPayload);
        
        // IMMEDIATELY discard form data
        setSubmissionForm({
          villageCode: '',
          householdCount: '',
          populationCount: '',
          casteCategory: '',
        });
        
        // Update pending count
        await refreshPendingCount();
        
        // Store completion data (pending)
        setCompletionData({
          receiptId: 'PENDING',
          timestamp: new Date().toISOString(),
          wasOffline: true,
        });
        
        setStep('complete');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isNetworkError && isOfflineStorageAvailable()) {
          // Network error - try to save offline
          try {
            await savePendingSubmission(consentReceiptId, submissionPayload);
            
            setSubmissionForm({
              villageCode: '',
              householdCount: '',
              populationCount: '',
              casteCategory: '',
            });
            
            await refreshPendingCount();
            
            setCompletionData({
              receiptId: 'PENDING',
              timestamp: new Date().toISOString(),
              wasOffline: true,
            });
            
            setStep('complete');
            return;
          } catch {
            setError('Failed to save submission offline. Please try again.');
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // SYNC PENDING SUBMISSIONS
  // =============================================================================
  
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResults(null);
    setError(null);

    try {
      const results = await syncPendingSubmissions(async (params) => {
        const response = await createSubmission(params);
        return { receiptId: response.receiptId, timestamp: response.timestamp };
      });

      setSyncResults(results);
      await refreshPendingCount();
    } catch (err) {
      setError('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // =============================================================================
  // START NEW SUBMISSION
  // =============================================================================
  
  const handleStartNew = () => {
    // Clear all state
    setConsentReceiptId(null);
    setConsentTimestamp(null);
    setConsentForm({
      stateCode: '',
      districtCode: '',
      blockCode: '',
      consentConfirmed: false,
    });
    setSubmissionForm({
      villageCode: '',
      householdCount: '',
      populationCount: '',
      casteCategory: '',
    });
    setCompletionData(null);
    setError(null);
    setSyncResults(null);
    setStep('consent');
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="py-12 md:py-20">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Census Data Submission</h1>
          <p className="text-lg text-[var(--color-charcoal-600)] max-w-2xl mx-auto">
            Submit aggregate census data for your assigned area. 
            All submissions require valid consent and are irreversible.
          </p>
        </div>

        {/* Online/Offline Status & Pending Count */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Badge variant={isOnline ? 'success' : 'warning'}>
            <span className="flex items-center gap-2">
              <span 
                className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--color-status-success)]' : 'bg-[var(--color-status-warning)]'}`} 
                style={{ animation: isOnline ? 'pulse-subtle 2s ease-in-out infinite' : 'none' }} 
              />
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </Badge>
          
          {pendingCount > 0 && (
            <Badge variant="info">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending submissions: {pendingCount}
              </span>
            </Badge>
          )}
        </div>

        {/* Sync Button (when pending and online) */}
        {pendingCount > 0 && isOnline && step !== 'complete' && (
          <div className="flex justify-center mb-8">
            <Button 
              variant="secondary" 
              onClick={handleSync}
              isLoading={isSyncing}
              disabled={isSyncing}
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </Button>
          </div>
        )}

        {/* Sync Results */}
        {syncResults && syncResults.length > 0 && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {syncResults.map((result, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg ${result.success ? 'bg-[var(--color-status-success)]/10' : 'bg-[var(--color-status-error)]/10'}`}
                    >
                      {result.success ? (
                        <div className="flex items-center gap-2 text-[var(--color-status-success)]">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Synced: Receipt ID <code className="font-mono text-sm">{result.receiptId}</code></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[var(--color-status-error)]">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Failed: {result.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setSyncResults(null)}
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <Disclaimer variant="warning">
              {error}
            </Disclaimer>
          </div>
        )}

        {/* Step Content */}
        {step === 'consent' && (
          <ConsentStep
            form={consentForm}
            onStateChange={handleStateChange}
            onDistrictChange={handleDistrictChange}
            onBlockChange={handleBlockChange}
            onConsentChange={(confirmed) => setConsentForm(prev => ({ ...prev, consentConfirmed: confirmed }))}
            onSubmit={handleConsentSubmit}
            isLoading={isLoading}
            isOnline={isOnline}
          />
        )}

        {step === 'submission' && (
          <SubmissionStep
            consentReceiptId={consentReceiptId!}
            consentTimestamp={consentTimestamp!}
            geographicData={{
              stateCode: consentForm.stateCode,
              districtCode: consentForm.districtCode,
              blockCode: consentForm.blockCode,
            }}
            form={submissionForm}
            setForm={setSubmissionForm}
            onSubmit={handleSubmissionSubmit}
            onBack={() => setStep('consent')}
            isLoading={isLoading}
            isOnline={isOnline}
          />
        )}

        {step === 'complete' && completionData && (
          <CompletionStep
            data={completionData}
            pendingCount={pendingCount}
            isOnline={isOnline}
            onSync={handleSync}
            isSyncing={isSyncing}
            onStartNew={handleStartNew}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CONSENT STEP
// =============================================================================

interface ConsentStepProps {
  form: ConsentFormData;
  onStateChange: (stateCode: string) => void;
  onDistrictChange: (districtCode: string) => void;
  onBlockChange: (blockCode: string) => void;
  onConsentChange: (confirmed: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  isOnline: boolean;
}

function ConsentStep({ 
  form, 
  onStateChange, 
  onDistrictChange, 
  onBlockChange,
  onConsentChange,
  onSubmit, 
  isLoading, 
  isOnline 
}: ConsentStepProps) {
  // Get options based on current selections
  const stateOptions = useMemo(() => getStateOptions(), []);
  const districtOptions = useMemo(() => getDistrictOptions(form.stateCode), [form.stateCode]);
  const blockOptions = useMemo(() => getBlockOptions(form.stateCode, form.districtCode), [form.stateCode, form.districtCode]);
  
  const hasDistricts = stateHasDistricts(form.stateCode);
  const hasBlocks = districtHasBlocks(form.stateCode, form.districtCode);

  return (
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

        {!isOnline && (
          <Disclaimer variant="warning" title="Offline Mode" className="mb-6">
            <p>
              You are currently offline. Consent capture requires an internet connection.
              Please connect to continue.
            </p>
          </Disclaimer>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Geography Privacy Notice */}
          <div className="bg-[var(--color-cream-50)] border border-[var(--color-cream-200)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-charcoal-600)]">
              <strong>Privacy Note:</strong> Geographic selections are used only for aggregation and policy analysis.
              Individual households or persons are never identified.
            </p>
          </div>

          {/* State Selection */}
          <Select
            label="State"
            options={stateOptions}
            placeholder="Select state"
            required
            value={form.stateCode}
            onChange={(e) => onStateChange(e.target.value)}
            disabled={isLoading || !isOnline}
          />

          {/* District Selection */}
          <Select
            label="District"
            options={districtOptions}
            placeholder={form.stateCode ? (hasDistricts ? "Select district" : "No districts available for this state") : "Select state first"}
            required
            value={form.districtCode}
            onChange={(e) => onDistrictChange(e.target.value)}
            disabled={isLoading || !isOnline || !form.stateCode || !hasDistricts}
          />

          {/* Block / Tehsil Selection */}
          <Select
            label="Block / Tehsil"
            options={blockOptions}
            placeholder={form.districtCode ? (hasBlocks ? "Select block / tehsil" : "No blocks available for this district") : "Select district first"}
            required
            value={form.blockCode}
            onChange={(e) => onBlockChange(e.target.value)}
            disabled={isLoading || !isOnline || !form.districtCode || !hasBlocks}
          />

          {/* State without data warning */}
          {form.stateCode && !hasDistricts && (
            <Disclaimer variant="info">
              <p>
                District and block data for {getStateName(form.stateCode)} is not yet available in this demo.
                Please select Maharashtra for the full experience.
              </p>
            </Disclaimer>
          )}

          {/* Consent Text Display */}
          <div className="bg-[var(--color-cream-50)] p-4 rounded-lg border border-[var(--color-cream-200)]">
            <h4 className="font-semibold text-[var(--color-navy-700)] mb-3">
              Consent Text (Version {CONSENT_TEXT_VERSION})
            </h4>
            <div className="text-sm text-[var(--color-charcoal-700)] whitespace-pre-line mb-4">
              {CONSENT_TEXT}
            </div>
            <label className="flex items-start gap-3 cursor-pointer border-t border-[var(--color-cream-200)] pt-4">
              <input
                type="checkbox"
                checked={form.consentConfirmed}
                onChange={(e) => onConsentChange(e.target.checked)}
                disabled={isLoading || !isOnline}
                className="mt-1 w-5 h-5 rounded border-[var(--color-charcoal-300)] text-[var(--color-navy-600)] focus:ring-[var(--color-navy-500)]"
              />
              <span className="text-sm text-[var(--color-charcoal-700)] font-medium">
                I confirm that the data subject has provided informed consent 
                for census data collection, as per the consent text above.
              </span>
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg" 
            isLoading={isLoading}
            disabled={!form.consentConfirmed || !form.stateCode || !form.districtCode || !form.blockCode || !isOnline}
          >
            Record Consent
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SUBMISSION STEP
// =============================================================================

interface SubmissionStepProps {
  consentReceiptId: string;
  consentTimestamp: string;
  geographicData: {
    stateCode: string;
    districtCode: string;
    blockCode: string;
  };
  form: SubmissionFormData;
  setForm: React.Dispatch<React.SetStateAction<SubmissionFormData>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  isLoading: boolean;
  isOnline: boolean;
}

function SubmissionStep({ 
  consentReceiptId, 
  consentTimestamp,
  geographicData,
  form, 
  setForm, 
  onSubmit, 
  onBack,
  isLoading,
  isOnline,
}: SubmissionStepProps) {
  // Get human-readable names for display
  const stateName = getStateName(geographicData.stateCode) || geographicData.stateCode;
  const districtName = getDistrictName(geographicData.stateCode, geographicData.districtCode) || geographicData.districtCode;
  const blockName = getBlockName(geographicData.stateCode, geographicData.districtCode, geographicData.blockCode) || geographicData.blockCode;

  return (
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
              <p className="text-sm text-[var(--color-charcoal-600)]">
                Receipt: <code className="font-mono text-xs">{consentReceiptId.substring(0, 8)}...</code>
              </p>
            </div>
          </div>
        </div>

        {/* Geographic Context (Read-only, human-readable) */}
        <div className="bg-[var(--color-cream-50)] rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-[var(--color-charcoal-500)] mb-2">Geographic Scope (from consent)</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-charcoal-500)]">State:</span>{' '}
              <span className="font-medium">{stateName}</span>
            </div>
            <div>
              <span className="text-[var(--color-charcoal-500)]">District:</span>{' '}
              <span className="font-medium">{districtName}</span>
            </div>
            <div>
              <span className="text-[var(--color-charcoal-500)]">Block:</span>{' '}
              <span className="font-medium">{blockName}</span>
            </div>
          </div>
        </div>

        {/* Irreversibility Warning */}
        <Disclaimer variant="warning" title="⚠️ IRREVERSIBLE SUBMISSION" className="mb-6">
          <p className="font-semibold">
            Once submitted, this data CANNOT be viewed, edited, or deleted.
          </p>
          <p className="mt-2">
            Only a receipt ID will be returned. The submitted values will never be displayed again.
            Verify all data carefully before submitting.
          </p>
        </Disclaimer>

        {!isOnline && (
          <Disclaimer variant="info" title="Offline Mode" className="mb-6">
            <p>
              You are offline. Your submission will be saved locally and synced when you reconnect.
            </p>
          </Disclaimer>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Census Data Privacy Notice */}
          <div className="bg-[var(--color-cream-50)] border border-[var(--color-cream-200)] rounded-lg p-4">
            <p className="text-sm text-[var(--color-charcoal-600)]">
              <strong>Data Note:</strong> Each submission represents aggregated data for a local community or
              household group, not an individual person.
            </p>
          </div>

          <div>
            <Input
              label="Village / Ward (Local Name)"
              type="text"
              placeholder="e.g., Wagholi, Andheri East, Ward 12"
              hint="Local village or ward name for reference only."
              required
              value={form.villageCode}
              onChange={(e) => setForm(prev => ({ ...prev, villageCode: e.target.value }))}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-[var(--color-charcoal-500)]">
              Village or ward names are not published and are not used for policy analysis.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Household Count"
              type="number"
              min="0"
              placeholder="e.g., 150"
              required
              value={form.householdCount}
              onChange={(e) => setForm(prev => ({ ...prev, householdCount: e.target.value }))}
              disabled={isLoading}
            />
            <Input
              label="Population Count"
              type="number"
              min="0"
              placeholder="e.g., 750"
              required
              value={form.populationCount}
              onChange={(e) => setForm(prev => ({ ...prev, populationCount: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <Select
            label="Caste Category"
            options={[...CASTE_CATEGORIES]}
            placeholder="Select category"
            hint="As declared by the community"
            required
            value={form.casteCategory}
            onChange={(e) => setForm(prev => ({ ...prev, casteCategory: e.target.value }))}
            disabled={isLoading}
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
              onClick={onBack}
              className="flex-1"
              disabled={isLoading}
            >
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              size="lg" 
              isLoading={isLoading}
              disabled={!form.villageCode || !form.householdCount || !form.populationCount || !form.casteCategory}
            >
              {isOnline ? 'Submit Data' : 'Save Offline'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPLETION STEP
// =============================================================================

interface CompletionStepProps {
  data: CompletionData;
  pendingCount: number;
  isOnline: boolean;
  onSync: () => void;
  isSyncing: boolean;
  onStartNew: () => void;
}

function CompletionStep({ data, pendingCount, isOnline, onSync, isSyncing, onStartNew }: CompletionStepProps) {
  return (
    <Card variant="elevated" className="max-w-2xl mx-auto text-center">
      <CardContent className="py-12">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          data.wasOffline 
            ? 'bg-[var(--color-status-warning)]/10' 
            : 'bg-[var(--color-status-success)]/10'
        }`}>
          {data.wasOffline ? (
            <svg className="w-10 h-10 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <h2 className="text-2xl font-serif font-bold text-[var(--color-navy-800)] mb-4">
          {data.wasOffline ? 'Submission Saved' : 'Submission Complete'}
        </h2>

        <p className="text-lg text-[var(--color-charcoal-600)] mb-8 max-w-md mx-auto">
          {data.wasOffline 
            ? 'Your submission has been saved offline and will be synced when you reconnect.'
            : 'Your census data has been recorded. This data is now write-only and cannot be retrieved or modified.'}
        </p>

        {/* Receipt Display */}
        <div className="bg-[var(--color-cream-50)] rounded-lg p-6 mb-8 max-w-sm mx-auto">
          <p className="text-sm text-[var(--color-charcoal-500)] mb-2">
            {data.wasOffline ? 'Status' : 'Submission Receipt'}
          </p>
          {data.wasOffline ? (
            <p className="font-semibold text-[var(--color-status-warning)]">
              Pending Sync
            </p>
          ) : (
            <p className="font-mono text-lg text-[var(--color-navy-800)]">
              {data.receiptId.substring(0, 8)}...
            </p>
          )}
          <p className="text-xs text-[var(--color-charcoal-400)] mt-2">
            {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Pending Count */}
        {pendingCount > 0 && (
          <div className="mb-8">
            <Badge variant="info" className="mb-4">
              {pendingCount} submission{pendingCount !== 1 ? 's' : ''} pending sync
            </Badge>
            {isOnline && (
              <div>
                <Button 
                  variant="secondary" 
                  onClick={onSync}
                  isLoading={isSyncing}
                  disabled={isSyncing}
                >
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        )}

        <Disclaimer variant="privacy" className="text-left mb-8">
          <p>
            <strong>Privacy Guarantee:</strong> This submission will be aggregated 
            with others and protected by k-anonymity and differential privacy 
            before any analytics are published.
          </p>
          <p className="mt-2">
            <strong>No Data Echo:</strong> The submitted values (caste, household count, 
            population count) are NOT displayed here and cannot be retrieved.
          </p>
        </Disclaimer>

        <Button onClick={onStartNew} size="lg">
          Submit Another Entry
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// STEP INDICATOR
// =============================================================================

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
