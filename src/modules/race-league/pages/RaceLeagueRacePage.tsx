import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../services/supabase';
import {
  RaceLeagueService,
  RaceLeagueRace,
  RaceLeagueEntry,
  Gender,
  SubmitTimeFormData,
  getRaceStatus,
  RACE_STATUS_LABELS,
  RACE_STATUS_CSS,
} from '../services/RaceLeagueService';
import { SubmitTimeForm } from '../components/SubmitTimeForm';
import { RaceResultsTable } from '../components/RaceResultsTable';

interface RaceLeagueRacePageProps {
  raceId: string;
  onNavigate: (page: string) => void;
}

export const RaceLeagueRacePage: React.FC<RaceLeagueRacePageProps> = ({ raceId, onNavigate }) => {
  const [race, setRace] = useState<RaceLeagueRace | null>(null);
  const [myEntry, setMyEntry] = useState<RaceLeagueEntry | null>(null);
  const [savedGender, setSavedGender] = useState<Gender | null>(null);
  const [entries, setEntries] = useState<RaceLeagueEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    const [raceData, entryData, genderData] = await Promise.all([
      RaceLeagueService.getRace(raceId),
      RaceLeagueService.getMyEntry(raceId),
      RaceLeagueService.getSavedGender(),
    ]);
    setRace(raceData);
    setMyEntry(entryData);
    setSavedGender(genderData);

    if (raceData?.results_locked) {
      const [entriesData, user] = await Promise.all([
        RaceLeagueService.getRaceEntries(raceId),
        supabase.auth.getUser(),
      ]);
      setEntries(entriesData);
      setCurrentUserId(user.data.user?.id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [raceId]);

  if (loading) return <div className="race-league-empty">Loading...</div>;
  if (!race) return <div className="race-league-empty">Race not found.</div>;

  const status = getRaceStatus(race);

  const metaParts: string[] = [format(parseISO(race.race_date), 'd MMM yyyy')];
  if (race.location) metaParts.push(race.location);
  if (race.distance_label) metaParts.push(race.distance_label);

  const handleSubmit = async (data: SubmitTimeFormData) => {
    await RaceLeagueService.submitTime(raceId, race.league_id, data);
    const updatedEntry = await RaceLeagueService.getMyEntry(raceId);
    setMyEntry(updatedEntry);
    setSuccessMessage('Time submitted successfully.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => onNavigate('race-league')} style={{ marginBottom: '16px' }}>
        &larr; Back to Race League
      </button>

      <h2>{race.name}</h2>
      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginBottom: '12px' }}>
        {metaParts.join(' · ')}
      </div>

      {race.external_entry_url && status !== 'results_locked' && (
        <p style={{ marginBottom: '12px' }}>
          <a href={race.external_entry_url} target="_blank" rel="noopener noreferrer">
            Sign up for this race externally &rarr;
          </a>
        </p>
      )}

      <span className={`race-status ${RACE_STATUS_CSS[status]}`} style={{ marginBottom: '16px', display: 'inline-block' }}>
        {RACE_STATUS_LABELS[status]}
      </span>

      <div style={{ marginTop: '16px' }}>
        {status === 'submissions_open' && (
          <>
            <SubmitTimeForm
              existingEntry={myEntry}
              savedGender={savedGender}
              race={race}
              onSubmit={handleSubmit}
            />
            {successMessage && (
              <p style={{ color: 'var(--success-color)', fontSize: 'var(--font-sm)', marginTop: '12px' }}>
                {successMessage}
              </p>
            )}
          </>
        )}

        {status === 'results_locked' && (
          <RaceResultsTable entries={entries} currentUserId={currentUserId} />
        )}

        {status === 'submissions_closed' && (
          <p style={{ color: 'var(--gray-500)' }}>Submissions are closed. Results will be published soon.</p>
        )}

        {status === 'upcoming' && (
          <p style={{ color: 'var(--gray-500)' }}>Submissions are not yet open for this race.</p>
        )}
      </div>
    </div>
  );
};
