import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ParkrunLeagueEntry } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { RankArrow } from './RankArrow';

interface MyLeagueStatusProps {
  leagueId: string;
  latestEntry: ParkrunLeagueEntry | null;
  onNavigate: (page: string) => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export const MyLeagueStatus: React.FC<MyLeagueStatusProps> = ({ leagueId, latestEntry, onNavigate }) => {
  const [yearEntries, setYearEntries] = useState<ParkrunLeagueEntry[]>([]);
  const [position, setPosition] = useState<{ current_rank: number | null; age_grade_percent: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const year = new Date().getFullYear();
      const [entries, pos] = await Promise.all([
        ParkrunLeagueService.getMyEntries(leagueId, year),
        ParkrunLeagueService.getMyLeaderboardPosition(leagueId),
      ]);
      setYearEntries(entries);
      setPosition(pos);
      setLoading(false);
    };
    load();
  }, [leagueId]);

  if (loading) return null;

  const renderStatusBadge = () => {
    if (!latestEntry) {
      return (
        <div className="league-status-badge league-status-badge--neutral">
          You haven't entered the league yet —{' '}
          <button onClick={() => onNavigate('leagues-submit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
            Submit an entry to join
          </button>
        </div>
      );
    }

    if (latestEntry.status === 'pending') {
      return (
        <div className="league-status-badge league-status-badge--pending">
          Your entry is awaiting admin review
        </div>
      );
    }

    if (latestEntry.status === 'rejected') {
      return (
        <div className="league-status-badge league-status-badge--rejected">
          Entry not approved{latestEntry.admin_notes ? `: ${latestEntry.admin_notes}` : ''} —{' '}
          <button onClick={() => onNavigate('leagues-submit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
            Resubmit
          </button>
        </div>
      );
    }

    // Approved
    return (
      <div className="league-status-badge league-status-badge--approved">
        <RankArrow entry={latestEntry} />
        Position {position?.current_rank ?? '—'}, {latestEntry.age_grade_percent.toFixed(2)}%
      </div>
    );
  };

  const renderProgression = () => {
    if (yearEntries.length === 0) return null;

    const trend = yearEntries.length >= 2
      ? yearEntries[yearEntries.length - 1].age_grade_percent - yearEntries[0].age_grade_percent
      : null;

    return (
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--gray-700)' }}>
          {new Date().getFullYear()} Progression
        </h4>
        <table className="league-progression-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Time</th>
              <th>Age Grade %</th>
            </tr>
          </thead>
          <tbody>
            {yearEntries.map(entry => (
              <tr key={entry.id}>
                <td>{formatDate(entry.event_date)}</td>
                <td>{entry.event_name}</td>
                <td>{entry.finish_time}</td>
                <td>{entry.age_grade_percent.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {trend !== null && (
          <div className={`league-trend ${trend >= 0 ? 'league-trend--up' : 'league-trend--down'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend >= 0 ? '+' : ''}{trend.toFixed(2)}% since first entry this year
          </div>
        )}

        {yearEntries.length < 2 && (
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '8px' }}>
            Submit more parkruns to see your progression
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="league-status card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3 className="card-title">Your League Status</h3>
      </div>
      <div className="card-content">
        {renderStatusBadge()}
        {renderProgression()}
      </div>
    </div>
  );
};
