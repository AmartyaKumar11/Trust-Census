'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-[var(--color-cream-200)] text-[var(--color-charcoal-700)]',
    success: 'bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]',
    warning: 'bg-[var(--color-status-warning)]/10 text-[var(--color-status-warning)]',
    error: 'bg-[var(--color-status-error)]/10 text-[var(--color-status-error)]',
    info: 'bg-[var(--color-status-info)]/10 text-[var(--color-status-info)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
