import type { ReactNode } from 'react';
import { cx } from '@/utils/classNames';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Removes the inner padding when the card hosts its own layout. */
  flush?: boolean;
}

/**
 * Rounded, softly shadowed surface used to group related content.
 *
 * Provided now so future modules have a consistent container ready; the empty module
 * pages deliberately do not use it yet.
 */
export function Card({ children, className, flush = false }: CardProps) {
  return <section className={cx('card', flush && 'card--flush', className)}>{children}</section>;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ title, description, icon, actions }: CardHeaderProps) {
  return (
    <header className="card__header">
      {icon && <span className="card__header-icon">{icon}</span>}
      <div className="card__header-text">
        <h2 className="card__title">{title}</h2>
        {description && <p className="card__description">{description}</p>}
      </div>
      {actions && <div className="card__header-actions">{actions}</div>}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('card__body', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <footer className={cx('card__footer', className)}>{children}</footer>;
}
