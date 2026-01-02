'use client';

import { AuthProvider } from '@/lib/authContext';
import { type ReactNode } from 'react';

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

