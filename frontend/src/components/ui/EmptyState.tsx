import type { ReactNode } from 'react';
import { cx } from '@/utils/classNames';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Primary action offered from the empty state, when one exists. */
  action?: ReactNode;
  className?: string;
  /** Fills the available height instead of sizing to its content. */
  fillHeight?: boolean;
}

/**
 * Placeholder shown when a module has nothing to display.
 *
 * The modules that are still empty use this as their whole body, so the screen looks
 * intentional rather than unfinished, and the same component will later cover the
 * genuinely-empty case once those modules hold data.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  fillHeight = false,
}: EmptyStateProps) {
  return (
    <div className={cx('empty-state', fillHeight && 'empty-state--fill', className)}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      <h2 className="empty-state__title">{title}</h2>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
