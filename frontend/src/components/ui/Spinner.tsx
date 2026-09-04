import { cx } from '@/utils/classNames';
import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Announced to assistive technology while work is in progress. */
  label?: string;
}

/** Indeterminate progress indicator used by buttons, panels and route transitions. */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span className={cx('spinner', `spinner--${size}`, className)} role="status" aria-live="polite">
      <span className="spinner__ring" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
