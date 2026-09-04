import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEventHandler, KeyboardEvent } from 'react';
import { cx } from '@/utils/classNames';
import './Select.css';

export interface SelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
  disabled?: boolean;
}

interface SelectProps<TValue extends string> {
  id: string;
  options: ReadonlyArray<SelectOption<TValue>>;
  value: TValue;
  onValueChange: (value: TValue) => void;
  invalid?: boolean;
  className?: string;
  name?: string;
  form?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * Application-rendered select with native-like form semantics and full keyboard support.
 *
 * Keeping the listbox in the DOM lets the product cursor and visual theme remain consistent;
 * a hidden input preserves the selected name/value pair for ordinary form submission.
 */
export function Select<TValue extends string>({
  id,
  options,
  value,
  onValueChange,
  invalid = false,
  className,
  name,
  form,
  disabled = false,
  required = false,
  autoFocus = false,
  tabIndex,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: SelectProps<TValue>) {
  const generatedId = useId().replace(/:/g, '');
  const listboxId = `${id}-${generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const firstEnabledIndex = () => options.findIndex((option) => !option.disabled);
  const lastEnabledIndex = () => {
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index].disabled) return index;
    }
    return -1;
  };

  const openListbox = () => {
    if (disabled || options.length === 0) return;
    const initialIndex = selectedIndex >= 0 && !options[selectedIndex].disabled
      ? selectedIndex
      : firstEnabledIndex();
    setActiveIndex(initialIndex);
    setOpen(true);
  };

  const closeListbox = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const chooseOption = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setActiveIndex(index);
    closeListbox(true);
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (options.length === 0) return;
    let nextIndex = activeIndex;
    for (let checked = 0; checked < options.length; checked += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex].disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openListbox();
      else moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? firstEnabledIndex() : lastEnabledIndex());
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && activeIndex >= 0) chooseOption(activeIndex);
      else openListbox();
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeListbox(true);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listboxId, open]);

  return (
    <div
      ref={rootRef}
      className={cx(
        'select',
        open && 'select--open',
        disabled && 'select--disabled',
        invalid && 'select--invalid',
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={value} form={form} disabled={disabled} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className="select__control"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-invalid={invalid}
        aria-required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        onBlur={onBlur}
        onClick={() => (open ? closeListbox() : openListbox())}
        onKeyDown={handleKeyDown}
      >
        <span className={cx('select__value', !selectedOption && 'select__value--placeholder')}>
          {selectedOption?.label ?? 'Select an option'}
        </span>
        <span className="select__chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          className="select__listbox"
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : ariaLabelledBy ?? id}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              className={cx(
                'select__option',
                index === activeIndex && 'select__option--active',
                option.value === value && 'select__option--selected',
              )}
              aria-selected={option.value === value}
              disabled={option.disabled}
              tabIndex={-1}
              onPointerMove={() => !option.disabled && setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <span className="select__check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
