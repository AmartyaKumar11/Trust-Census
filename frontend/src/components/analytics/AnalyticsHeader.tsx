/**
 * Analytics Header
 * 
 * Reusable header component for analytics pages.
 * Static, no interactivity.
 */

interface AnalyticsHeaderProps {
    title: string;
    subtitle: string;
}

export function AnalyticsHeader({ title, subtitle }: AnalyticsHeaderProps) {
    return (
        <div className="mb-8">
            <h1 className="mb-3">{title}</h1>
            <p className="text-lg text-[var(--color-charcoal-600)] max-w-3xl">
                {subtitle}
            </p>
        </div>
    );
}
