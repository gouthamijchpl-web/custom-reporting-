import { cx } from '@/utils/classNames';
import './Switch.css';

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * On/off control for preferences that apply immediately once saved.
 *
 * Implemented as a `role="switch"` button rather than a styled checkbox so the pressed
 * state is announced correctly and the whole row stays clickable.
 */
export function Switch({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <div className={cx('switch-row', className)}>
      <div className="switch-row__text">
        <label className="switch-row__label" htmlFor={id}>
          {label}
        </label>
        {description && <p className="switch-row__description">{description}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={cx('switch', checked && 'switch--on')}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}
