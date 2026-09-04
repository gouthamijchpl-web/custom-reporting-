import { useEffect, useRef, useState } from 'react';

interface ReportDatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'UTC' });
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function moveMonth(value: Date, offset: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1));
}

function calendarDays(month: Date): Date[] {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

function CalendarGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 9.5h17" />
  </svg>;
}

export function ReportDatePicker({ id, value, onChange, label = 'Report Date' }: ReportDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseIsoDate(value);
    return new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
  });

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectedDate = parseIsoDate(value);
  const selectedIso = toIsoDate(selectedDate);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const days = calendarDays(visibleMonth);

  const openCalendar = () => {
    setVisibleMonth(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)));
    setOpen((current) => !current);
  };

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date));
    setOpen(false);
  };

  return <div className="report-date-picker" ref={rootRef}>
    <button
      id={id}
      type="button"
      className="report-date-picker__trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`${label}, ${FULL_DATE_FORMATTER.format(selectedDate)}`}
      onClick={openCalendar}
    >
      <span>{displayDate(value)}</span><CalendarGlyph />
    </button>
    {open && <div className="report-date-picker__popover" role="dialog" aria-label={`Choose ${label.toLocaleLowerCase()}`}>
      <header className="report-date-picker__header">
        <strong>{MONTH_FORMATTER.format(visibleMonth)}</strong>
        <div>
          <button type="button" onClick={() => setVisibleMonth((current) => moveMonth(current, -1))} aria-label="Previous month">‹</button>
          <button type="button" onClick={() => setVisibleMonth((current) => moveMonth(current, 1))} aria-label="Next month">›</button>
        </div>
      </header>
      <div className="report-date-picker__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="report-date-picker__days" role="grid">
        {days.map((date) => {
          const iso = toIsoDate(date);
          const outsideMonth = date.getUTCMonth() !== visibleMonth.getUTCMonth();
          const selected = iso === selectedIso;
          const isToday = iso === toIsoDate(todayUtc);
          return <button
            key={iso}
            type="button"
            role="gridcell"
            className={`${outsideMonth ? 'report-date-picker__day--outside ' : ''}${isToday ? 'report-date-picker__day--today ' : ''}${selected ? 'report-date-picker__day--selected' : ''}`.trim()}
            aria-selected={selected}
            aria-label={FULL_DATE_FORMATTER.format(date)}
            onClick={() => selectDate(date)}
          >{date.getUTCDate()}</button>;
        })}
      </div>
      <footer>
        <button type="button" onClick={() => selectDate(todayUtc)}>Today</button>
      </footer>
    </div>}
  </div>;
}
