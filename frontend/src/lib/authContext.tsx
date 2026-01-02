'use client';

/**
 * Auth Context for React Components
 * 
 * RESPONSIBILITY: Provide auth state to React component tree.
 * 
 * MUST:
 * - Use the apiClient for all auth operations
 * - Keep auth state in memory only (via apiClient)
 * - Provide loading states for async operations
 * - Clear state on logout
 * 
 * MUST NEVER:
 * - Store tokens in localStorage/sessionStorage/cookies
 * - Bypass the apiClient guardrails
 * - Expose token directly to components
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated,
  type LoginResponse,
  ApiError,
} from './apiClient';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  username: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  isAuthenticated: boolean;
}

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
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response: LoginResponse = await apiLogin(username, password);
      setUser(response.user);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user and clear all state.
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

  const value: AuthContextValue = {
    user,
    isLoading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: isAuthenticated() && user !== null,
  };

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
// GUARD COMPONENT
// =============================================================================

export interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  allowedRoles?: string[];
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

