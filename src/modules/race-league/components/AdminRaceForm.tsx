import React, { useState } from 'react';
import { RaceLeagueRace, AdminRaceFormData, RaceLeagueService } from '../services/RaceLeagueService';

interface AdminRaceFormProps {
  leagueId: string;
  existingRace?: RaceLeagueRace;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminRaceForm: React.FC<AdminRaceFormProps> = ({
  leagueId,
  existingRace,
  onSuccess,
  onCancel,
}) => {
  const [name, setName] = useState(existingRace?.name ?? '');
  const [raceDate, setRaceDate] = useState(existingRace?.race_date ?? '');
  const [location, setLocation] = useState(existingRace?.location ?? '');
  const [distanceLabel, setDistanceLabel] = useState(existingRace?.distance_label ?? '');
  const [externalUrl, setExternalUrl] = useState(existingRace?.external_entry_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Race name is required'); return; }
    if (!raceDate) { setError('Race date is required'); return; }

    setSubmitting(true);
    try {
      const formData: AdminRaceFormData = {
        name,
        race_date: raceDate,
        location,
        distance_label: distanceLabel,
        external_entry_url: externalUrl,
      };

      if (existingRace) {
        await RaceLeagueService.updateRace(existingRace.id, formData);
      } else {
        await RaceLeagueService.createRace(leagueId, formData);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="race-name" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          Race Name *
        </label>
        <input id="race-name" type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="race-date" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          Race Date *
        </label>
        <input id="race-date" type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="race-location" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          Location
        </label>
        <input id="race-location" type="text" value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%' }} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="race-distance" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          Distance
        </label>
        <input id="race-distance" type="text" value={distanceLabel} onChange={e => setDistanceLabel(e.target.value)} placeholder="e.g. 10K, Half Marathon" />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="race-url" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
          External Entry URL
        </label>
        <input id="race-url" type="text" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} style={{ width: '100%' }} />
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: '4px' }}>
          Link to race organiser signup page
        </div>
      </div>

      {error && <div className="league-form-error">{error}</div>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : existingRace ? 'Update Race' : 'Create Race'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};
