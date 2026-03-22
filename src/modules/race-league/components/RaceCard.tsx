import React from 'react';
import { format, parseISO } from 'date-fns';
import {
  RaceLeagueRace,
  getRaceStatus,
  RACE_STATUS_LABELS,
  RACE_STATUS_CSS,
} from '../services/RaceLeagueService';

interface RaceCardProps {
  race: RaceLeagueRace;
  onNavigate: (page: string, raceId: string) => void;
}

export const RaceCard: React.FC<RaceCardProps> = ({ race, onNavigate }) => {
  const status = getRaceStatus(race);

  const metaParts: string[] = [format(parseISO(race.race_date), 'd MMM yyyy')];
  if (race.location) metaParts.push(race.location);
  if (race.distance_label) metaParts.push(race.distance_label);

  return (
    <div className="race-card">
      <div className="race-card__header">
        <span className="race-card__name">{race.name}</span>
        <span className={`race-status ${RACE_STATUS_CSS[status]}`}>
          {RACE_STATUS_LABELS[status]}
        </span>
      </div>

      <div className="race-card__meta">{metaParts.join(' · ')}</div>

      <div className="race-card__actions">
        {status === 'upcoming' && race.external_entry_url && (
          <a href={race.external_entry_url} target="_blank" rel="noopener noreferrer">
            Enter this race &rarr;
          </a>
        )}

        {status === 'submissions_open' && (
          <button className="btn btn-primary" onClick={() => onNavigate('race-league-race', race.id)}>
            Submit your time &rarr;
          </button>
        )}

        {status === 'submissions_closed' && (
          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>Awaiting results</span>
        )}

        {status === 'results_locked' && (
          <button className="btn btn-secondary" onClick={() => onNavigate('race-league-race', race.id)}>
            View results &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
