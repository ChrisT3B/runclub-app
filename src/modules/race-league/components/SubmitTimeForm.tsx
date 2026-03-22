import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  RaceLeagueRace,
  RaceLeagueEntry,
  Gender,
  SubmitTimeFormData,
  validateFinishTime,
} from '../services/RaceLeagueService';

interface SubmitTimeFormProps {
  existingEntry: RaceLeagueEntry | null;
  savedGender: Gender | null;
  race: RaceLeagueRace;
  onSubmit: (data: SubmitTimeFormData) => Promise<void>;
}

export const SubmitTimeForm: React.FC<SubmitTimeFormProps> = ({
  existingEntry,
  savedGender,
  race,
  onSubmit,
}) => {
  const [finishTime, setFinishTime] = useState(existingEntry?.finish_time ?? '');
  const [gender, setGender] = useState<Gender>(existingEntry?.gender ?? savedGender ?? 'male');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateFinishTime(finishTime);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid time');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ finish_time: finishTime, gender });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {existingEntry && (
        <p style={{ color: 'var(--info-color)', fontSize: 'var(--font-sm)', marginBottom: '12px' }}>
          You've already submitted a time for this race. You can update it until submissions close.
        </p>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="finish-time" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          Finish Time
        </label>
        <input
          id="finish-time"
          type="text"
          value={finishTime}
          onChange={e => setFinishTime(e.target.value)}
          placeholder="HH:MM:SS"
          style={{ width: '100%', maxWidth: '200px' }}
        />
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: '4px' }}>
          e.g. 00:45:30 for a fast 10K, 01:58:22 for a half marathon
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="gender-select" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          Competing as
        </label>
        <select
          id="gender-select"
          value={gender}
          onChange={e => setGender(e.target.value as Gender)}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {error && <div className="league-form-error">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : existingEntry ? 'Update Time' : 'Submit Time'}
      </button>

      {race.submission_cutoff && (
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: '12px' }}>
          Submissions close: {format(parseISO(race.submission_cutoff), 'd MMM yyyy HH:mm')}
        </p>
      )}
    </form>
  );
};
