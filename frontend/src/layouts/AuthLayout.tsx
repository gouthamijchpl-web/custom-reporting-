import type { ReactNode } from 'react';
import { BrandLogo, LayersIcon, ShieldIcon, SlidersIcon } from '@/components/icons';
import './AuthLayout.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row rendered under the card, such as "Don't have an account? Sign Up". */
  footer?: ReactNode;
  /** Visually connects the product story and form in the primary login experience. */
  connected?: boolean;
}

const HIGHLIGHTS = [
  {
    icon: <LayersIcon size={18} />,
    title: 'Unified data',
    description: 'Bring your reporting data together in one place.',
  },
  {
    icon: <SlidersIcon size={18} />,
    title: 'Flexible reporting',
    description: 'Configure formats, periods and reporting preferences.',
  },
  {
    icon: <ShieldIcon size={18} />,
    title: 'Secure access',
    description: 'Protected credentials, controlled access and secure sessions.',
  },
];

/**
 * Two-panel frame for the public authentication screens.
 *
 * The marketing panel is presentational and is dropped below the tablet breakpoint so the
 * form gets the full width on small screens.
 */
export function AuthLayout({ title, subtitle, children, footer, connected = false }: AuthLayoutProps) {
  return (
    <div className={connected ? 'auth-layout auth-layout--connected' : 'auth-layout'}>
      <div className="auth-layout__stage">
        <section className="auth-layout__aside" aria-hidden="true">
          <div className="auth-layout__aside-inner">
            <span className="auth-layout__brand">
              <BrandLogo size={38} />
              <span className="auth-layout__brand-name">Custom Reporting</span>
            </span>

            <span className="auth-layout__eyebrow">Connected Reporting Intelligence</span>

            <p className="auth-layout__pitch">
              Turn business data into decisions you can trust.
            </p>

            <ul className="auth-layout__highlights">
              {HIGHLIGHTS.map((highlight) => (
                <li key={highlight.title} className="auth-layout__highlight">
                  <span className="auth-layout__highlight-icon">{highlight.icon}</span>
                  <span>
                    <span className="auth-layout__highlight-title">{highlight.title}</span>
                    <span className="auth-layout__highlight-description">{highlight.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <main className="auth-layout__panel">
          <div className="auth-layout__card">
            <span className="auth-layout__mobile-brand">
              <BrandLogo size={34} />
              <span>Custom Reporting</span>
            </span>

            <header className="auth-layout__header">
              <h1 className="auth-layout__title">{title}</h1>
              <p className="auth-layout__subtitle">{subtitle}</p>
            </header>

            {children}
          </div>

          {footer && <div className="auth-layout__footer">{footer}</div>}
        </main>
      </div>
    </div>
  );
}
