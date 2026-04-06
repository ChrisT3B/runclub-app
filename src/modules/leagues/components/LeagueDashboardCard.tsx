import React, { useEffect, useState } from 'react';
import { ParkrunLeagueEntry, RankMovement } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { RankArrow } from './RankArrow';
import { RaceLeagueService, RaceLeagueRace } from '../../race-league/services/RaceLeagueService';
import { League } from '../types';

const SUBMISSIONS_OPEN_DATE = new Date('2026-05-01');
const submissionsOpen = new Date() >= SUBMISSIONS_OPEN_DATE;

interface LeagueDashboardCardProps {
  onNavigate: (page: string) => void;
}

export const LeagueDashboardCard: React.FC<LeagueDashboardCardProps> = ({ onNavigate }) => {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestEntry, setLatestEntry] = useState<ParkrunLeagueEntry | null>(null);
  const [position, setPosition] = useState<{
    current_rank: number | null;
    age_grade_percent: number | null;
    movement: RankMovement;
  } | null>(null);
  const [hasLeague, setHasLeague] = useState(false);

  const [raceLeagueVisible, setRaceLeagueVisible] = useState<boolean | null>(null);
  const [activeRaceLeague, setActiveRaceLeague]   = useState<League | null>(null);
  const [upcomingRace, setUpcomingRace]           = useState<RaceLeagueRace | null>(null);
  const [raceCount, setRaceCount]                 = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const isVisible = await ParkrunLeagueService.isLeagueVisible();
      if (!isVisible) {
        setVisible(false);
        setLoading(false);
        return;
      }
      setVisible(true);

      const league = await ParkrunLeagueService.getActiveLeague();
      if (!league) {
        setHasLeague(false);
        setLoading(false);
        return;
      }
      setHasLeague(true);

      const [entry, pos] = await Promise.all([
        ParkrunLeagueService.getMyLatestEntry(league.id),
        ParkrunLeagueService.getMyLeaderboardPosition(league.id),
      ]);

      setLatestEntry(entry);
      setPosition(pos);

      const isRaceVisible = await RaceLeagueService.isLeagueVisible();
      setRaceLeagueVisible(isRaceVisible);
      if (isRaceVisible) {
        const raceLeague = await RaceLeagueService.getActiveLeague();
        setActiveRaceLeague(raceLeague);
        if (raceLeague) {
          const races = await RaceLeagueService.getRaces(raceLeague.id);
          setRaceCount(races.length);
          const today = new Date().toISOString().split('T')[0];
          const upcoming = races.find(r => !r.results_locked && r.race_date >= today);
          setUpcomingRace(upcoming ?? null);
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  // Show card if either the Parkrun League or Race League is visible.
  // Only hide if both are definitively invisible/absent.
  if (visible === false && !raceLeagueVisible) return null;
  if (!loading && !hasLeague && !activeRaceLeague) return null;

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Club Leagues</h3>
        </div>
        <div className="card-content">
          <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // Not entered
    if (!latestEntry) {
      return (
        <div className="league-card-row">
          <span className="league-card-name">Parkrun League:</span>
          <span className="league-card-position">Not entered</span>
          <div className="league-card-actions">
            {submissionsOpen ? (
              <button onClick={() => onNavigate('leagues-submit')}>Join the Parkrun League &rarr;</button>
            ) : (
              <span className="league-submissions-closed">Entries open 1st May</span>
            )}
          </div>
        </div>
      );
    }

    // Rejected
    if (latestEntry.status === 'rejected') {
      return (
        <div className="league-card-row">
          <span className="league-card-name">Parkrun League:</span>
          <span style={{ color: 'var(--danger-color)' }}>Entry not approved</span>
          <div className="league-card-actions">
            {submissionsOpen ? (
              <button onClick={() => onNavigate('leagues-submit')}>Resubmit &rarr;</button>
            ) : (
              <span className="league-submissions-closed">Entries open 1st May</span>
            )}
          </div>
        </div>
      );
    }

    // Pending
    if (latestEntry.status === 'pending') {
      return (
        <div className="league-card-row">
          <span className="league-card-name">Parkrun League:</span>
          <span className="league-card-position">Position —, {latestEntry.age_grade_percent.toFixed(2)}%</span>
          <span className="league-card-pending">Awaiting approval</span>
        </div>
      );
    }

    // Approved with rank
    const rankEntry = position ? {
      current_rank: position.current_rank,
      last_rank: latestEntry.last_rank,
      rank_updated_at: latestEntry.rank_updated_at,
    } : { current_rank: null, last_rank: null, rank_updated_at: null };

    return (
      <div className="league-card-row">
        <span className="league-card-name">Parkrun League:</span>
        <RankArrow entry={rankEntry} />
        <span className="league-card-position">
          Position {position?.current_rank ?? '—'}, {(position?.age_grade_percent ?? latestEntry.age_grade_percent).toFixed(2)}%
        </span>
        <div className="league-card-actions">
          {submissionsOpen ? (
            <button onClick={() => onNavigate('leagues-submit')}>Submit a new result</button>
          ) : (
            <span className="league-submissions-closed">Entries open 1st May</span>
          )}
          <button onClick={() => onNavigate('leagues')}>View league table</button>
        </div>
      </div>
    );
  };

  const renderRaceLeagueRow = () => {
    if (!raceLeagueVisible || !activeRaceLeague) return null;
    return (
      <div
        className="league-card-row"
        style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--gray-200)' }}
      >
        <span className="league-card-name">Race League:</span>
        <span className="league-card-position">
          {raceCount} {raceCount === 1 ? 'race' : 'races'}
          {upcomingRace ? ` · Next: ${upcomingRace.name}` : ''}
        </span>
        <div className="league-card-actions">
          <button onClick={() => onNavigate('race-league')}>View races</button>
          <button onClick={() => onNavigate('race-league-standings')}>View standings</button>
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3 className="card-title">Club Leagues</h3>
      </div>
      <div className="card-content">
        {renderContent()}
        {renderRaceLeagueRow()}
      </div>
    </div>
  );
};
