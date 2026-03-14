import React, { useEffect, useState } from 'react';
import { ParkrunLeagueEntry, RankMovement } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { RankArrow } from './RankArrow';

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
      setLoading(false);
    };
    load();
  }, []);

  if (visible === false || (!loading && !hasLeague)) return null;

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
            <button onClick={() => onNavigate('leagues-submit')}>Join the Parkrun League &rarr;</button>
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
            <button onClick={() => onNavigate('leagues-submit')}>Resubmit &rarr;</button>
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
          <button onClick={() => onNavigate('leagues-submit')}>Submit a new result</button>
          <button onClick={() => onNavigate('leagues')}>View league table</button>
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
      </div>
    </div>
  );
};
