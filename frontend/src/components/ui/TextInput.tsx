import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/utils/classNames';
import './TextInput.css';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  invalid?: boolean;
  /** Decoration rendered inside the field, before the text. */
  leadingIcon?: ReactNode;
  /** Interactive control rendered inside the field, after the text. */
  trailingSlot?: ReactNode;
}

/** Single-line text control. Pair with {@link FormField} for label and messaging. */
export function TextInput({
  id,
  invalid = false,
  leadingIcon,
  trailingSlot,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextInputProps) {
  return (
    <div
      className={cx(
        'text-input',
        invalid && 'text-input--invalid',
        leadingIcon && 'text-input--with-leading',
        trailingSlot && 'text-input--with-trailing',
        className,
      )}
    >
      {leadingIcon && (
        <span className="text-input__leading" aria-hidden="true">
          {leadingIcon}
        </span>
      )}

      <input
        id={id}
        className="text-input__control"
        aria-invalid={invalid}
        aria-describedby={ariaDescribedBy ?? (invalid ? `${id}-error` : undefined)}
        {...props}
        autoComplete="off"
      />

      {trailingSlot && <span className="text-input__trailing">{trailingSlot}</span>}
    </div>
  );
}
