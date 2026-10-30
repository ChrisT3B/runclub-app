// Plan intake form: empty state, per-step validation, draft storage and conversion
// to field-key answers. Rules mirror api/plan-intake.js, which validates again.

import { addDays, format } from 'date-fns';
import {
  PLAN_INTAKE_BRACE_NOTE_MAX,
  PLAN_INTAKE_DAYS,
  PLAN_INTAKE_HEALTH_KEYS,
  PLAN_INTAKE_ROUTINE_DETAIL_MAX,
} from '../types';
import type {
  PlanIntakeBRace,
  PlanIntakeBaseline,
  PlanIntakeCommitment,
  PlanIntakeDay,
  PlanIntakeFormState,
  PlanIntakeHoliday,
  PlanIntakeRoutineDay,
} from '../types';

export const PLAN_INTAKE_STEPS = [
  { id: 'about', title: 'You and your goal' },
  { id: 'fitness', title: 'Recent races and running' },
  { id: 'week', title: 'Your week' },
  { id: 'life', title: 'Commitments and dates' },
  { id: 'setup', title: 'Training setup' },
  { id: 'health', title: 'Health (optional)' },
  { id: 'coach', title: 'For the coach' },
  { id: 'review', title: 'Check and submit' },
] as const;

export type PlanIntakeStepId = typeof PLAN_INTAKE_STEPS[number]['id'];
export type PlanIntakeErrors = Record<string, string>;

export const emptyBaseline = (): PlanIntakeBaseline => ({ distance: '', date: '', time: '', conditions: '' });
export const emptyBRace = (): PlanIntakeBRace => ({ name: '', date: '', distance: '', priority: '' });
export const emptyCommitment = (): PlanIntakeCommitment => ({ type: '', days: [], time: '', freq: '' });
export const emptyHoliday = (): PlanIntakeHoliday => ({ from: '', to: '', note: '' });
const emptyRoutineDay = (): PlanIntakeRoutineDay => ({ run: false, cross: false, rest: false, detail: '' });

export function emptyForm(): PlanIntakeFormState {
  return {
    full_name: '', age: '', sex: '', units: '',
    goal_race_name: '', goal_distance: '', goal_race_date: '', goal_target_time: '', goal_secondary: '',
    b_races: [], brace_note: '',
    baselines: [emptyBaseline()],
    weekly_volume: '', runs_per_week: '', longest_recent_run: '', time_at_volume: '',
    years_running: '', previous_structure: '', previous_races: '',
    routine: Object.fromEntries(PLAN_INTAKE_DAYS.map(d => [d, emptyRoutineDay()])) as Record<PlanIntakeDay, PlanIntakeRoutineDay>,
    routine_note: '', days_available: [], days_available_touched: false,
    long_run_day: '', time_weekday: '', time_weekend: '', fixed_rest_days: [],
    commitments: [], holidays: [emptyHoliday(), emptyHoliday()],
    holidays_travel: '', seasonal_changes: '', exams_events: '', work_education_hours: '',
    cross_training: '', terrain: '', treadmill_access: '', hills_nearby: '', device: '', uses_hr: '',
    height_cm_under20: '',
    injuries_current: '', injuries_past: '', injury_clearance: '', sleep_nutrition_stress: '', disability_details: '',
    motivation: '', best_worst_race: '', anything_else: '',
    consent: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIME_PATTERN = /^(\d{1,2}:[0-5]\d:[0-5]\d|\d{1,2}:[0-5]\d)$/;
const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

/** Days in Mon to Sun order. */
export const sortDays = (days: PlanIntakeDay[]) => PLAN_INTAKE_DAYS.filter(d => days.includes(d));
const joinDays = (days: PlanIntakeDay[]) => sortDays(days).join(', ');

export const runDays = (form: PlanIntakeFormState) => PLAN_INTAKE_DAYS.filter(d => form.routine[d].run);

/** Under 20, so the standing height question applies. */
export const isUnder20 = (form: PlanIntakeFormState) => {
  const age = Number(form.age);
  return form.age.trim() !== '' && Number.isInteger(age) && age < 20;
};

export function routineValue(day: PlanIntakeRoutineDay): string {
  const option = day.rest ? 'Rest'
    : day.run && day.cross ? 'Run and cross-train'
    : day.run ? 'Run'
    : day.cross ? 'Cross-train'
    : '';
  if (!option) return '';
  const detail = day.detail.trim();
  return detail ? `${option} - ${detail}` : option;
}

const isFilled = (value: string) => value.trim() !== '';

/** Today on this device as yyyy-mm-dd. */
export const todayIso = () => format(new Date(), 'yyyy-MM-dd');
export const tomorrowIso = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function checkNumber(errors: PlanIntakeErrors, key: string, value: string, min: number, max: number, integer = false) {
  if (!isFilled(value)) return;
  const n = Number(value.trim());
  if (!NUMBER_PATTERN.test(value.trim()) || (integer && !Number.isInteger(n)) || n < min || n > max) {
    errors[key] = integer ? `Enter a whole number from ${min} to ${max}.` : `Enter a number from ${min} to ${max}.`;
  }
}

function checkTime(errors: PlanIntakeErrors, key: string, value: string) {
  if (isFilled(value) && !TIME_PATTERN.test(value.trim())) {
    errors[key] = 'Use h:mm:ss or mm:ss, for example 1:45:00 or 24:30.';
  }
}

function checkDate(errors: PlanIntakeErrors, key: string, value: string) {
  if (isFilled(value) && !validDate(value)) errors[key] = 'Enter a valid date.';
}

function checkLength(errors: PlanIntakeErrors, key: string, value: string, max: number) {
  if (value.trim().length > max) errors[key] = `Keep this under ${max} characters.`;
}

// ---------------------------------------------------------------------------
// Validation, one step at a time
// ---------------------------------------------------------------------------

export function validateStep(step: PlanIntakeStepId, form: PlanIntakeFormState): PlanIntakeErrors {
  const errors: PlanIntakeErrors = {};
  const required = (key: string, value: string, message = 'This is required.') => {
    if (!isFilled(value)) errors[key] = message;
  };

  switch (step) {
    case 'about':
      required('full_name', form.full_name, 'Enter your name.');
      checkLength(errors, 'full_name', form.full_name, 100);
      checkNumber(errors, 'age', form.age, 10, 100, true);
      required('units', form.units, 'Choose km or miles.');
      required('goal_race_name', form.goal_race_name, 'Enter the name of your goal race.');
      checkLength(errors, 'goal_race_name', form.goal_race_name, 100);
      required('goal_distance', form.goal_distance, 'Choose the race distance.');
      required('goal_race_date', form.goal_race_date, 'Enter the race date.');
      checkDate(errors, 'goal_race_date', form.goal_race_date);
      if (!errors.goal_race_date && validDate(form.goal_race_date) && form.goal_race_date <= todayIso()) {
        errors.goal_race_date = 'The race date must be in the future.';
      }
      checkTime(errors, 'goal_target_time', form.goal_target_time);
      checkTime(errors, 'goal_secondary', form.goal_secondary);
      form.b_races.forEach((r, i) => {
        const prefix = `brace${i}`;
        required(`${prefix}_date`, r.date, 'Enter the date.');
        required(`${prefix}_distance`, r.distance, 'Choose the distance.');
        required(`${prefix}_priority`, r.priority, 'Choose how you want to run it.');
        checkLength(errors, `${prefix}_name`, r.name, 100);
        checkDate(errors, `${prefix}_date`, r.date);
        if (!errors[`${prefix}_date`] && validDate(r.date) && validDate(form.goal_race_date) && r.date >= form.goal_race_date) {
          errors[`${prefix}_date`] = 'A B race must be before your goal race.';
        }
      });
      checkLength(errors, 'brace_note', form.brace_note, PLAN_INTAKE_BRACE_NOTE_MAX);
      break;

    case 'fitness':
      form.baselines.forEach((b, i) => {
        const prefix = `baseline${i}`;
        const started = isFilled(b.distance) || isFilled(b.date) || isFilled(b.time) || isFilled(b.conditions);
        if (i === 0 || started) {
          required(`${prefix}_distance`, b.distance, 'Choose the distance.');
          required(`${prefix}_date`, b.date, 'Enter the date.');
          required(`${prefix}_time`, b.time, 'Enter your finish time.');
        }
        checkDate(errors, `${prefix}_date`, b.date);
        if (!errors[`${prefix}_date`] && validDate(b.date) && b.date > todayIso()) {
          errors[`${prefix}_date`] = "This date is in the future. Enter the date you ran it.";
        }
        checkTime(errors, `${prefix}_time`, b.time);
        checkLength(errors, `${prefix}_conditions`, b.conditions, 200);
      });
      checkNumber(errors, 'weekly_volume', form.weekly_volume, 0, 500);
      checkNumber(errors, 'runs_per_week', form.runs_per_week, 0, 14, true);
      checkNumber(errors, 'longest_recent_run', form.longest_recent_run, 0, 200);
      checkNumber(errors, 'years_running', form.years_running, 0, 90);
      checkLength(errors, 'time_at_volume', form.time_at_volume, 200);
      break;

    case 'week':
      PLAN_INTAKE_DAYS.forEach(d => {
        const day = form.routine[d];
        if (day.detail.trim().length > PLAN_INTAKE_ROUTINE_DETAIL_MAX) {
          errors[`routine_${d}`] = `Keep this under ${PLAN_INTAKE_ROUTINE_DETAIL_MAX} characters.`;
        } else if (isFilled(day.detail) && !day.run && !day.cross && !day.rest) {
          errors[`routine_${d}`] = 'Tick Run, Cross-train or Rest for this day, or clear the box.';
        }
      });
      if (form.days_available.length === 0) errors.days_available = 'Choose at least one day you could train.';
      checkNumber(errors, 'time_weekday', form.time_weekday, 1, 600, true);
      checkNumber(errors, 'time_weekend', form.time_weekend, 1, 600, true);
      break;

    case 'life':
      form.commitments.forEach((c, i) => {
        if (!isFilled(c.type)) errors[`commit${i}_type`] = 'Choose a type.';
        if (c.days.length === 0) errors[`commit${i}_day`] = 'Choose at least one day.';
        if (!isFilled(c.time)) errors[`commit${i}_time`] = 'Choose a time of day.';
        if (!isFilled(c.freq)) errors[`commit${i}_freq`] = 'Choose how often.';
      });
      form.holidays.forEach((h, i) => {
        const started = isFilled(h.from) || isFilled(h.to) || isFilled(h.note);
        if (started) {
          required(`holiday${i}_from`, h.from, 'Enter the start date.');
          required(`holiday${i}_to`, h.to, 'Enter the end date.');
        }
        checkDate(errors, `holiday${i}_from`, h.from);
        checkDate(errors, `holiday${i}_to`, h.to);
        if (validDate(h.from) && validDate(h.to) && h.to < h.from) {
          errors[`holiday${i}_to`] = 'The end date must be on or after the start date.';
        }
        checkLength(errors, `holiday${i}_note`, h.note, 200);
      });
      checkNumber(errors, 'work_education_hours', form.work_education_hours, 0, 100);
      break;

    case 'setup':
      if (isUnder20(form)) checkNumber(errors, 'height_cm_under20', form.height_cm_under20, 100, 230);
      break;

    case 'coach':
      if (!form.consent) errors.consent = 'Please tick to agree before you continue.';
      break;

    default:
      break;
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Conversion to field-key answers
// ---------------------------------------------------------------------------

/** Field key to text, matching Docs/PlanSheet-Template-FieldKeys.md. Empty answers are left out. */
export function toAnswers(form: PlanIntakeFormState): Record<string, string> {
  const answers: Record<string, string> = {};
  const put = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) answers[key] = trimmed;
  };

  const simple = [
    'full_name', 'age', 'sex', 'units',
    'goal_race_name', 'goal_distance', 'goal_race_date', 'goal_target_time', 'goal_secondary', 'brace_note',
    'weekly_volume', 'runs_per_week', 'longest_recent_run', 'time_at_volume', 'years_running',
    'previous_structure', 'previous_races',
    'routine_note', 'long_run_day', 'time_weekday', 'time_weekend',
    'holidays_travel', 'seasonal_changes', 'exams_events', 'work_education_hours',
    'cross_training', 'terrain', 'treadmill_access', 'hills_nearby', 'device', 'uses_hr',
    'injuries_current', 'injuries_past', 'injury_clearance', 'sleep_nutrition_stress', 'disability_details',
    'motivation', 'best_worst_race', 'anything_else',
  ] as const;
  simple.forEach(key => put(key, form[key]));

  if (isUnder20(form)) put('height_cm_under20', form.height_cm_under20);

  // Filled rows only, numbered from 1
  form.baselines
    .filter(b => isFilled(b.distance) && isFilled(b.date) && isFilled(b.time))
    .forEach((b, i) => {
      const n = i + 1;
      put(`baseline${n}_distance`, b.distance);
      put(`baseline${n}_date`, b.date);
      put(`baseline${n}_time`, b.time);
      put(`baseline${n}_conditions`, b.conditions);
    });

  form.b_races.forEach((r, i) => {
    const n = i + 1;
    put(`brace${n}_name`, r.name);
    put(`brace${n}_date`, r.date);
    put(`brace${n}_distance`, r.distance);
    put(`brace${n}_priority`, r.priority);
  });

  form.commitments.forEach((c, i) => {
    const n = i + 1;
    put(`commit${n}_type`, c.type);
    put(`commit${n}_day`, joinDays(c.days));
    put(`commit${n}_time`, c.time);
    put(`commit${n}_freq`, c.freq);
  });

  form.holidays
    .filter(h => isFilled(h.from) && isFilled(h.to))
    .forEach((h, i) => {
      const n = i + 1;
      put(`holiday${n}_from`, h.from);
      put(`holiday${n}_to`, h.to);
      put(`holiday${n}_note`, h.note);
    });

  PLAN_INTAKE_DAYS.forEach(d => put(`routine_${d.toLowerCase()}`, routineValue(form.routine[d])));
  put('days_available', joinDays(form.days_available));
  put('fixed_rest_days', joinDays(form.fixed_rest_days));

  return answers;
}

// ---------------------------------------------------------------------------
// Draft: sessionStorage, keyed by member, never holding health answers
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'plan_intake_draft_v1';

interface PlanIntakeDraft {
  memberId: string;
  step: number;
  form: PlanIntakeFormState;
}

export function saveDraft(memberId: string, step: number, form: PlanIntakeFormState): void {
  const safe: PlanIntakeFormState = { ...form, consent: false };
  PLAN_INTAKE_HEALTH_KEYS.forEach(key => { safe[key] = ''; });
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ memberId, step, form: safe } satisfies PlanIntakeDraft));
  } catch {
    // Storage full or blocked: the form still works, just without a draft
  }
}

/** The draft for this member. A draft from anyone else is thrown away. */
export function loadDraft(memberId: string): { step: number; form: PlanIntakeFormState } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as PlanIntakeDraft;
    if (draft.memberId !== memberId || !draft.form) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return { step: draft.step, form: { ...emptyForm(), ...draft.form, consent: false } };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear
  }
}
