'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Disclaimer } from '@/components/ui';

interface SystemComponent {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  description: string;
  lastCheck: Date;
}

export default function SystemStatusPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [components] = useState<SystemComponent[]>([
    {
      name: 'API Server',
      status: 'operational',
      description: 'Handles authentication, consent, and submissions',
      lastCheck: new Date(),
    },
    {
      name: 'Database (PostgreSQL)',
      status: 'operational',
      description: 'Primary data store with role-based access',
      lastCheck: new Date(),
    },
    {
      name: 'Audit Logging',
      status: 'operational',
      description: 'Mandatory audit trail for all actions',
      lastCheck: new Date(),
    },
    {
      name: 'Authentication Service',
      status: 'operational',
      description: 'JWT-based authentication and authorization',
      lastCheck: new Date(),
    },
    {
      name: 'Aggregation Worker',
      status: 'maintenance',
      description: 'Offline batch processing (scheduled)',
      lastCheck: new Date(Date.now() - 3600000),
    },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: SystemComponent['status']) => {
    switch (status) {
      case 'operational':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'error';
      case 'maintenance':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: SystemComponent['status']) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      case 'maintenance':
        return 'Scheduled';
      default:
        return 'Unknown';
    }
  };

  const allOperational = components.every(
    (c) => c.status === 'operational' || c.status === 'maintenance'
  );

  return (
    <div className="py-12 md:py-20">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-4">System Status</h1>
          <p className="text-lg text-[var(--color-charcoal-600)] mb-6">
            Real-time status of Trust-First Census System components
          </p>
          
          {/* Wall Clock */}
          <div className="inline-block bg-[var(--color-navy-900)] text-white px-8 py-4 rounded-xl">
            <p className="text-xs text-[var(--color-cream-400)] mb-1">Current Time (IST)</p>
            <p className="font-mono text-3xl">
              {currentTime.toLocaleTimeString('en-IN', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-sm text-[var(--color-cream-300)] mt-1">
              {currentTime.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Overall Status */}
        <Card variant="elevated" className="mb-8">
          <CardContent className="text-center py-8">
            {allOperational ? (
              <>
                <div className="w-16 h-16 bg-[var(--color-status-success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-serif font-bold text-[var(--color-status-success)] mb-2">All Systems Operational</h2>
                <p className="text-[var(--color-charcoal-600)]">
                  All critical components are functioning normally.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-[var(--color-status-warning)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--color-status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-serif font-bold text-[var(--color-status-warning)] mb-2">Partial Outage</h2>
                <p className="text-[var(--color-charcoal-600)]">
                  Some components are experiencing issues.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Component Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Component Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--color-cream-200)]">
              {components.map((component, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-[var(--color-cream-50)]">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      component.status === 'operational' ? 'bg-[var(--color-status-success)]' :
                      component.status === 'degraded' ? 'bg-[var(--color-status-warning)]' :
                      component.status === 'down' ? 'bg-[var(--color-status-error)]' :
                      'bg-[var(--color-status-info)]'
                    }`} />
                    <div>
                      <p className="font-medium text-[var(--color-navy-800)]">{component.name}</p>
                      <p className="text-sm text-[var(--color-charcoal-500)]">{component.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusColor(component.status) as 'success' | 'warning' | 'error' | 'info'}>
                      {getStatusLabel(component.status)}
                    </Badge>
                    <p className="text-xs text-[var(--color-charcoal-400)] mt-1">
                      Last check: {component.lastCheck.toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-[var(--color-status-success)] rounded-full" />
                  Audit logging active
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-[var(--color-status-success)] rounded-full" />
                  Role separation enforced
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-[var(--color-status-success)] rounded-full" />
                  Fail-closed behavior active
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-[var(--color-status-success)] rounded-full" />
                  No super-admin role detected
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-status-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Scheduled Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center justify-between text-sm">
                  <span>Micro-aggregation (L1→L2)</span>
                  <span className="text-[var(--color-charcoal-500)]">Daily, 02:00 IST</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span>Macro-aggregation (L2→L3)</span>
                  <span className="text-[var(--color-charcoal-500)]">Weekly, Sunday 03:00 IST</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span>Audit log backup</span>
                  <span className="text-[var(--color-charcoal-500)]">Daily, 04:00 IST</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Notice */}
        <Disclaimer variant="info">
          <p>
            <strong>UI Demonstration:</strong> This status page displays simulated data. 
            In production, component status would be fetched from health check endpoints.
          </p>
        </Disclaimer>
      </div>
    </div>
  );
}
