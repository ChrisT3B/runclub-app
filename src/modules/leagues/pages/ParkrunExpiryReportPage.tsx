import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Copy } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { LeaderboardRow } from '../types';
import { getEntryExpiry } from '../utils/entryExpiry';

interface ParkrunExpiryReportPageProps {
  onNavigate: (page: string) => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export const ParkrunExpiryReportPage: React.FC<ParkrunExpiryReportPageProps> = ({ onNavigate: _onNavigate }) => {
  const { permissions } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noLeague, setNoLeague] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const league = await ParkrunLeagueService.getActiveLeague();
      if (!league) {
        setNoLeague(true);
        setLoading(false);
        return;
      }
      const data = await ParkrunLeagueService.getExpiringEntries(league.id);
      setRows(data);
      setLoading(false);
    };
    load();
  }, []);

  if (!permissions.canManageMembers) {
    return (
      <div>
        <h2 className="expiry-report__title">Expiring Entries</h2>
        <div className="league-empty">Access denied. Admin access required.</div>
      </div>
    );
  }

  const handleCopy = async () => {
    const lines = rows.map(row => {
      const { dropOffDate } = getEntryExpiry(row.event_date);
      return `${row.member_name} (drops off after ${format(dropOffDate, 'd MMM')})`;
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyMessage(`Copied ${rows.length} name${rows.length === 1 ? '' : 's'} to the clipboard.`);
    } catch (error) {
      console.error('copy names failed:', error);
      setCopyMessage('Could not copy to the clipboard.');
    }
  };

  return (
    <div className="expiry-report">
      <div className="expiry-report__header">
        <h2 className="expiry-report__title">Parkrun League: Expiring Entries</h2>
        <div className="expiry-report__actions">
          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            disabled={rows.length === 0}
          >
            <Copy size={14} />
            Copy Names
          </button>
        </div>
      </div>

      <p className="expiry-report__intro">
        Members whose leaderboard result is more than 5 months old. Their entry will drop off at 6 months unless they submit a newer result. Soonest to drop off is listed first.
      </p>

      {copyMessage && (
        <div className="expiry-report__notice">{copyMessage}</div>
      )}

      {loading ? (
        <p className="expiry-report__loading">Loading…</p>
      ) : noLeague ? (
        <div className="league-empty">No active league at the moment.</div>
      ) : rows.length === 0 ? (
        <div className="league-empty">No entries are over 5 months old.</div>
      ) : (
        <div className="league-table-wrapper">
          <table className="league-table league-table--static">
            <thead>
              <tr>
                <th>Name</th>
                <th className="league-table__col-event">parkrun</th>
                <th>Date</th>
                <th className="league-table__col-date">Age Grade %</th>
                <th>Drops Off</th>
                <th className="expiry-report__col-days">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const { dropOffDate, daysLeft } = getEntryExpiry(row.event_date);
                return (
                  <tr key={row.id}>
                    <td>{row.member_name}</td>
                    <td className="league-table__col-event">{row.event_name}</td>
                    <td>{formatDate(row.event_date)}</td>
                    <td className="league-table__col-date">{row.age_grade_percent.toFixed(2)}</td>
                    <td>{format(dropOffDate, 'dd/MM/yyyy')}</td>
                    <td className="expiry-report__col-days">{daysLeft}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
