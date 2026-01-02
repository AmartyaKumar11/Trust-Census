'use client';

import Link from 'next/link';

const footerLinks = {
  system: [
    { name: 'Principles', href: '/principles' },
    { name: 'Architecture', href: '/architecture' },
    { name: 'System Status', href: '/system-status' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Use', href: '/terms' },
    { name: 'Accessibility', href: '/accessibility' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-navy-900)] text-[var(--color-cream-200)]">
      <div className="container-wide py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--color-cream-100)] rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--color-navy-700)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <span className="font-serif font-bold text-lg text-white">
                Trust Census
              </span>
            </div>
            <p className="text-sm text-[var(--color-cream-400)] max-w-md leading-relaxed">
              A trust-first, privacy-by-design census data collection system. 
              Built to make misuse architecturally impossible, not just discouraged.
            </p>
            <div className="mt-6 p-4 bg-[var(--color-navy-800)]/50 rounded-lg border border-[var(--color-navy-700)]">
              <p className="text-xs text-[var(--color-cream-300)]">
                <strong className="text-[var(--color-gold-400)]">Privacy Guarantee:</strong> No individual 
                records are ever accessible. All published data is aggregated with 
                k-anonymity and differential privacy protections.
              </p>
            </div>
          </div>

          {/* System Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">System</h3>
            <ul className="space-y-3">
              {footerLinks.system.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-cream-400)] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-cream-400)] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[var(--color-navy-700)]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[var(--color-cream-500)]">
              © {currentYear} Trust-First Census System. All rights reserved.
            </p>
            <p className="text-xs text-[var(--color-cream-500)]">
              Designed for Government of India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
