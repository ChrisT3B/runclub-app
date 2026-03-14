import React, { useEffect, useState } from 'react';
import { League, ParkrunLeagueEntry, LeaderboardRow } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { LeagueTable } from '../components/LeagueTable';
import { MyLeagueStatus } from '../components/MyLeagueStatus';
import { LeagueInfoPanel } from '../components/LeagueInfoPanel';
import '../leagues.css';

interface LeaguePageProps {
  onNavigate: (page: string) => void;
}

export const LeaguePage: React.FC<LeaguePageProps> = ({ onNavigate }) => {
  const [league, setLeague] = useState<League | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [latestEntry, setLatestEntry] = useState<ParkrunLeagueEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const activeLeague = await ParkrunLeagueService.getActiveLeague();
      if (!activeLeague) {
        setLoading(false);
        return;
      }
      setLeague(activeLeague);

      const [rows, entry] = await Promise.all([
        ParkrunLeagueService.getLeaderboard(activeLeague.id),
        ParkrunLeagueService.getMyLatestEntry(activeLeague.id),
      ]);

      setLeaderboard(rows);
      setLatestEntry(entry);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Parkrun League</h2>
        <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
      </div>
    );
  }

  if (!league) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Parkrun League</h2>
        <div className="league-empty">No active league at the moment.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="league-page-header">
        <h2>{league.name}</h2>
        <button className="btn btn-primary" onClick={() => onNavigate('leagues-submit')}>
          Submit a New Entry
        </button>
      </div>

      <LeagueInfoPanel />

      <MyLeagueStatus
        leagueId={league.id}
        latestEntry={latestEntry}
        onNavigate={onNavigate}
      />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Leaderboard</h3>
        </div>
        <div className="card-content">
          <LeagueTable rows={leaderboard} />
        </div>
      </div>
    </div>
  );
};
