// Utility functions
export { cn, formatNumber, formatDate, isOnline, debounce, generateId } from './utils';

// API Client (guardrailed)
export {
  // Core request function
  apiRequest,
  
  // Auth functions
  login,
  logout,
  setAuthToken,
  clearAuthToken,
  isAuthenticated,
  
  // Consent functions
  createConsent,
  
  // Submission functions
  createSubmission,
  verifySubmissionReceipt,
  
  // Analytics functions
  getStateAggregates,
  getNationalAggregates,
  getAnalyticsWindows,
  
  // Forbidden operations (always throw)
  getRawSubmissions,
  exportData,
  getDistrictAggregates,
  getVillageData,
  
  // Types
  type EndpointKey,
  type RequestIntent,
  type LoginParams,
  type LoginResponse,
  type ConsentCreateParams,
  type ConsentCreateResponse,
  type SubmissionCreateParams,
  type SubmissionCreateResponse,
  type SubmissionVerifyParams,
  type SubmissionVerifyResponse,
  type AnalyticsStateParams,
  type AnalyticsStateResponse,
  type AnalyticsNationalParams,
  type AnalyticsNationalResponse,
  type AnalyticsWindowsParams,
  type AnalyticsWindowsResponse,
  type AggregateData,
  
  // Error types
  ApiError,
  GuardrailViolationError,
  
  // Endpoint definitions (for reference)
  ALLOWED_ENDPOINTS,
} from './apiClient';

// Auth Context
export {
  AuthProvider,
  useAuth,
  RequireAuth,
  ShowForRoles,
  getRoleDisplayName,
  ROLE_DISPLAY_NAMES,
  type User,
  type AuthState,
  type AuthContextValue,
  type AuthProviderProps,
  type RequireAuthProps,
  type ShowForRolesProps,
  type UserRole,
  type GeographicScope,
} from './authContext';

// Offline Storage
export {
  savePendingSubmission,
  getPendingCount,
  syncPendingSubmissions,
  clearAllPending,
  isOfflineStorageAvailable,
  type PendingSubmission,
  type SyncResult,
} from './offlineStorage';

