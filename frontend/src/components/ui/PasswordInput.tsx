import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/icons';
import { evaluatePasswordStrength } from '@/utils/passwordStrength';
import { TextInput } from './TextInput';
import './PasswordInput.css';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  invalid?: boolean;
  /** Renders the segmented strength meter; only for fields where a password is chosen. */
  showStrengthMeter?: boolean;
}

/**
 * Password control with a show/hide toggle and an optional strength meter.
 *
 * The toggle is a real button so it is reachable by keyboard, and it reports its state
 * through `aria-pressed` rather than by swapping the icon alone.
 */
export function PasswordInput({
  id,
  invalid = false,
  showStrengthMeter = false,
  value,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const meterId = useId();

  const password = typeof value === 'string' ? value : '';
  const strength = evaluatePasswordStrength(password);
  const shouldShowMeter = showStrengthMeter && password.length > 0;

  return (
    <div className="password-input">
      <TextInput
        id={id}
        type={isVisible ? 'text' : 'password'}
        invalid={invalid}
        value={value}
        aria-describedby={shouldShowMeter ? meterId : undefined}
        trailingSlot={
          <button
            type="button"
            className="password-input__toggle"
            onClick={() => setIsVisible((current) => !current)}
            aria-pressed={isVisible}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            {isVisible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
          </button>
        }
        {...props}
      />

      {shouldShowMeter && (
        <div className="password-input__strength" id={meterId}>
          <div
            className="password-input__meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={strength.score}
            aria-valuetext={strength.label}
            aria-label="Password strength"
          >
            {[1, 2, 3, 4].map((segment) => (
              <span
                key={segment}
                className="password-input__segment"
                data-filled={segment <= strength.score}
                data-level={strength.level}
              />
            ))}
          </div>
          <span className="password-input__strength-label" data-level={strength.level}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
