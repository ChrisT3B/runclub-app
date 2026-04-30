import React, { useEffect, useState } from 'react';
import { ScheduledRunsService, LirfCoverageRow } from '../../admin/services/scheduledRunsService';

const COVERAGE_DAYS = 30;

interface RunsOverviewProps {
  onNavigateToRun?: (runId: string) => void;
}

export const RunsOverview: React.FC<RunsOverviewProps> = ({ onNavigateToRun }) => {
  const [rows, setRows] = useState<LirfCoverageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await ScheduledRunsService.getLirfCoverage(COVERAGE_DAYS);
        if (!cancelled) setRows(data);
      } catch (err) {
        console.error('RunsOverview load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const urgentCount = rows.filter(r => r.lirfCount === 0).length;
  const partialCount = rows.filter(r => r.lirfCount > 0 && r.lirfCount < r.lirfsRequired).length;
  const fullCount = rows.filter(r => r.lirfCount >= r.lirfsRequired && r.lirfsRequired > 0).length;

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const coverageClass = (row: LirfCoverageRow): string => {
    if (row.lirfCount === 0) return 'runs-overview-row--urgent';
    if (row.lirfCount < row.lirfsRequired) return 'runs-overview-row--partial';
    return 'runs-overview-row--full';
  };

  if (loading) {
    return <div className="loading">Loading overview...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">LIRF Overview</h1>
        <p className="page-description">
          Upcoming run LIRF coverage — next {COVERAGE_DAYS} days
        </p>
      </div>

      <div className="runs-overview-stats">
        <div className="runs-overview-stat">
          <div className="runs-overview-stat__number runs-overview-stat__number--red">
            {urgentCount}
          </div>
          <div className="runs-overview-stat__label">No LIRF assigned</div>
        </div>
        <div className="runs-overview-stat">
          <div className="runs-overview-stat__number runs-overview-stat__number--amber">
            {partialCount}
          </div>
          <div className="runs-overview-stat__label">Partially covered</div>
        </div>
        <div className="runs-overview-stat">
          <div className="runs-overview-stat__number runs-overview-stat__number--green">
            {fullCount}
          </div>
          <div className="runs-overview-stat__label">Fully staffed</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="card-content runs-overview-empty">
            <div className="runs-overview-empty__icon">🏃‍♂️</div>
            <p className="page-description">
              No upcoming runs scheduled in the next {COVERAGE_DAYS} days.
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell">Date</th>
                  <th className="member-table__header-cell">Run</th>
                  <th className="member-table__header-cell">Coverage</th>
                  <th className="member-table__header-cell">LIRF(s)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.runId}
                    className={`member-table__row ${coverageClass(row)}`}
                  >
                    <td className="member-table__cell">{formatDate(row.date)}</td>
                    <td className="member-table__cell">
                      {onNavigateToRun ? (
                        <a
                          href={`#scheduled-runs?runId=${row.runId}`}
                          className="runs-overview-link"
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigateToRun(row.runId);
                          }}
                        >
                          {row.runName}
                        </a>
                      ) : (
                        row.runName
                      )}
                    </td>
                    <td className="member-table__cell">
                      {row.lirfCount} / {row.lirfsRequired}
                    </td>
                    <td className="member-table__cell">
                      {row.lirfNames.length > 0 ? row.lirfNames.join(', ') : 'None assigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunsOverview;
