import type { ReactNode } from 'react';
import { cx } from '@/utils/classNames';
import './Badge.css';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Small dot before the label, used where the tone itself carries meaning. */
  withDot?: boolean;
  className?: string;
}

/**
 * Compact status label.
 *
 * Colour is never the only signal — the text always states the status too — so the meaning
 * survives for anyone who cannot distinguish the tones.
 */
export function Badge({ tone = 'neutral', children, withDot = false, className }: BadgeProps) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)}>
      {withDot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
