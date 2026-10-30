import React from 'react';
import { Pencil } from 'lucide-react';
import { PLAN_INTAKE_STEPS } from '../services/planIntakeForm';
import type { PlanIntakeStepId } from '../services/planIntakeForm';

interface PlanIntakeReviewProps {
  answers: Record<string, string>;
  onEdit: (step: number) => void;
}

const n3 = [1, 2, 3];

const SECTIONS: Array<{ step: PlanIntakeStepId; fields: Array<[string, string]> }> = [
  {
    step: 'about',
    fields: [
      ['full_name', 'Name'], ['age', 'Age'], ['sex', 'Sex'], ['units', 'Units'],
      ['goal_race_name', 'Goal race'], ['goal_distance', 'Distance'], ['goal_race_date', 'Race date'],
      ['goal_target_time', 'Target time'], ['goal_secondary', 'Secondary target'],
      ...n3.flatMap((n): Array<[string, string]> => [
        [`brace${n}_name`, `B race ${n}`], [`brace${n}_date`, `B race ${n}: date`],
        [`brace${n}_distance`, `B race ${n}: distance`], [`brace${n}_priority`, `B race ${n}: how to run it`],
      ]),
      ['brace_note', 'More on B races'],
    ],
  },
  {
    step: 'fitness',
    fields: [
      ...n3.flatMap((n): Array<[string, string]> => [
        [`baseline${n}_distance`, `Race ${n}: distance`], [`baseline${n}_date`, `Race ${n}: date`],
        [`baseline${n}_time`, `Race ${n}: time`], [`baseline${n}_conditions`, `Race ${n}: conditions`],
      ]),
      ['weekly_volume', 'Weekly distance'], ['runs_per_week', 'Runs per week'], ['longest_recent_run', 'Longest recent run'],
      ['time_at_volume', 'How long at this level'], ['years_running', 'Years running'],
      ['previous_structure', 'Training so far'], ['previous_races', 'Other races'],
    ],
  },
  {
    step: 'week',
    fields: [
      ['routine_mon', 'Monday'], ['routine_tue', 'Tuesday'], ['routine_wed', 'Wednesday'], ['routine_thu', 'Thursday'],
      ['routine_fri', 'Friday'], ['routine_sat', 'Saturday'], ['routine_sun', 'Sunday'], ['routine_note', 'What varies'],
      ['days_available', 'Days you could train'], ['long_run_day', 'Long run day'],
      ['time_weekday', 'Weekday session (minutes)'], ['time_weekend', 'Weekend session (minutes)'],
      ['fixed_rest_days', 'Days you can never train'],
    ],
  },
  {
    step: 'life',
    fields: [
      ...n3.flatMap((n): Array<[string, string]> => [
        [`commit${n}_type`, `Commitment ${n}`], [`commit${n}_day`, `Commitment ${n}: days`],
        [`commit${n}_time`, `Commitment ${n}: time of day`], [`commit${n}_freq`, `Commitment ${n}: how often`],
      ]),
      ...[1, 2].flatMap((n): Array<[string, string]> => [
        [`holiday${n}_from`, `Trip ${n}: from`], [`holiday${n}_to`, `Trip ${n}: to`], [`holiday${n}_note`, `Trip ${n}: details`],
      ]),
      ['holidays_travel', 'More on holidays or travel'], ['seasonal_changes', 'Seasonal changes'],
      ['exams_events', 'Exams or life events'], ['work_education_hours', 'Hours in work or education'],
    ],
  },
  {
    step: 'setup',
    fields: [
      ['cross_training', 'Other exercise'], ['terrain', 'Where you run'], ['treadmill_access', 'Treadmill'],
      ['hills_nearby', 'Hills nearby'], ['device', 'Watch or app'], ['uses_hr', 'Heart rate'],
      ['height_cm_under20', 'Height (cm)'],
    ],
  },
  {
    step: 'health',
    fields: [
      ['injuries_current', 'Current injuries'], ['injuries_past', 'Past injuries'], ['injury_clearance', 'Cleared to run'],
      ['sleep_nutrition_stress', 'Sleep, food and stress'], ['disability_details', 'Disability or classification'],
    ],
  },
  {
    step: 'coach',
    fields: [['motivation', 'Motivation'], ['best_worst_race', 'Best and worst race'], ['anything_else', 'Anything else']],
  },
];

export const PlanIntakeReview: React.FC<PlanIntakeReviewProps> = ({ answers, onEdit }) => (
  <div className="plan-intake-review">
    <p className="plan-intake__hint">Check your answers. Use Edit to change anything before you submit.</p>
    {SECTIONS.map(section => {
      const stepIndex = PLAN_INTAKE_STEPS.findIndex(s => s.id === section.step);
      const filled = section.fields.filter(([key]) => answers[key]);
      return (
        <section key={section.step} className="plan-intake-review__section">
          <div className="plan-intake-review__head">
            <h3 className="plan-intake__section-title">{PLAN_INTAKE_STEPS[stepIndex].title}</h3>
            <button type="button" className="btn btn-secondary plan-intake-review__edit" onClick={() => onEdit(stepIndex)}>
              <Pencil size={14} /> Edit
            </button>
          </div>
          {filled.length === 0 ? (
            <p className="plan-intake-review__empty">Nothing entered.</p>
          ) : (
            <dl className="plan-intake-review__list">
              {filled.map(([key, label]) => (
                <div key={key} className="plan-intake-review__item">
                  <dt>{label}</dt>
                  <dd>{answers[key] === 'mile' && key === 'units' ? 'miles' : answers[key]}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      );
    })}
  </div>
);
