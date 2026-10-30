// Plan intake types and the form value contract.
// Option lists must match Docs/PlanSheet-Template-FieldKeys.md, the template Lists tab
// and the validation in api/plan-intake.js exactly.

export type PlanIntakeStatus = 'invited' | 'submitted' | 'sheet_created' | 'sheet_failed' | 'unknown' | 'revoked';

export interface PlanIntakeInvitation {
  id: string;
  email: string;
  status: PlanIntakeStatus;
  created_at: string;
  expires_at: string;
  sheet_url: string | null;
  expired: boolean;
}

export interface PlanIntakeMember {
  id: string;
  full_name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Form value contract
// ---------------------------------------------------------------------------

export const PLAN_INTAKE_DISTANCES = [
  '1 mile', '3k', '5k', '5 miles', '8k', '10k', '15k', '10 miles', 'Half marathon', '30k', 'Marathon', 'Other',
] as const;

export const PLAN_INTAKE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type PlanIntakeDay = typeof PLAN_INTAKE_DAYS[number];

export const PLAN_INTAKE_DAY_NAMES: Record<PlanIntakeDay, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

export const PLAN_INTAKE_COMMIT_TYPES = [
  'Shift work', 'Contact or team sport', 'Physical job', 'Desk or office work', 'Other',
] as const;
/** How the athlete wants to run a B race (a race other than the goal race). */
export const PLAN_INTAKE_BRACE_PRIORITIES = ['Race it', 'Run it as training', 'Coach to advise'] as const;
export const PLAN_INTAKE_MAX_BRACES = 3;
export const PLAN_INTAKE_BRACE_NOTE_MAX = 500;

export const PLAN_INTAKE_COMMIT_TIMES = ['Morning', 'Evening', 'All day'] as const;
export const PLAN_INTAKE_COMMIT_FREQS = ['Weekly', 'Fortnightly', 'Variable'] as const;

export const PLAN_INTAKE_UNITS = [
  { value: 'km', label: 'Kilometres (km)' },
  { value: 'mile', label: 'Miles' },
] as const;

export const PLAN_INTAKE_ROUTINE_DETAIL_MAX = 100;

/** Field keys marked Health in the template. Never saved in the draft. */
export const PLAN_INTAKE_HEALTH_KEYS = [
  'injuries_current', 'injuries_past', 'injury_clearance', 'sleep_nutrition_stress', 'disability_details',
] as const;

export interface PlanIntakeRoutineDay {
  run: boolean;
  cross: boolean;
  rest: boolean;
  detail: string;
}

export interface PlanIntakeBaseline {
  distance: string;
  date: string;
  time: string;
  conditions: string;
}

export interface PlanIntakeCommitment {
  type: string;
  days: PlanIntakeDay[];
  time: string;
  freq: string;
}

export interface PlanIntakeBRace {
  name: string;
  date: string;
  distance: string;
  priority: string;
}

export interface PlanIntakeHoliday {
  from: string;
  to: string;
  note: string;
}

/** Everything the athlete fills in. Turned into field-key answers on submit. */
export interface PlanIntakeFormState {
  // About you
  full_name: string;
  age: string;
  sex: string;
  units: string;

  // Goal
  goal_race_name: string;
  goal_distance: string;
  goal_race_date: string;
  goal_target_time: string;
  goal_secondary: string;
  b_races: PlanIntakeBRace[];
  brace_note: string;

  // Fitness
  baselines: PlanIntakeBaseline[];
  weekly_volume: string;
  runs_per_week: string;
  longest_recent_run: string;
  time_at_volume: string;
  years_running: string;
  previous_structure: string;
  previous_races: string;

  // Your week
  routine: Record<PlanIntakeDay, PlanIntakeRoutineDay>;
  routine_note: string;
  days_available: PlanIntakeDay[];
  days_available_touched: boolean;
  long_run_day: string;
  time_weekday: string;
  time_weekend: string;
  fixed_rest_days: PlanIntakeDay[];

  // Life and commitments
  commitments: PlanIntakeCommitment[];
  holidays: PlanIntakeHoliday[];
  holidays_travel: string;
  seasonal_changes: string;
  exams_events: string;
  work_education_hours: string;

  // Training environment
  cross_training: string;
  terrain: string;
  treadmill_access: string;
  hills_nearby: string;
  device: string;
  uses_hr: string;
  height_cm_under20: string;

  // Health (optional, never in the draft)
  injuries_current: string;
  injuries_past: string;
  injury_clearance: string;
  sleep_nutrition_stress: string;
  disability_details: string;

  // For the coach
  motivation: string;
  best_worst_race: string;
  anything_else: string;

  consent: boolean;
}
