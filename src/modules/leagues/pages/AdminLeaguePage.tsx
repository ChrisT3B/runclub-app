import React, { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Share2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { ParkrunLeagueEntry } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { PendingEntryCard } from '../components/PendingEntryCard';
import { LeagueShareModal } from '../components/LeagueShareModal';
import { LeagueShareVariant } from '../types/leagueShare';
import '../leagues.css';
import '../leagues-share.css';

interface AdminLeaguePageProps {
  onNavigate: (page: string) => void;
}

export const AdminLeaguePage: React.FC<AdminLeaguePageProps> = ({ onNavigate: _onNavigate }) => {
  const { permissions } = useAuth();
  const [entries, setEntries] = useState<ParkrunLeagueEntry[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string>('Parkrun League');
  const [loading, setLoading] = useState(true);
  const [shareVariants, setShareVariants] = useState<LeagueShareVariant[] | null>(null);
  const [buildingShare, setBuildingShare] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [league, pending] = await Promise.all([
        ParkrunLeagueService.getActiveLeague(),
        ParkrunLeagueService.getPendingEntries(),
      ]);
      if (league) {
        setLeagueId(league.id);
        setLeagueName(league.name);
      }
      setEntries(pending);
      setLoading(false);
    };
    load();
  }, []);

  const handleReviewed = useCallback((entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }, []);

  const handleShare = async () => {
    if (!leagueId) return;
    setBuildingShare(true);
    try {
      const rows = await ParkrunLeagueService.getLeaderboard(leagueId);
      const variant: LeagueShareVariant = {
        label: '',
        data: {
          leagueName,
          updatedDate: format(new Date(), 'd MMMM yyyy'),
          entries: rows.map(r => ({
            rank:   r.rank,
            name:   r.member_name ?? 'Unknown',
            date:   format(parseISO(r.event_date), 'd MMM yyyy'),
            time:   r.finish_time,
            detail: `${r.age_grade_percent.toFixed(2)}%`,
          })),
        },
      };
      setShareVariants([variant]);
    } finally {
      setBuildingShare(false);
    }
  };

  if (!permissions.canManageMembers) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>League Review</h2>
        <div className="league-empty">Access denied. Admin access required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>League Review</h2>
        <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="league-page-header">
        <h2>League Review</h2>
        <div className="league-page-header__actions">
          {entries.length > 0 && (
            <span className="league-pending-count">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} awaiting review
            </span>
          )}
          <button className="btn btn-secondary" onClick={handleShare} disabled={buildingShare || !leagueId}>
            <Share2 size={16} />
            {buildingShare ? 'Loading…' : 'Share Standings'}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="league-empty">No entries awaiting review &#10003;</div>
      ) : (
        entries.map(entry => (
          <PendingEntryCard
            key={entry.id}
            entry={entry}
            leagueId={leagueId ?? entry.league_id}
            onReviewed={handleReviewed}
          />
        ))
      )}

      {shareVariants && (
        <LeagueShareModal variants={shareVariants} onClose={() => setShareVariants(null)} />
      )}
    </div>
  );
};
