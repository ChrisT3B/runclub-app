import React from 'react';
import { RaceLeagueEntry } from '../services/RaceLeagueService';

interface RaceResultsTableProps {
  entries: RaceLeagueEntry[];
  currentUserId: string | null;
}

export const RaceResultsTable: React.FC<RaceResultsTableProps> = ({ entries, currentUserId }) => {
  const maleEntries = entries
    .filter(e => e.gender === 'male')
    .sort((a, b) => (a.gender_position ?? 999) - (b.gender_position ?? 999));

  const femaleEntries = entries
    .filter(e => e.gender === 'female')
    .sort((a, b) => (a.gender_position ?? 999) - (b.gender_position ?? 999));

  const renderSection = (label: string, sectionEntries: RaceLeagueEntry[]) => {
    if (sectionEntries.length === 0) return null;
    return (
      <>
        <tr className="race-results-table__gender-heading">
          <td colSpan={4}>{label}</td>
        </tr>
        {sectionEntries.map(entry => (
          <tr
            key={entry.id}
            className={entry.user_id === currentUserId ? 'race-results-table__highlight' : ''}
          >
            <td>{entry.gender_position ?? '—'}</td>
            <td>{entry.member_name ?? 'Unknown'}</td>
            <td>{entry.finish_time}</td>
            <td>{entry.points_awarded}</td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <table className="race-results-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Name</th>
          <th>Time</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {renderSection('Male', maleEntries)}
        {renderSection('Female', femaleEntries)}
      </tbody>
    </table>
  );
};
