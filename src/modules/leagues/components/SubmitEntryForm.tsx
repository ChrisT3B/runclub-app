import React, { useState } from 'react';
import { SubmitEntryFormData } from '../types';

interface SubmitEntryFormProps {
  savedAthleteId: string | null;
  onSubmit: (data: SubmitEntryFormData) => Promise<void>;
}

export const SubmitEntryForm: React.FC<SubmitEntryFormProps> = ({ savedAthleteId, onSubmit }) => {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [formData, setFormData] = useState<SubmitEntryFormData>({
    parkrun_athlete_id: savedAthleteId ?? '',
    event_name: '',
    event_date: '',
    finish_time: '',
    age_grade_percent: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SubmitEntryFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (field: keyof SubmitEntryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SubmitEntryFormData, string>> = {};

    if (!formData.parkrun_athlete_id.trim() || !/^A\d+$/i.test(formData.parkrun_athlete_id.trim())) {
      newErrors.parkrun_athlete_id = 'Must be a valid parkrun ID (e.g. A1234567)';
    }
    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Please enter the parkrun event name';
    }
    if (!formData.event_date) {
      newErrors.event_date = 'Please select a date';
    } else if (formData.event_date > today) {
      newErrors.event_date = 'Date must not be in the future';
    } else if (formData.event_date < yearStart) {
      newErrors.event_date = 'Date must be within the current year';
    }
    if (!formData.finish_time.trim() || !/^\d{1,2}:\d{2}$/.test(formData.finish_time.trim())) {
      newErrors.finish_time = 'Enter a valid time in MM:SS format';
    } else {
      const [, secs] = formData.finish_time.trim().split(':').map(Number);
      if (secs > 59) newErrors.finish_time = 'Seconds must be 00-59';
    }
    const ag = parseFloat(formData.age_grade_percent);
    if (isNaN(ag) || ag <= 0 || ag > 100) {
      newErrors.age_grade_percent = 'Enter a valid age grade % between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit entry');
    } finally {
      setSubmitting(false);
    }
  };

  const athleteId = formData.parkrun_athlete_id.trim();
  const parkrunLink = /^A\d+$/i.test(athleteId)
    ? `https://www.parkrun.org.uk/parkrunner/${athleteId}/`
    : 'https://www.parkrun.org.uk/results/athleteresultshistory/';

  return (
    <form onSubmit={handleSubmit} className="league-form">
      <div className="league-form-group">
        <label htmlFor="parkrun_athlete_id">Parkrun Athlete ID</label>
        <input
          id="parkrun_athlete_id"
          type="text"
          maxLength={20}
          placeholder="e.g. A1234567"
          value={formData.parkrun_athlete_id}
          onChange={e => handleChange('parkrun_athlete_id', e.target.value)}
        />
        {errors.parkrun_athlete_id && <span className="league-form-error">{errors.parkrun_athlete_id}</span>}
        <span className="league-form-helper">
          <a href={parkrunLink} target="_blank" rel="noopener noreferrer">Find your age grade % &rarr;</a>
        </span>
      </div>

      <div className="league-form-group">
        <label htmlFor="event_name">parkrun Event Name</label>
        <input
          id="event_name"
          type="text"
          maxLength={100}
          placeholder="e.g. Stratford-upon-Avon"
          value={formData.event_name}
          onChange={e => handleChange('event_name', e.target.value)}
        />
        {errors.event_name && <span className="league-form-error">{errors.event_name}</span>}
      </div>

      <div className="league-form-group">
        <label htmlFor="event_date">Event Date</label>
        <input
          id="event_date"
          type="date"
          max={today}
          min={yearStart}
          value={formData.event_date}
          onChange={e => handleChange('event_date', e.target.value)}
        />
        {errors.event_date && <span className="league-form-error">{errors.event_date}</span>}
      </div>

      <div className="league-form-group">
        <label htmlFor="finish_time">Finish Time</label>
        <input
          id="finish_time"
          type="text"
          placeholder="MM:SS e.g. 24:15"
          value={formData.finish_time}
          onChange={e => handleChange('finish_time', e.target.value)}
        />
        {errors.finish_time && <span className="league-form-error">{errors.finish_time}</span>}
      </div>

      <div className="league-form-group">
        <label htmlFor="age_grade_percent">Age Grade %</label>
        <input
          id="age_grade_percent"
          type="number"
          min={1}
          max={100}
          step={0.01}
          value={formData.age_grade_percent}
          onChange={e => handleChange('age_grade_percent', e.target.value)}
        />
        {errors.age_grade_percent && <span className="league-form-error">{errors.age_grade_percent}</span>}
      </div>

      {submitError && (
        <div className="league-form-error" style={{ padding: '8px', background: '#fee2e2', borderRadius: '6px' }}>
          {submitError}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Entry'}
      </button>
    </form>
  );
};
