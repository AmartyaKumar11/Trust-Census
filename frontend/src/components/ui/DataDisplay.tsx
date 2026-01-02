'use client';

import { type HTMLAttributes } from 'react';
import { cn, formatNumber } from '@/lib/utils';

export interface DataDisplayProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  isEstimate?: boolean;
}

export function DataDisplay({
  className,
  label,
  value,
  unit,
  trend,
  isEstimate = true,
  ...props
}: DataDisplayProps) {
  const formattedValue = typeof value === 'number' ? formatNumber(value) : value;

  const trendColors = {
    up: 'text-[var(--color-status-success)]',
    down: 'text-[var(--color-status-error)]',
    neutral: 'text-[var(--color-charcoal-500)]',
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        'bg-[var(--color-cream-50)] border border-[var(--color-cream-300)] rounded-lg p-4',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-[var(--color-charcoal-500)] uppercase tracking-wider">
          {label}
        </p>
        {trend && (
          <span className={cn('flex items-center', trendColors[trend])}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold text-[var(--color-navy-800)]">
          {formattedValue}
        </span>
        {unit && <span className="text-sm text-[var(--color-charcoal-500)]">{unit}</span>}
      </div>
      {isEstimate && (
        <p className="mt-2 text-xs text-[var(--color-charcoal-400)] italic">
          * Privacy-preserving estimate
        </p>
      )}
    </div>
  );
}

// Grouped data display for multiple values
export interface DataGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
}

export function DataGroup({ className, title, children, ...props }: DataGroupProps) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {title && (
        <h3 className="font-serif text-lg text-[var(--color-navy-700)]">{title}</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}
