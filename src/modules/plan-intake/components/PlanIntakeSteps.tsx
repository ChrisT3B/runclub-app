import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  PLAN_INTAKE_COMMIT_FREQS,
  PLAN_INTAKE_COMMIT_TIMES,
  PLAN_INTAKE_COMMIT_TYPES,
  PLAN_INTAKE_DAYS,
  PLAN_INTAKE_DAY_NAMES,
  PLAN_INTAKE_DISTANCES,
  PLAN_INTAKE_UNITS,
} from '../types';
import type {
  PlanIntakeBaseline,
  PlanIntakeCommitment,
  PlanIntakeDay,
  PlanIntakeFormState,
  PlanIntakeHoliday,
} from '../types';
import { emptyBaseline, emptyCommitment, isUnder20, runDays } from '../services/planIntakeForm';
import type { PlanIntakeErrors } from '../services/planIntakeForm';
import { PlanIntakeDayPicker, PlanIntakeSelect, PlanIntakeTextArea, PlanIntakeTextField } from './PlanIntakeFields';
import { PlanIntakeRoutineGrid } from './PlanIntakeRoutineGrid';

export interface PlanIntakeStepProps {
  form: PlanIntakeFormState;
  update: (patch: Partial<PlanIntakeFormState>) => void;
  errors: PlanIntakeErrors;
}

const TIME_HINT = 'h:mm:ss or mm:ss, for example 1:45:00 or 24:30';
const MAX_BASELINES = 3;
const MAX_COMMITMENTS = 3;

const unitLabel = (form: PlanIntakeFormState) => (form.units === 'mile' ? 'miles' : form.units === 'km' ? 'km' : 'km or miles');

// ---------------------------------------------------------------------------
// 1. You and your goal
// ---------------------------------------------------------------------------

export const PlanIntakeStepAbout: React.FC<PlanIntakeStepProps> = ({ form, update, errors }) => (
  <>
    <section className="plan-intake__section">
      <h3 className="plan-intake__section-title">About you</h3>
      <PlanIntakeTextField id="full_name" label="Your name" value={form.full_name} onChange={v => update({ full_name: v })}
        error={errors.full_name} maxLength={100} autoComplete="name" />
      <div className="plan-intake__row">
        <PlanIntakeTextField id="age" label="Age" value={form.age} onChange={v => update({ age: v })}
          error={errors.age} optional inputMode="numeric" maxLength={3} />
        <PlanIntakeSelect id="sex" label="Sex" value={form.sex} onChange={v => update({ sex: v })}
          options={['Female', 'Male', 'Prefer not to say']} optional />
      </div>
      <PlanIntakeSelect id="units" label="Preferred units" value={form.units} onChange={v => update({ units: v })}
        options={PLAN_INTAKE_UNITS} error={errors.units} />
    </section>

    <section className="plan-intake__section">
      <h3 className="plan-intake__section-title">Your goal race</h3>
      <PlanIntakeTextField id="goal_race_name" label="Race name" value={form.goal_race_name}
        onChange={v => update({ goal_race_name: v })} error={errors.goal_race_name} maxLength={100}
        placeholder="e.g. Stratford Half Marathon" />
      <div className="plan-intake__row">
        <PlanIntakeSelect id="goal_distance" label="Distance" value={form.goal_distance}
          onChange={v => update({ goal_distance: v })} options={PLAN_INTAKE_DISTANCES} error={errors.goal_distance} />
        <PlanIntakeTextField id="goal_race_date" label="Race date" type="date" value={form.goal_race_date}
          onChange={v => update({ goal_race_date: v })} error={errors.goal_race_date} />
      </div>
      <div className="plan-intake__row">
        <PlanIntakeTextField id="goal_target_time" label="Target time" value={form.goal_target_time}
          onChange={v => update({ goal_target_time: v })} error={errors.goal_target_time} optional hint={TIME_HINT} maxLength={8} />
        <PlanIntakeTextField id="goal_secondary" label="Secondary target time" value={form.goal_secondary}
          onChange={v => update({ goal_secondary: v })} error={errors.goal_secondary} optional
          hint="A fallback time if the day doesn't go to plan" maxLength={8} />
      </div>
    </section>
  </>
);

// ---------------------------------------------------------------------------
// 2. Recent races and running
// ---------------------------------------------------------------------------

export const PlanIntakeStepFitness: React.FC<PlanIntakeStepProps> = ({ form, update, errors }) => {
  const setBaseline = (index: number, patch: Partial<PlanIntakeBaseline>) =>
    update({ baselines: form.baselines.map((b, i) => (i === index ? { ...b, ...patch } : b)) });

  return (
    <>
      <section className="plan-intake__section">
        <h3 className="plan-intake__section-title">Recent races</h3>
        <p className="plan-intake__hint">
          Your most recent race first. A parkrun or a timed solo run counts. If you haven't raced
          recently, give your best recent timed run and say so under conditions.
        </p>

        {form.baselines.map((b, i) => (
          <div key={i} className="plan-intake__group">
            <div className="plan-intake__group-head">
              <h4 className="plan-intake__group-title">{i === 0 ? 'Most recent race' : `Race ${i + 1}`}</h4>
              {i > 0 && (
                <button type="button" className="btn btn-secondary plan-intake__remove"
                  onClick={() => update({ baselines: form.baselines.filter((_, j) => j !== i) })}>
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
            <div className="plan-intake__row">
              <PlanIntakeSelect id={`baseline${i}_distance`} label="Distance" value={b.distance}
                onChange={v => setBaseline(i, { distance: v })} options={PLAN_INTAKE_DISTANCES} error={errors[`baseline${i}_distance`]} />
              <PlanIntakeTextField id={`baseline${i}_date`} label="Date" type="date" value={b.date}
                onChange={v => setBaseline(i, { date: v })} error={errors[`baseline${i}_date`]} />
            </div>
            <PlanIntakeTextField id={`baseline${i}_time`} label="Finish time" value={b.time}
              onChange={v => setBaseline(i, { time: v })} error={errors[`baseline${i}_time`]} hint={TIME_HINT} maxLength={8} />
            <PlanIntakeTextField id={`baseline${i}_conditions`} label="Conditions" value={b.conditions}
              onChange={v => setBaseline(i, { conditions: v })} error={errors[`baseline${i}_conditions`]} optional
              placeholder="e.g. hilly, very hot, ran with a cold" maxLength={200} />
          </div>
        ))}

        {form.baselines.length < MAX_BASELINES && (
          <button type="button" className="btn btn-secondary plan-intake__add"
            onClick={() => update({ baselines: [...form.baselines, emptyBaseline()] })}>
            <Plus size={16} /> Add another race
          </button>
        )}
      </section>

      <section className="plan-intake__section">
        <h3 className="plan-intake__section-title">Your running now</h3>
        <div className="plan-intake__row">
          <PlanIntakeTextField id="weekly_volume" label={`Weekly distance (${unitLabel(form)})`} value={form.weekly_volume}
            onChange={v => update({ weekly_volume: v })} error={errors.weekly_volume} optional inputMode="decimal" maxLength={5} />
          <PlanIntakeTextField id="runs_per_week" label="Runs per week" value={form.runs_per_week}
            onChange={v => update({ runs_per_week: v })} error={errors.runs_per_week} optional inputMode="numeric" maxLength={2} />
        </div>
        <div className="plan-intake__row">
          <PlanIntakeTextField id="longest_recent_run" label={`Longest recent run (${unitLabel(form)})`} value={form.longest_recent_run}
            onChange={v => update({ longest_recent_run: v })} error={errors.longest_recent_run} optional inputMode="decimal" maxLength={5} />
          <PlanIntakeTextField id="time_at_volume" label="How long at this level?" value={form.time_at_volume}
            onChange={v => update({ time_at_volume: v })} error={errors.time_at_volume} optional placeholder="e.g. 3 months" maxLength={200} />
        </div>
        <div className="plan-intake__row">
          <PlanIntakeTextField id="years_running" label="Years running" value={form.years_running}
            onChange={v => update({ years_running: v })} error={errors.years_running} optional inputMode="decimal" maxLength={4} />
          <PlanIntakeSelect id="previous_structure" label="Training so far" value={form.previous_structure}
            onChange={v => update({ previous_structure: v })} options={['None', 'Casual', 'Club', 'Coached']} optional />
        </div>
        <PlanIntakeTextArea id="previous_races" label="Other races you've done" value={form.previous_races}
          onChange={v => update({ previous_races: v })} optional />
      </section>
    </>
  );
};

// ---------------------------------------------------------------------------
// 3. Your week
// ---------------------------------------------------------------------------

export const PlanIntakeStepWeek: React.FC<PlanIntakeStepProps> = ({ form, update, errors }) => (
  <>
    <section className="plan-intake__section">
      <PlanIntakeRoutineGrid
        routine={form.routine}
        errors={errors}
        onChange={(day, value) => {
          const routine = { ...form.routine, [day]: value };
          // Days available follow the Run ticks until the athlete edits them
          const patch: Partial<PlanIntakeFormState> = { routine };
          if (!form.days_available_touched) patch.days_available = runDays({ ...form, routine });
          update(patch);
        }}
      />
      <PlanIntakeTextArea id="routine_note" label="Anything that varies?" value={form.routine_note}
        onChange={v => update({ routine_note: v })} optional
        hint="For example, Thursday evening run some weeks, Friday morning others." />
    </section>

    <section className="plan-intake__section">
      <h3 className="plan-intake__section-title">What can't move</h3>
      <PlanIntakeDayPicker id="days_available" label="Days you could train"
        value={form.days_available}
        onChange={days => update({ days_available: days, days_available_touched: true })}
        error={errors.days_available}
        hint="Filled in from your Run days. Add any other days you could run." />
      <PlanIntakeSelect id="long_run_day" label="Best day for a long run" value={form.long_run_day}
        onChange={v => update({ long_run_day: v })}
        options={PLAN_INTAKE_DAYS.map(d => ({ value: d, label: PLAN_INTAKE_DAY_NAMES[d] }))} optional />
      <div className="plan-intake__row">
        <PlanIntakeTextField id="time_weekday" label="Time per session on a weekday (minutes)" value={form.time_weekday}
          onChange={v => update({ time_weekday: v })} error={errors.time_weekday} optional inputMode="numeric" maxLength={3} />
        <PlanIntakeTextField id="time_weekend" label="Time per session at the weekend (minutes)" value={form.time_weekend}
          onChange={v => update({ time_weekend: v })} error={errors.time_weekend} optional inputMode="numeric" maxLength={3} />
      </div>
      <PlanIntakeDayPicker id="fixed_rest_days" label="Days you can never train" value={form.fixed_rest_days}
        onChange={days => update({ fixed_rest_days: days })} optional />
    </section>
  </>
);

// ---------------------------------------------------------------------------
// 4. Commitments and dates
// ---------------------------------------------------------------------------

export const PlanIntakeStepLife: React.FC<PlanIntakeStepProps> = ({ form, update, errors }) => {
  const setCommitment = (index: number, patch: Partial<PlanIntakeCommitment>) =>
    update({ commitments: form.commitments.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  const setHoliday = (index: number, patch: Partial<PlanIntakeHoliday>) =>
    update({ holidays: form.holidays.map((h, i) => (i === index ? { ...h, ...patch } : h)) });

  return (
    <>
      <section className="plan-intake__section">
        <h3 className="plan-intake__section-title">Regular commitments</h3>
        <p className="plan-intake__hint">
          Things that take energy or time each week, such as shift work, team sport or a physical job.
          Add up to three. Desk work is fine to include too.
        </p>

        {form.commitments.map((c, i) => (
          <div key={i} className="plan-intake__group">
            <div className="plan-intake__group-head">
              <h4 className="plan-intake__group-title">Commitment {i + 1}</h4>
              <button type="button" className="btn btn-secondary plan-intake__remove"
                onClick={() => update({ commitments: form.commitments.filter((_, j) => j !== i) })}>
                <Trash2 size={16} /> Remove
              </button>
            </div>
            <PlanIntakeSelect id={`commit${i}_type`} label="Type" value={c.type}
              onChange={v => setCommitment(i, { type: v })} options={PLAN_INTAKE_COMMIT_TYPES} error={errors[`commit${i}_type`]} />
            <PlanIntakeDayPicker id={`commit${i}_day`} label="Days" value={c.days}
              onChange={(days: PlanIntakeDay[]) => setCommitment(i, { days })} error={errors[`commit${i}_day`]} />
            <div className="plan-intake__row">
              <PlanIntakeSelect id={`commit${i}_time`} label="Time of day" value={c.time}
                onChange={v => setCommitment(i, { time: v })} options={PLAN_INTAKE_COMMIT_TIMES} error={errors[`commit${i}_time`]} />
              <PlanIntakeSelect id={`commit${i}_freq`} label="How often" value={c.freq}
                onChange={v => setCommitment(i, { freq: v })} options={PLAN_INTAKE_COMMIT_FREQS} error={errors[`commit${i}_freq`]} />
            </div>
          </div>
        ))}

        {form.commitments.length < MAX_COMMITMENTS && (
          <button type="button" className="btn btn-secondary plan-intake__add"
            onClick={() => update({ commitments: [...form.commitments, emptyCommitment()] })}>
            <Plus size={16} /> Add a commitment
          </button>
        )}
      </section>

      <section className="plan-intake__section">
        <h3 className="plan-intake__section-title">Holidays and travel</h3>
        <p className="plan-intake__hint">Dates before your goal race when training will be different.</p>
        {form.holidays.map((h, i) => (
          <div key={i} className="plan-intake__group">
            <h4 className="plan-intake__group-title">Trip {i + 1}</h4>
            <div className="plan-intake__row">
              <PlanIntakeTextField id={`holiday${i}_from`} label="From" type="date" value={h.from}
                onChange={v => setHoliday(i, { from: v })} error={errors[`holiday${i}_from`]} optional />
              <PlanIntakeTextField id={`holiday${i}_to`} label="To" type="date" value={h.to}
                onChange={v => setHoliday(i, { to: v })} error={errors[`holiday${i}_to`]} optional />
            </div>
            <PlanIntakeTextField id={`holiday${i}_note`} label="Where, and can you train there?" value={h.note}
              onChange={v => setHoliday(i, { note: v })} error={errors[`holiday${i}_note`]} optional maxLength={200} />
          </div>
        ))}
        <PlanIntakeTextArea id="holidays_travel" label="Anything else about holidays or travel" value={form.holidays_travel}
          onChange={v => update({ holidays_travel: v })} optional />
      </section>

      <section className="plan-intake__section">
        <h3 className="plan-intake__section-title">Other things to plan around</h3>
        <PlanIntakeTextArea id="seasonal_changes" label="Does your availability change with the seasons?" value={form.seasonal_changes}
          onChange={v => update({ seasonal_changes: v })} optional />
        <PlanIntakeTextArea id="exams_events" label="Exams or big life events before the race" value={form.exams_events}
          onChange={v => update({ exams_events: v })} optional />
        <PlanIntakeTextField id="work_education_hours" label="Hours per week in work or education" value={form.work_education_hours}
          onChange={v => update({ work_education_hours: v })} error={errors.work_education_hours} optional
          inputMode="numeric" maxLength={3} hint="Only if you think it's relevant" />
      </section>
    </>
  );
};

// ---------------------------------------------------------------------------
// 5. Training setup
// ---------------------------------------------------------------------------

export const PlanIntakeStepSetup: React.FC<PlanIntakeStepProps> = ({ form, update, errors }) => (
  <section className="plan-intake__section">
    <PlanIntakeTextArea id="cross_training" label="Other exercise, and how often" value={form.cross_training}
      onChange={v => update({ cross_training: v })} optional hint="For example gym twice a week, cycling at weekends" />
    <PlanIntakeTextField id="terrain" label="Where do you usually run?" value={form.terrain}
      onChange={v => update({ terrain: v })} optional placeholder="e.g. roads, trails, track" maxLength={200} />
    <div className="plan-intake__row">
      <PlanIntakeSelect id="treadmill_access" label="Treadmill access" value={form.treadmill_access}
        onChange={v => update({ treadmill_access: v })} options={['Yes', 'No']} optional />
      <PlanIntakeSelect id="hills_nearby" label="Hills nearby" value={form.hills_nearby}
        onChange={v => update({ hills_nearby: v })} options={['Yes', 'Some', 'No']} optional />
    </div>
    <div className="plan-intake__row">
      <PlanIntakeTextField id="device" label="Watch or app" value={form.device}
        onChange={v => update({ device: v })} optional placeholder="e.g. Garmin, Strava, none" maxLength={100} />
      <PlanIntakeSelect id="uses_hr" label="Do you use heart rate?" value={form.uses_hr}
        onChange={v => update({ uses_hr: v })} options={['Yes', 'Sometimes', 'No']} optional />
    </div>
    {isUnder20(form) && (
      <PlanIntakeTextField id="height_cm_under20" label="Standing height (cm)" value={form.height_cm_under20}
        onChange={v => update({ height_cm_under20: v })} error={errors.height_cm_under20} optional inputMode="numeric"
        maxLength={3} hint="Asked of under-20s only, to help plan training while you're still growing" />
    )}
  </section>
);

// ---------------------------------------------------------------------------
// 6. Health (optional)
// ---------------------------------------------------------------------------

export const PlanIntakeStepHealth: React.FC<PlanIntakeStepProps> = ({ form, update }) => (
  <section className="plan-intake__section">
    <div className="plan-intake__notice">
      Every question here is optional. Your answers go only into your private plan sheet, seen by the
      coaching team. They are not saved on this device, so if you leave the form part way you'll need
      to fill this page in again.
    </div>
    <PlanIntakeTextArea id="injuries_current" label="Any current injuries?" value={form.injuries_current}
      onChange={v => update({ injuries_current: v })} optional hint="Where, and how it affects your running" />
    <PlanIntakeTextArea id="injuries_past" label="Past injuries, especially any that come back" value={form.injuries_past}
      onChange={v => update({ injuries_past: v })} optional />
    <PlanIntakeTextField id="injury_clearance" label="Has a doctor or physio cleared you to run?" value={form.injury_clearance}
      onChange={v => update({ injury_clearance: v })} optional maxLength={200} />
    <PlanIntakeTextArea id="sleep_nutrition_stress" label="Sleep, food and stress" value={form.sleep_nutrition_stress}
      onChange={v => update({ sleep_nutrition_stress: v })} optional />
    <PlanIntakeTextArea id="disability_details" label="Disability or classification details that affect training"
      value={form.disability_details} onChange={v => update({ disability_details: v })} optional
      hint="Only if relevant" />
  </section>
);

// ---------------------------------------------------------------------------
// 7. For the coach, and consent
// ---------------------------------------------------------------------------

export const PlanIntakeStepCoach: React.FC<PlanIntakeStepProps> = ({ form, update, errors }) => (
  <>
    <section className="plan-intake__section">
      <p className="plan-intake__hint">Read by the coach only. Write as much or as little as you like.</p>
      <PlanIntakeTextArea id="motivation" label="What makes you want to run this race?" value={form.motivation}
        onChange={v => update({ motivation: v })} optional />
      <PlanIntakeTextArea id="best_worst_race" label="Tell us about your best and worst race" value={form.best_worst_race}
        onChange={v => update({ best_worst_race: v })} optional />
      <PlanIntakeTextArea id="anything_else" label="Anything else we should know?" value={form.anything_else}
        onChange={v => update({ anything_else: v })} optional />
    </section>

    <section className="plan-intake__section">
      <div className={`plan-intake__consent ${errors.consent ? 'plan-intake__consent--error' : ''}`}>
        <label className="plan-intake__check plan-intake__check--consent">
          <input
            type="checkbox"
            className="plan-intake__checkbox"
            checked={form.consent}
            onChange={e => update({ consent: e.target.checked })}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
          />
          <span>
            I agree that the Run Alcester coaching team can use my answers to build my training plan.
            They are stored in a private Google Sheet that only the coaching team can see. The coach
            may use an AI tool to help draft the plan; my name, contact details and health answers are
            not shared with it.
          </span>
        </label>
        {errors.consent && <p className="plan-intake__error" id="consent-error">{errors.consent}</p>}
      </div>
    </section>
  </>
);
