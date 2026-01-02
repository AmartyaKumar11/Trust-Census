'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface DisclaimerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'privacy';
  title?: string;
}

export function Disclaimer({
  className,
  variant = 'info',
  title,
  children,
  ...props
}: DisclaimerProps) {
  const variants = {
    info: {
      container: 'bg-[var(--color-status-info)]/5 border-[var(--color-status-info)]/20',
      icon: 'text-[var(--color-status-info)]',
      title: 'text-[var(--color-status-info)]',
    },
    warning: {
      container: 'bg-[var(--color-status-warning)]/5 border-[var(--color-status-warning)]/20',
      icon: 'text-[var(--color-status-warning)]',
      title: 'text-[var(--color-status-warning)]',
    },
    privacy: {
      container: 'bg-[var(--color-gold-50)] border-[var(--color-gold-200)]',
      icon: 'text-[var(--color-gold-600)]',
      title: 'text-[var(--color-gold-800)]',
    },
  };

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    privacy: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variants[variant].container,
        className
      )}
      role="note"
      {...props}
    >
      <div className="flex gap-3">
        <div className={cn('flex-shrink-0', variants[variant].icon)}>
          {icons[variant]}
        </div>
        <div className="flex-1">
          {title && (
            <h4 className={cn('font-semibold text-sm mb-1', variants[variant].title)}>
              {title}
            </h4>
          )}
          <div className="text-sm text-[var(--color-charcoal-700)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
