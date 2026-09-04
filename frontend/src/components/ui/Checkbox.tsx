import type { InputHTMLAttributes } from 'react';
import { cx } from '@/utils/classNames';
import './Checkbox.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  description?: string;
}

/** Checkbox with its label, styled to match the other controls. */
export function Checkbox({ id, label, description, className, ...props }: CheckboxProps) {
  return (
    <div className={cx('checkbox', className)}>
      <input id={id} type="checkbox" className="checkbox__control" {...props} />
      <div className="checkbox__text">
        <label className="checkbox__label" htmlFor={id}>
          {label}
        </label>
        {description && <p className="checkbox__description">{description}</p>}
      </div>
    </div>
  );
}
