import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ParkrunLeagueEntry } from '../types';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { PendingEntryCard } from '../components/PendingEntryCard';
import '../leagues.css';

interface AdminLeaguePageProps {
  onNavigate: (page: string) => void;
}

export const AdminLeaguePage: React.FC<AdminLeaguePageProps> = ({ onNavigate: _onNavigate }) => {
  const { permissions } = useAuth();
  const [entries, setEntries] = useState<ParkrunLeagueEntry[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [league, pending] = await Promise.all([
        ParkrunLeagueService.getActiveLeague(),
        ParkrunLeagueService.getPendingEntries(),
      ]);
      if (league) setLeagueId(league.id);
      setEntries(pending);
      setLoading(false);
    };
    load();
  }, []);

  const handleReviewed = useCallback((entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
  }, []);

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
        {entries.length > 0 && (
          <span className="league-pending-count">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} awaiting review
          </span>
        )}
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
    </div>
  );
};
