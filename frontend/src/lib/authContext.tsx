'use client';

/**
 * Auth Context for React Components
 * 
 * RESPONSIBILITY: Provide auth state to React component tree.
 * 
 * MUST:
 * - Use the apiClient for all auth operations
 * - Keep auth state in memory only (via apiClient)
 * - Store role and geographic scope immutably
 * - Provide loading states for async operations
 * - Clear state on logout
 * 
 * MUST NEVER:
 * - Store tokens in localStorage/sessionStorage/cookies
 * - Bypass the apiClient guardrails
 * - Expose token directly to components
 * - Allow modification of role or scope after login
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated as checkIsAuthenticated,
  type LoginResponse,
  type UserRole,
  type GeographicScope,
  ApiError,
} from './apiClient';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  username: string;
  role: UserRole;
  geographicScope: GeographicScope | null;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  /** Attempt to log in with credentials */
  login: (username: string, password: string) => Promise<boolean>;
  /** Log out and clear all auth state */
  logout: () => void;
  /** Clear current error message */
  clearError: () => void;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Current user role (null if not authenticated) */
  userRole: UserRole | null;
  /** Current geographic scope (null if not authenticated or no scope) */
  geographicScope: GeographicScope | null;
  /** Check if user has one of the specified roles */
  hasRole: (...roles: UserRole[]) => boolean;
  /** Check if user can access a specific state */
  canAccessState: (stateCode: string) => boolean;
}

// =============================================================================
// DEFAULT SCOPE (for users without geographic restrictions)
// =============================================================================

const UNRESTRICTED_SCOPE: GeographicScope = {
  stateCode: null,
  districtCode: null,
  blockCode: null,
  villageCode: null,
};

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Login user via apiClient.
   * Token is stored in apiClient module scope (memory only).
   * Role and scope are stored immutably in context.
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response: LoginResponse = await apiLogin(username, password);
      
      // Create immutable user object
      const authenticatedUser: User = Object.freeze({
        id: response.user.id,
        username: response.user.username,
        role: response.user.role,
        geographicScope: response.user.geographicScope 
          ? Object.freeze({ ...response.user.geographicScope })
          : null,
      });
      
      setUser(authenticatedUser);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user and clear all state.
   * Token is cleared from apiClient memory.
   */
  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setError(null);
  }, []);

  /**
   * Clear error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if user has one of the specified roles.
   */
  const hasRole = useCallback((...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  /**
   * Check if user can access a specific state.
   * Central Policy Viewers can access all states.
   * State Analysts can only access their assigned state.
   */
  const canAccessState = useCallback((stateCode: string): boolean => {
    if (!user) return false;
    
    // Central Policy Viewers can access all states
    if (user.role === 'CENTRAL_POLICY_VIEWER') return true;
    
    // Users without scope restriction can access all
    if (!user.geographicScope || !user.geographicScope.stateCode) return true;
    
    // Check if user's scope matches the requested state
    return user.geographicScope.stateCode === stateCode;
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: checkIsAuthenticated() && user !== null,
    userRole: user?.role ?? null,
    geographicScope: user?.geographicScope ?? null,
    hasRole,
    canAccessState,
  }), [user, isLoading, error, login, logout, clearError, hasRole, canAccessState]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access auth context.
 * Must be used within AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// =============================================================================
// GUARD COMPONENTS
// =============================================================================

export interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Component that requires authentication.
 * Renders fallback if user is not authenticated or doesn't have required role.
 */
export function RequireAuth({ 
  children, 
  fallback = null,
  allowedRoles,
}: RequireAuthProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export interface ShowForRolesProps {
  children: ReactNode;
  roles: UserRole[];
}

/**
 * Component that only renders for specific roles.
 * Renders nothing if user doesn't have one of the specified roles.
 */
export function ShowForRoles({ children, roles }: ShowForRolesProps) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return null;
  }

  return <>{children}</>;
}

// =============================================================================
// ROLE DISPLAY HELPERS
// =============================================================================

/** Human-readable role names */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  CITIZEN: 'Citizen',
  ENUMERATOR: 'Enumerator',
  SUPERVISOR: 'Supervisor',
  STATE_ANALYST: 'State Analyst',
  CENTRAL_POLICY_VIEWER: 'Central Policy Viewer',
};

/** Get human-readable role name */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

// Re-export types for convenience
export type { UserRole, GeographicScope };
