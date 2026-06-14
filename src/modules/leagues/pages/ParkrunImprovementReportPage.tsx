import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Download, RefreshCw, Share2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import {
  ParkrunImprovementService,
  ImprovementReportMember,
} from '../services/ParkrunImprovementService';
import { LeagueShareModal } from '../components/LeagueShareModal';
import { LeagueShareVariant } from '../types/leagueShare';
import '../leagues.css';
import '../leagues-share.css';

interface ParkrunImprovementReportPageProps {
  onNavigate: (page: string) => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDelta(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
}

export const ParkrunImprovementReportPage: React.FC<ParkrunImprovementReportPageProps> = ({ onNavigate: _onNavigate }) => {
  const { permissions } = useAuth();
  const [report, setReport] = useState<ImprovementReportMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [shareVariants, setShareVariants] = useState<LeagueShareVariant[] | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await ParkrunImprovementService.getImprovementReport();
    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (!permissions.canManageMembers) {
    return (
      <div>
        <h2 className="improvement-report__title">Improvement Report</h2>
        <div className="league-empty">Access denied. Admin access required.</div>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      await ParkrunImprovementService.exportCSV();
    } catch (error) {
      console.error('exportCSV failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = () => {
    const variant: LeagueShareVariant = {
      label: '',
      data: {
        leagueName: 'Parkrun Improvement League',
        updatedDate: format(new Date(), 'd MMMM yyyy'),
        entries: report.map((member, index) => ({
          rank:   index + 1,
          name:   member.member_name,
          detail: `+${member.total_improvement.toFixed(2)}%`,
        })),
      },
    };
    setShareVariants([variant]);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMessage(null);
    try {
      const count = await ParkrunImprovementService.backfillAll();
      setBackfillMessage(`Recalculated improvement data for ${count} member${count === 1 ? '' : 's'}.`);
      await load();
    } catch (error) {
      console.error('backfillAll failed:', error);
      setBackfillMessage('Backfill failed — see console for details.');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="improvement-report">
      <div className="improvement-report__header">
        <h2 className="improvement-report__title">Parkrun Improvement Report</h2>
        <div className="improvement-report__actions">
          <button
            className="btn btn-secondary"
            onClick={handleBackfill}
            disabled={backfilling}
          >
            <RefreshCw size={14} />
            {backfilling ? 'Recalculating…' : 'Recalculate All'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleShare}
            disabled={report.length === 0}
          >
            <Share2 size={14} />
            Share Standings
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting || report.length === 0}
          >
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {backfillMessage && (
        <div className="improvement-report__notice">{backfillMessage}</div>
      )}

      {loading ? (
        <p className="improvement-report__loading">Loading…</p>
      ) : report.length === 0 ? (
        <div className="league-empty">No improvement data yet.</div>
      ) : (
        <div className="league-table-wrapper">
          <table className="league-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Member</th>
                <th className="improvement-report__col-total">Total Improvement</th>
                <th className="improvement-report__col-entries">Entries</th>
              </tr>
            </thead>
            <tbody>
              {report.map((member, index) => (
                <React.Fragment key={member.user_id}>
                  <tr
                    onClick={() =>
                      setExpandedId(prev => (prev === member.user_id ? null : member.user_id))
                    }
                    data-expanded={expandedId === member.user_id ? 'true' : 'false'}
                  >
                    <td>{index + 1}</td>
                    <td>
                      {member.member_name}
                      <span className="improvement-report__chevron">
                        {expandedId === member.user_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </td>
                    <td className="improvement-report__col-total">
                      {formatDelta(member.total_improvement)}%
                    </td>
                    <td className="improvement-report__col-entries">{member.entries.length}</td>
                  </tr>
                  {expandedId === member.user_id && (
                    <tr className="improvement-report__detail-row">
                      <td colSpan={4}>
                        <table className="improvement-report__detail-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Event</th>
                              <th>AG%</th>
                              <th>Baseline</th>
                              <th>Delta</th>
                              <th>Running Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {member.entries.map((e, i) => (
                              <tr key={i}>
                                <td>{formatDate(e.event_date)}</td>
                                <td>{e.event_name}</td>
                                <td>{e.age_grade_percent.toFixed(2)}</td>
                                <td>{e.baseline_at_submission.toFixed(2)}</td>
                                <td
                                  className={
                                    e.improvement_delta > 0
                                      ? 'improvement-report__delta--up'
                                      : 'improvement-report__delta--flat'
                                  }
                                >
                                  {formatDelta(e.improvement_delta)}
                                </td>
                                <td>{e.cumulative_improvement.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shareVariants && (
        <LeagueShareModal variants={shareVariants} onClose={() => setShareVariants(null)} />
      )}
    </div>
  );
};
