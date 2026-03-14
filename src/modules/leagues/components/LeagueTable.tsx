import React from 'react';
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
  if (rows.length === 0) {
    return <div className="league-empty">No entries on the leaderboard yet.</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="league-table">
        <thead>
          <tr>
            <th></th>
            <th>Rank</th>
            <th>Name</th>
            <th>parkrun</th>
            <th>Date</th>
            <th>Time</th>
            <th className="league-table__age-grade">Age Grade %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><RankArrow entry={row} /></td>
              <td>{row.rank}</td>
              <td>{row.member_name}</td>
              <td>{row.event_name}</td>
              <td>{formatDate(row.event_date)}</td>
              <td>{row.finish_time}</td>
              <td className="league-table__age-grade">{row.age_grade_percent.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
