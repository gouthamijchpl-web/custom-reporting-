import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Spinner } from './Spinner';
import { cx } from '@/utils/classNames';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction while an action is in flight. */
  isLoading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** React 19 passes refs to function components as an ordinary prop. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The only button in the application.
 *
 * Loading and disabled are handled here rather than at each call site, so an in-flight
 * action can never be submitted twice and every button reports its state the same way.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled === true || isLoading;

  return (
    <button
      type={type}
      className={cx(
        'button',
        `button--${variant}`,
        `button--${size}`,
        fullWidth && 'button--full',
        isLoading && 'button--loading',
        className,
      )}
      disabled={isDisabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <Spinner size="sm" className="button__spinner" /> : leadingIcon}
      <span className="button__label">{children}</span>
      {!isLoading && trailingIcon}
    </button>
  );
}
