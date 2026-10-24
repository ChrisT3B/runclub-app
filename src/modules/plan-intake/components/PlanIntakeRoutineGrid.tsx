import React from 'react';
import { PLAN_INTAKE_DAYS, PLAN_INTAKE_DAY_NAMES, PLAN_INTAKE_ROUTINE_DETAIL_MAX } from '../types';
import type { PlanIntakeDay, PlanIntakeRoutineDay } from '../types';
import type { PlanIntakeErrors } from '../services/planIntakeForm';

interface PlanIntakeRoutineGridProps {
  routine: Record<PlanIntakeDay, PlanIntakeRoutineDay>;
  onChange: (day: PlanIntakeDay, value: PlanIntakeRoutineDay) => void;
  errors: PlanIntakeErrors;
}

/** One card per day: Run, Cross-train, Rest and a short "What is it?" box. Rest clears the other two. */
export const PlanIntakeRoutineGrid: React.FC<PlanIntakeRoutineGridProps> = ({ routine, onChange, errors }) => {
  const setFlag = (day: PlanIntakeDay, flag: 'run' | 'cross' | 'rest', checked: boolean) => {
    const current = routine[day];
    if (flag === 'rest') {
      onChange(day, { ...current, rest: checked, run: checked ? false : current.run, cross: checked ? false : current.cross });
    } else {
      onChange(day, { ...current, [flag]: checked, rest: checked ? false : current.rest });
    }
  };

  return (
    <fieldset className="plan-intake__fieldset plan-intake-routine">
      <legend className="plan-intake__label">Your current week (the coach may suggest changes)</legend>
      <p className="plan-intake__hint">
        Tell us what a normal week looks like now. It's a starting point, not a set of fixed rules.
        Leave a day blank if nothing happens.
      </p>

      <div className="plan-intake-routine__days">
        {PLAN_INTAKE_DAYS.map(day => {
          const value = routine[day];
          const detailId = `routine-${day}-detail`;
          const error = errors[`routine_${day}`];
          return (
            <div key={day} className={`plan-intake-routine__day ${error ? 'plan-intake-routine__day--error' : ''}`}>
              <div className="plan-intake-routine__day-name">{PLAN_INTAKE_DAY_NAMES[day]}</div>
              <div className="plan-intake-routine__options">
                <label className="plan-intake__check">
                  <input
                    type="checkbox"
                    className="plan-intake__checkbox"
                    checked={value.run}
                    onChange={e => setFlag(day, 'run', e.target.checked)}
                  />
                  <span>Run</span>
                </label>
                <label className="plan-intake__check">
                  <input
                    type="checkbox"
                    className="plan-intake__checkbox"
                    checked={value.cross}
                    onChange={e => setFlag(day, 'cross', e.target.checked)}
                  />
                  <span>Cross-train</span>
                </label>
                <label className="plan-intake__check">
                  <input
                    type="checkbox"
                    className="plan-intake__checkbox"
                    checked={value.rest}
                    onChange={e => setFlag(day, 'rest', e.target.checked)}
                  />
                  <span>Rest</span>
                </label>
              </div>
              <label className="plan-intake-routine__detail-label" htmlFor={detailId}>
                What is it? <span className="plan-intake__optional">(optional)</span>
              </label>
              <input
                id={detailId}
                type="text"
                className="form-input plan-intake__input"
                value={value.detail}
                onChange={e => onChange(day, { ...value, detail: e.target.value })}
                maxLength={PLAN_INTAKE_ROUTINE_DETAIL_MAX}
                placeholder="e.g. tempo 9k, gym 1 hr"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              {error && <p className="plan-intake__error">{error}</p>}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};
