import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  RaceLeagueService,
  RaceLeagueRace,
  RaceLeagueEntry,
  getRaceStatus,
  RACE_STATUS_CSS,
} from '../services/RaceLeagueService';
import { AdminRaceForm } from '../components/AdminRaceForm';
import { AdminSubmissionsTable } from '../components/AdminSubmissionsTable';

interface AdminRaceLeagueRacePageProps {
  raceId: string;
  onNavigate: (page: string) => void;
}

export const AdminRaceLeagueRacePage: React.FC<AdminRaceLeagueRacePageProps> = ({ raceId, onNavigate }) => {
  const [race, setRace] = useState<RaceLeagueRace | null>(null);
  const [entries, setEntries] = useState<RaceLeagueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [cutoff, setCutoff] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    const [raceData, entriesData] = await Promise.all([
      RaceLeagueService.getRace(raceId),
      RaceLeagueService.getRaceEntries(raceId),
    ]);
    setRace(raceData);
    setEntries(entriesData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [raceId]);

  if (loading) return <div className="race-league-empty">Loading...</div>;
  if (!race) return <div className="race-league-empty">Race not found.</div>;

  const status = getRaceStatus(race);

  const handleUpdated = async () => {
    setShowEditForm(false);
    setLoading(true);
    await loadData();
  };

  const handleOpenSubmissions = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await RaceLeagueService.openSubmissions(raceId, cutoff);
      setLoading(true);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSubmissions = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await RaceLeagueService.closeSubmissions(raceId);
      setLoading(true);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockResults = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await RaceLeagueService.lockRaceResults(raceId);
      setShowLockConfirm(false);
      setLoading(true);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const canShowLockButton = !race.results_locked && (
    !race.submission_open ||
    (race.submission_cutoff && new Date(race.submission_cutoff) < new Date())
  );

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => onNavigate('admin-race-league')} style={{ marginBottom: '16px' }}>
        &larr; Back to Race League Admin
      </button>

      <h2>{race.name}</h2>

      {/* Race Details */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Race Details</h3>
          {!race.results_locked && (
            <button className="btn btn-secondary" onClick={() => setShowEditForm(prev => !prev)}>
              {showEditForm ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
        <div className="card-content">
          {showEditForm ? (
            <AdminRaceForm
              leagueId={race.league_id}
              existingRace={race}
              onSuccess={handleUpdated}
              onCancel={() => setShowEditForm(false)}
            />
          ) : (
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-700)' }}>
              <p><strong>Date:</strong> {format(parseISO(race.race_date), 'd MMM yyyy')}</p>
              {race.location && <p><strong>Location:</strong> {race.location}</p>}
              {race.distance_label && <p><strong>Distance:</strong> {race.distance_label}</p>}
              {race.external_entry_url && (
                <p>
                  <strong>External URL:</strong>{' '}
                  <a href={race.external_entry_url} target="_blank" rel="noopener noreferrer">{race.external_entry_url}</a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submission Control */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h3 className="card-title">Submission Control</h3>
        </div>
        <div className="card-content">
          {race.results_locked && (
            <span className={`race-status ${RACE_STATUS_CSS[status]}`}>
              Results are locked. No further changes are possible.
            </span>
          )}

          {!race.results_locked && !race.submission_open && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-sm)' }}>
                Submission cutoff
              </label>
              <input
                type="datetime-local"
                value={cutoff}
                onChange={e => setCutoff(e.target.value)}
                style={{ marginBottom: '8px' }}
              />
              <div>
                <button className="btn btn-primary" onClick={handleOpenSubmissions} disabled={actionLoading || !cutoff}>
                  {actionLoading ? 'Opening...' : 'Open Submissions'}
                </button>
              </div>
            </div>
          )}

          {!race.results_locked && race.submission_open && (
            <div>
              {race.submission_cutoff && (
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginBottom: '8px' }}>
                  Cutoff: {format(parseISO(race.submission_cutoff), 'd MMM yyyy HH:mm')} &mdash; {entries.length} entries
                </p>
              )}
              <button className="btn btn-secondary" onClick={handleCloseSubmissions} disabled={actionLoading}>
                {actionLoading ? 'Closing...' : 'Close Submissions'}
              </button>
            </div>
          )}

          {canShowLockButton && !race.submission_open && (
            <div style={{ marginTop: '16px' }}>
              {!showLockConfirm ? (
                <button className="btn" onClick={() => setShowLockConfirm(true)} style={{ background: 'var(--warning-color)', color: 'white', borderColor: 'var(--warning-color)' }}>
                  Lock Results
                </button>
              ) : (
                <div style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                  <p style={{ fontSize: 'var(--font-sm)', marginBottom: '12px' }}>
                    This will calculate final positions and award points for all submitted times. This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" onClick={handleLockResults} disabled={actionLoading} style={{ background: 'var(--danger-color)', color: 'white', borderColor: 'var(--danger-color)' }}>
                      {actionLoading ? 'Locking...' : 'Confirm'}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowLockConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {actionError && <div className="league-form-error" style={{ marginTop: '8px' }}>{actionError}</div>}
        </div>
      </div>

      {/* Submitted Times / Final Results */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{race.results_locked ? 'Final Results' : 'Submitted Times'}</h3>
        </div>
        <div className="card-content">
          {entries.length === 0 ? (
            <div className="race-league-empty">No times submitted yet.</div>
          ) : (
            <AdminSubmissionsTable entries={entries} />
          )}
        </div>
      </div>
    </div>
  );
};
