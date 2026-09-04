import type { ReactNode } from 'react';
import { cx } from '@/utils/classNames';
import './FormField.css';

interface FormFieldProps {
  /** id of the control this label points at. */
  htmlFor: string;
  label: string;
  /** Shown only when the field has been interacted with or the form was submitted. */
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Label, control, hint and error message in the one arrangement used by every form.
 *
 * Centralising it keeps spacing identical across screens and guarantees each error is
 * wired to its input through `aria-describedby` by the control components.
 */
export function FormField({
  htmlFor,
  label,
  error,
  hint,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cx('form-field', error && 'form-field--invalid', className)}>
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        <p className="form-field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className="form-field__hint" id={`${htmlFor}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
