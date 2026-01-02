/**
 * Trust-First API Client
 * 
 * RESPONSIBILITY: Single gateway for ALL backend API requests.
 * 
 * MUST:
 * - Route ALL requests through this module
 * - Enforce endpoint allowlist (deny-by-default)
 * - Enforce request intent (READ=GET, WRITE=POST)
 * - Validate request parameters against fixed shapes
 * - Store auth tokens in memory only
 * - Fail closed on any error
 * 
 * MUST NEVER:
 * - Allow direct fetch() calls from components
 * - Store tokens in localStorage/sessionStorage/cookies/IndexedDB
 * - Silently retry failed requests
 * - Expose backend error details to UI
 * - Allow dynamic query construction
 * - Accept extra parameters not in endpoint definition
 */

// =============================================================================
// TYPES
// =============================================================================

/** Request intent - determines allowed HTTP method */
export type RequestIntent = 'READ' | 'WRITE';

/** Endpoint definition with strict typing */
export interface EndpointDefinition<TParams = void, TResponse = unknown> {
  /** API path (relative to base URL) */
  path: string;
  /** Request intent - READ uses GET, WRITE uses POST */
  intent: RequestIntent;
  /** Allowed parameter keys (empty array = no params allowed) */
  allowedParams: readonly string[];
  /** Human-readable description for debugging */
  description: string;
  /** Phantom types for compile-time safety */
  _params?: TParams;
  _response?: TResponse;
}

/** API error with safe message only */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isNetworkError: boolean;

  constructor(message: string, statusCode: number = 0, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** Guardrail violation error */
export class GuardrailViolationError extends Error {
  constructor(message: string) {
    super(`[GUARDRAIL VIOLATION] ${message}`);
    this.name = 'GuardrailViolationError';
    Object.setPrototypeOf(this, GuardrailViolationError.prototype);
  }
}

// =============================================================================
// REQUEST & RESPONSE TYPES
// =============================================================================

// Auth types
export interface LoginParams {
  username: string;
  password: string;
}

/** Geographic scope - immutable after login */
export interface GeographicScope {
  stateCode: string | null;
  districtCode: string | null;
  blockCode: string | null;
  villageCode: string | null;
}

/** User roles enum */
export type UserRole =
  | 'CITIZEN'
  | 'ENUMERATOR'
  | 'SUPERVISOR'
  | 'STATE_ANALYST'
  | 'CENTRAL_POLICY_VIEWER';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
    geographicScope?: GeographicScope;
  };
}

// Consent types
export interface ConsentCreateParams {
  stateCode: string;
  districtCode: string;
  blockCode: string;
  consentTextVersion: string;
}

export interface ConsentCreateResponse {
  receiptId: string;
  timestamp: string;
}

// Submission types
export interface SubmissionCreateParams {
  consentReceiptId: string;
  stateCode: string;
  districtCode: string;
  blockCode: string;
  villageCode: string;
  householdCount: number;
  populationCount: number;
  casteCategory: string;
}

export interface SubmissionCreateResponse {
  receiptId: string;
  timestamp: string;
}

export interface SubmissionVerifyParams {
  receiptId: string;
}

export interface SubmissionVerifyResponse {
  exists: boolean;
  timestamp?: string;
}

// Analytics types
export interface AnalyticsStateParams {
  stateCode: string;
  windowId?: string;
}

export interface AnalyticsNationalParams {
  windowId?: string;
}

export interface AnalyticsWindowsParams {
  // No params - returns available windows
}

export interface AggregateData {
  category: string;
  populationEstimate: number;
  submissionCount: number;
  privacyDisclaimer: string;
}

export interface AnalyticsStateResponse {
  stateCode: string;
  stateName: string;
  windowId: string;
  aggregates: AggregateData[];
  generatedAt: string;
  privacyNotice: string;
}

export interface AnalyticsNationalResponse {
  windowId: string;
  aggregates: AggregateData[];
  generatedAt: string;
  privacyNotice: string;
}

export interface AnalyticsWindowsResponse {
  windows: Array<{
    windowId: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

// =============================================================================
// ENDPOINT ALLOWLIST (DENY-BY-DEFAULT)
// =============================================================================

/**
 * ALLOWED_ENDPOINTS: Explicit allowlist of all permitted API endpoints.
 * 
 * ANY endpoint not in this list will be REJECTED.
 * This is a security guardrail to prevent accidental access to forbidden endpoints.
 */
export const ALLOWED_ENDPOINTS = {
  // Authentication
  'auth.login': {
    path: '/auth/login',
    intent: 'WRITE',
    allowedParams: ['username', 'password'],
    description: 'Authenticate user and receive JWT token',
  } as EndpointDefinition<LoginParams, LoginResponse>,

  // Consent
  'consent.create': {
    path: '/consent/capture',
    intent: 'WRITE',
    allowedParams: ['stateCode', 'districtCode', 'blockCode', 'consentTextVersion'],
    description: 'Create consent record before data collection',
  } as EndpointDefinition<ConsentCreateParams, ConsentCreateResponse>,

  // Submissions
  'submissions.create': {
    path: '/submissions',
    intent: 'WRITE',
    allowedParams: [
      'consentReceiptId',
      'stateCode',
      'districtCode',
      'blockCode',
      'villageCode',
      'householdCount',
      'populationCount',
      'casteCategory',
    ],
    description: 'Submit census data (write-only, no read-back)',
  } as EndpointDefinition<SubmissionCreateParams, SubmissionCreateResponse>,

  'submissions.verifyReceipt': {
    path: '/submissions/receipt',
    intent: 'READ',
    allowedParams: ['receiptId'],
    description: 'Verify submission receipt exists (no data returned)',
  } as EndpointDefinition<SubmissionVerifyParams, SubmissionVerifyResponse>,

  // Analytics (read-only)
  'analytics.stateAggregates': {
    path: '/analytics/aggregates/state',
    intent: 'READ',
    allowedParams: ['stateCode', 'windowId'],
    description: 'Read state-level aggregated data (privacy-protected)',
  } as EndpointDefinition<AnalyticsStateParams, AnalyticsStateResponse>,

  'analytics.nationalAggregates': {
    path: '/analytics/aggregates/national',
    intent: 'READ',
    allowedParams: ['windowId'],
    description: 'Read national-level aggregated data (privacy-protected)',
  } as EndpointDefinition<AnalyticsNationalParams, AnalyticsNationalResponse>,

  'analytics.windows': {
    path: '/analytics/windows',
    intent: 'READ',
    allowedParams: [],
    description: 'List available aggregation time windows',
  } as EndpointDefinition<AnalyticsWindowsParams, AnalyticsWindowsResponse>,
} as const;

/** Type for endpoint keys */
export type EndpointKey = keyof typeof ALLOWED_ENDPOINTS;

// =============================================================================
// AUTH TOKEN MANAGEMENT (MEMORY ONLY)
// =============================================================================

/**
 * Auth token stored in module scope (memory only).
 * 
 * SECURITY: Token is NEVER persisted to:
 * - localStorage
 * - sessionStorage
 * - cookies
 * - IndexedDB
 * 
 * Token is lost on page refresh (intentional).
 */
let authToken: string | null = null;

/** Set auth token (call after successful login) */
export function setAuthToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new GuardrailViolationError('Invalid token provided');
  }
  authToken = token;
}

/** Clear auth token (call on logout) */
export function clearAuthToken(): void {
  authToken = null;
}

/** Check if user is authenticated */
export function isAuthenticated(): boolean {
  return authToken !== null;
}

/** Get current token (internal use only) */
function getAuthToken(): string | null {
  return authToken;
}

// =============================================================================
// API CLIENT CONFIGURATION
// =============================================================================

/** API base URL - configured via environment */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// =============================================================================
// PARAMETER VALIDATION
// =============================================================================

/**
 * Validate request parameters against endpoint definition.
 * Rejects any parameters not in the allowedParams list.
 */
function validateParams(
  endpointKey: EndpointKey,
  params: Record<string, unknown> | object | undefined
): Record<string, unknown> {
  const endpoint = ALLOWED_ENDPOINTS[endpointKey];
  const allowedParams = new Set(endpoint.allowedParams);

  if (!params) {
    if (allowedParams.size > 0) {
      // Some endpoints may have optional params, so empty is OK
      return {};
    }
    return {};
  }

  const validatedParams: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!allowedParams.has(key)) {
      throw new GuardrailViolationError(
        `Parameter '${key}' is not allowed for endpoint '${endpointKey}'. ` +
        `Allowed: [${endpoint.allowedParams.join(', ')}]`
      );
    }
    validatedParams[key] = value;
  }

  return validatedParams;
}

// =============================================================================
// RESPONSE VALIDATION
// =============================================================================

/**
 * Minimal response validation to ensure basic shape is correct.
 * Does not validate all fields - backend is trusted for data integrity.
 */
function validateResponse(data: unknown): void {
  if (data === null || data === undefined) {
    throw new ApiError('Empty response from server', 0, false);
  }

  if (typeof data !== 'object') {
    throw new ApiError('Invalid response format', 0, false);
  }
}

// =============================================================================
// CORE API REQUEST FUNCTION
// =============================================================================

/**
 * Execute an API request through the guardrailed client.
 * 
 * @param endpointKey - Key from ALLOWED_ENDPOINTS
 * @param params - Request parameters (validated against endpoint definition)
 * @param options - Additional options (e.g., skip auth for login)
 * @returns Promise resolving to typed response
 * @throws ApiError on network or server errors
 * @throws GuardrailViolationError on security violations
 */
export async function apiRequest<K extends EndpointKey>(
  endpointKey: K,
  params?: Record<string, unknown> | object,
  options: { skipAuth?: boolean } = {}
): Promise<typeof ALLOWED_ENDPOINTS[K] extends EndpointDefinition<unknown, infer R> ? R : unknown> {
  // 1. Verify endpoint is in allowlist
  if (!(endpointKey in ALLOWED_ENDPOINTS)) {
    throw new GuardrailViolationError(
      `Endpoint '${endpointKey}' is not in the allowed endpoints list. ` +
      `This request has been blocked.`
    );
  }

  const endpoint = ALLOWED_ENDPOINTS[endpointKey];

  // 2. Validate parameters
  const validatedParams = validateParams(endpointKey, params);

  // 3. Determine HTTP method from intent
  const method = endpoint.intent === 'WRITE' ? 'POST' : 'GET';

  // 4. Check auth token (unless explicitly skipped for login)
  if (!options.skipAuth && !getAuthToken()) {
    throw new ApiError('Authentication required', 401, false);
  }

  // 5. Build request URL and options
  let url = `${API_BASE_URL}${endpoint.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options.skipAuth && getAuthToken()) {
    headers['Authorization'] = `Bearer ${getAuthToken()}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // 6. Handle params based on method
  if (method === 'GET' && Object.keys(validatedParams).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(validatedParams)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    url = `${url}?${searchParams.toString()}`;
  } else if (method === 'POST') {
    fetchOptions.body = JSON.stringify(validatedParams);
  }

  // 7. Execute request (no retries, fail closed)
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    // Network error - no response received
    throw new ApiError(
      'Unable to connect to server. Please check your connection.',
      0,
      true
    );
  }

  // 8. Handle HTTP errors
  if (!response.ok) {
    // Map common status codes to safe messages
    const safeMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication required. Please sign in.',
      403: 'Access denied. You do not have permission for this action.',
      404: 'Resource not found.',
      409: 'Conflict. This action cannot be completed.',
      422: 'Invalid data provided.',
      429: 'Too many requests. Please wait and try again.',
      500: 'Server error. Please try again later.',
      502: 'Server temporarily unavailable.',
      503: 'Service unavailable. Please try again later.',
    };

    const message = safeMessages[response.status] || 'An error occurred. Please try again.';
    throw new ApiError(message, response.status, false);
  }

  // 9. Parse and validate response
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Invalid response from server', 0, false);
  }

  validateResponse(data);

  // 10. Return typed response
  return data as typeof ALLOWED_ENDPOINTS[K] extends EndpointDefinition<unknown, infer R> ? R : unknown;
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

/**
 * Login and store token in memory.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await apiRequest('auth.login', { username, password }, { skipAuth: true });
  setAuthToken(response.token);
  return response;
}

/**
 * Logout and clear token from memory.
 */
export function logout(): void {
  clearAuthToken();
}

/**
 * Create consent record.
 */
export async function createConsent(params: ConsentCreateParams): Promise<ConsentCreateResponse> {
  return apiRequest('consent.create', params);
}

/**
 * Submit census data.
 */
export async function createSubmission(params: SubmissionCreateParams): Promise<SubmissionCreateResponse> {
  return apiRequest('submissions.create', params);
}

/**
 * Verify submission receipt.
 * Note: Uses path parameter, not query parameter.
 */
export async function verifySubmissionReceipt(receiptId: string): Promise<SubmissionVerifyResponse> {
  // The backend uses /submissions/receipt/:receiptId format
  // We need to make a direct fetch call with the receipt ID in the path
  const token = authToken;
  if (!token) {
    throw new ApiError('Authentication required', 401, false);
  }

  const url = `${API_BASE_URL}/submissions/receipt/${encodeURIComponent(receiptId)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { exists: false };
      }
      throw new ApiError('Failed to verify receipt', response.status, false);
    }

    const data = await response.json();
    return {
      exists: data.exists,
      timestamp: data.timestamp,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to connect to server', 0, true);
  }
}

/**
 * Get state-level aggregates.
 */
export async function getStateAggregates(stateCode: string, windowId?: string): Promise<AnalyticsStateResponse> {
  const response: any = await apiRequest('analytics.stateAggregates', { stateCode, windowId });

  // Transform backend response to frontend format
  // Backend returns: {disclaimer, data: [{caste_category, noisy_population, geographic_code, ...}], count}
  // Frontend expects: {stateCode, stateName, windowId, aggregates: [{category, populationEstimate, ...}], ...}

  if (!response.data || response.data.length === 0) {
    throw new ApiError('No data available for this state', 404);
  }

  const firstRecord = response.data[0];
  const stateCodeFromData = firstRecord.geographic_code;

  // Map state codes to names
  const stateNames: Record<string, string> = {
    'MH': 'Maharashtra',
    'KA': 'Karnataka',
    'TN': 'Tamil Nadu',
    'DL': 'Delhi',
    'UP': 'Uttar Pradesh',
    'WB': 'West Bengal',
    'GJ': 'Gujarat',
    'RJ': 'Rajasthan',
    'AP': 'Andhra Pradesh',
    'TG': 'Telangana',
  };

  // Transform aggregates
  const aggregates: AggregateData[] = response.data.map((item: any) => ({
    category: item.caste_category,
    populationEstimate: item.noisy_population || 0,
    submissionCount: item.noisy_submission_count || 0,
    privacyDisclaimer: response.disclaimer?.notice || 'Privacy-protected estimate',
  }));

  return {
    stateCode: stateCodeFromData,
    stateName: stateNames[stateCodeFromData] || stateCodeFromData,
    windowId: firstRecord.aggregation_window_id || windowId || 'current',
    aggregates,
    generatedAt: firstRecord.computed_at || new Date().toISOString(),
    privacyNotice: response.disclaimer?.notice || 'Values are privacy-preserving estimates with differential privacy noise applied.',
  };
}

/**
 * Get national-level aggregates.
 */
export async function getNationalAggregates(windowId?: string): Promise<AnalyticsNationalResponse> {
  return apiRequest('analytics.nationalAggregates', { windowId });
}

/**
 * Get available aggregation windows.
 */
export async function getAnalyticsWindows(): Promise<AnalyticsWindowsResponse> {
  return apiRequest('analytics.windows');
}

// =============================================================================
// FORBIDDEN OPERATIONS (EXPLICIT DENIALS)
// =============================================================================

/**
 * These functions exist to make forbidden operations explicit.
 * They always throw, documenting what is NOT allowed.
 */

/** Raw submissions are NEVER readable */
export function getRawSubmissions(): never {
  throw new GuardrailViolationError(
    'Raw submission data is not accessible. ' +
    'This is a trust-first system where individual records cannot be read.'
  );
}

/** Data export is NEVER allowed */
export function exportData(): never {
  throw new GuardrailViolationError(
    'Data export is not permitted. ' +
    'This system does not support bulk data downloads.'
  );
}

/** District-level data is NOT accessible via frontend */
export function getDistrictAggregates(): never {
  throw new GuardrailViolationError(
    'District-level aggregates are not accessible from the frontend. ' +
    'Only state and national level data is available.'
  );
}

/** Village-level data is NOT accessible */
export function getVillageData(): never {
  throw new GuardrailViolationError(
    'Village-level data is not accessible. ' +
    'This granularity is not permitted for privacy reasons.'
  );
}

