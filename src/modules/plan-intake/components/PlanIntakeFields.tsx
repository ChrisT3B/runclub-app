import React from 'react';
import { PLAN_INTAKE_DAYS, PLAN_INTAKE_DAY_NAMES } from '../types';
import type { PlanIntakeDay } from '../types';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}

const FieldShell: React.FC<FieldShellProps> = ({ id, label, hint, error, optional, children }) => (
  <div className={`plan-intake__field ${error ? 'plan-intake__field--error' : ''}`}>
    <label className="plan-intake__label" htmlFor={id}>
      {label}
      {optional && <span className="plan-intake__optional"> (optional)</span>}
    </label>
    {hint && <p className="plan-intake__hint" id={`${id}-hint`}>{hint}</p>}
    {children}
    {error && <p className="plan-intake__error" id={`${id}-error`}>{error}</p>}
  </div>
);

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
  type?: 'text' | 'date';
  inputMode?: 'text' | 'numeric' | 'decimal';
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
}

export const PlanIntakeTextField: React.FC<TextFieldProps> = ({
  id, label, value, onChange, hint, error, optional, type = 'text', inputMode, placeholder, maxLength, autoComplete,
}) => (
  <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
    <input
      id={id}
      type={type}
      className="form-input plan-intake__input"
      value={value}
      onChange={e => onChange(e.target.value)}
      inputMode={inputMode}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete={autoComplete ?? 'off'}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
    />
  </FieldShell>
);

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
  maxLength?: number;
}

export const PlanIntakeTextArea: React.FC<TextAreaFieldProps> = ({
  id, label, value, onChange, hint, error, optional, maxLength = 2000,
}) => (
  <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
    <textarea
      id={id}
      className="form-input plan-intake__input plan-intake__textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={maxLength}
      rows={3}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
    />
  </FieldShell>
);

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string | { value: string; label: string }>;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const PlanIntakeSelect: React.FC<SelectFieldProps> = ({
  id, label, value, onChange, options, hint, error, optional,
}) => (
  <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
    <select
      id={id}
      className="form-input plan-intake__input plan-intake__select"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
    >
      <option value="">Choose...</option>
      {options.map(option => {
        const { value: v, label: l } = typeof option === 'string' ? { value: option, label: option } : option;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  </FieldShell>
);

interface TimePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 10 }, (_, i) => String(i));
const SIXTY = Array.from({ length: 60 }, (_, i) => pad2(i));

/** Splits h:mm:ss or mm:ss into its parts. Unset parts are ''. */
function splitTime(value: string): [string, string, string] {
  const parts = value.split(':');
  if (parts.length === 3) return [String(Number(parts[0])), pad2(Number(parts[1])), pad2(Number(parts[2]))];
  if (parts.length === 2) return ['', pad2(Number(parts[0])), pad2(Number(parts[1]))];
  return ['', '', ''];
}

/** h:mm:ss when there are hours, otherwise m:ss. '' when nothing is chosen. */
function joinTime(h: string, m: string, s: string): string {
  const hours = Number(h || 0);
  const minutes = Number(m || 0);
  if (hours === 0 && minutes === 0 && Number(s || 0) === 0) return '';
  const seconds = pad2(Number(s || 0));
  return hours > 0 ? `${hours}:${pad2(minutes)}:${seconds}` : `${minutes}:${seconds}`;
}

/** Hours, minutes and seconds drop-downs, so the time format can't be typed wrongly. */
export const PlanIntakeTimePicker: React.FC<TimePickerProps> = ({ id, label, value, onChange, hint, error, optional }) => {
  const [h, m, s] = splitTime(value);
  const parts: Array<{ key: 'h' | 'm' | 's'; unit: string; current: string; options: string[] }> = [
    { key: 'h', unit: 'hrs', current: h, options: HOURS },
    { key: 'm', unit: 'min', current: m, options: SIXTY },
    { key: 's', unit: 'sec', current: s, options: SIXTY },
  ];

  const set = (key: 'h' | 'm' | 's', next: string) =>
    onChange(joinTime(key === 'h' ? next : h, key === 'm' ? next : m, key === 's' ? next : s));

  return (
    <fieldset
      className={`plan-intake__field plan-intake__fieldset ${error ? 'plan-intake__field--error' : ''}`}
      aria-describedby={describedBy(id, hint, error)}
    >
      <legend className="plan-intake__label">
        {label}
        {optional && <span className="plan-intake__optional"> (optional)</span>}
      </legend>
      {hint && <p className="plan-intake__hint" id={`${id}-hint`}>{hint}</p>}
      <div className="plan-intake__time">
        {parts.map(part => (
          <label key={part.key} className="plan-intake__time-part">
            <select
              id={part.key === 'h' ? id : `${id}-${part.key}`}
              className="form-input plan-intake__input plan-intake__select"
              value={part.current}
              onChange={e => set(part.key, e.target.value)}
              aria-invalid={error ? true : undefined}
            >
              <option value="">--</option>
              {part.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="plan-intake__time-unit">{part.unit}</span>
          </label>
        ))}
      </div>
      {error && <p className="plan-intake__error" id={`${id}-error`}>{error}</p>}
    </fieldset>
  );
};

/** Session lengths offered for time_weekday and time_weekend. Values are whole minutes. */
export const PLAN_INTAKE_SESSION_OPTIONS = [20, 30, 40, 45, 60, 75, 90, 105, 120, 150, 180, 240].map(minutes => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const label = hours === 0 ? `${minutes} min` : rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
  return { value: String(minutes), label };
});

interface DayPickerProps {
  id: string;
  label: string;
  value: PlanIntakeDay[];
  onChange: (days: PlanIntakeDay[]) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
}

/** Mon to Sun checkboxes. */
export const PlanIntakeDayPicker: React.FC<DayPickerProps> = ({ id, label, value, onChange, hint, error, optional }) => {
  const toggle = (day: PlanIntakeDay) =>
    onChange(value.includes(day) ? value.filter(d => d !== day) : [...value, day]);

  return (
    <fieldset
      className={`plan-intake__field plan-intake__fieldset ${error ? 'plan-intake__field--error' : ''}`}
      aria-describedby={describedBy(id, hint, error)}
    >
      <legend className="plan-intake__label">
        {label}
        {optional && <span className="plan-intake__optional"> (optional)</span>}
      </legend>
      {hint && <p className="plan-intake__hint" id={`${id}-hint`}>{hint}</p>}
      <div className="plan-intake__days">
        {PLAN_INTAKE_DAYS.map(day => (
          <label key={day} className="plan-intake__day">
            <input
              type="checkbox"
              className="plan-intake__checkbox"
              checked={value.includes(day)}
              onChange={() => toggle(day)}
              aria-label={PLAN_INTAKE_DAY_NAMES[day]}
            />
            <span>{day}</span>
          </label>
        ))}
      </div>
      {error && <p className="plan-intake__error" id={`${id}-error`}>{error}</p>}
    </fieldset>
  );
};
