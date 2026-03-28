import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LeaderboardRow } from '../types';
import { RankArrow } from './RankArrow';

interface LeagueTableProps {
  rows: LeaderboardRow[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({ rows }) => {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <div className="league-empty">No entries on the leaderboard yet.</div>;
  }

  return (
    <div className="league-table-wrapper">
      <table className="league-table">
        <thead>
          <tr>
            <th></th>
            <th>Rank</th>
            <th>Name</th>
            <th className="league-table__col-event">parkrun</th>
            <th className="league-table__col-date">Date</th>
            <th>Time</th>
            <th className="league-table__age-grade">Age Grade %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr
                onClick={() => setExpandedRowId(prev => prev === row.id ? null : row.id)}
                data-expanded={expandedRowId === row.id ? 'true' : 'false'}
              >
                <td><RankArrow entry={row} /></td>
                <td>{row.rank}</td>
                <td>
                  {row.member_name}
                  <span className="league-table__chevron">
                    {expandedRowId === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </td>
                <td className="league-table__col-event">{row.event_name}</td>
                <td className="league-table__col-date">{formatDate(row.event_date)}</td>
                <td>{row.finish_time}</td>
                <td className="league-table__age-grade">{row.age_grade_percent.toFixed(2)}</td>
              </tr>
              {expandedRowId === row.id && (
                <tr className="league-table__detail-row">
                  <td colSpan={5}>
                    <div className="league-table__detail">
                      <span>
                        <span className="league-table__detail-label">Event </span>
                        <span className="league-table__detail-value">{row.event_name}</span>
                      </span>
                      <span>
                        <span className="league-table__detail-label">Date </span>
                        <span className="league-table__detail-value">{formatDate(row.event_date)}</span>
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
