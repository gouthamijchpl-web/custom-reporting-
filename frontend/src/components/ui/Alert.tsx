import type { ReactNode } from 'react';
import { AlertCircleIcon, CheckCircleIcon, CloseIcon, InfoCircleIcon } from '@/components/icons';
import { cx } from '@/utils/classNames';
import './Alert.css';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  /** When provided, a dismiss button is rendered. */
  onDismiss?: () => void;
  className?: string;
}

const ICONS: Record<AlertVariant, typeof InfoCircleIcon> = {
  info: InfoCircleIcon,
  success: CheckCircleIcon,
  warning: AlertCircleIcon,
  danger: AlertCircleIcon,
};

/**
 * Inline status message.
 *
 * Errors and warnings are announced assertively so a failed submission is not missed by
 * screen reader users; informational messages are announced politely.
 */
export function Alert({ variant = 'info', title, children, onDismiss, className }: AlertProps) {
  const IconComponent = ICONS[variant];
  const isUrgent = variant === 'danger' || variant === 'warning';

  return (
    <div
      className={cx('alert', `alert--${variant}`, className)}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
    >
      <span className="alert__icon">
        <IconComponent size={17} />
      </span>

      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        <div className="alert__body">{children}</div>
      </div>

      {onDismiss && (
        <button type="button" className="alert__dismiss" onClick={onDismiss} aria-label="Dismiss message">
          <CloseIcon size={15} />
        </button>
      )}
    </div>
  );
}
