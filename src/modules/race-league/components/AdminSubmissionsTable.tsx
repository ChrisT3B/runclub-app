import React from 'react';
import { format, parseISO } from 'date-fns';
import { RaceLeagueEntry } from '../services/RaceLeagueService';

interface AdminSubmissionsTableProps {
  entries: RaceLeagueEntry[];
}

export const AdminSubmissionsTable: React.FC<AdminSubmissionsTableProps> = ({ entries }) => {
  const maleCount = entries.filter(e => e.gender === 'male').length;
  const femaleCount = entries.filter(e => e.gender === 'female').length;

  const sorted = [...entries].sort((a, b) => {
    if (a.gender !== b.gender) return a.gender === 'male' ? -1 : 1;
    return a.finish_time.localeCompare(b.finish_time);
  });

  return (
    <div>
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginBottom: '12px' }}>
        {maleCount} male, {femaleCount} female submissions.
      </p>
      <table className="admin-submissions-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Time</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(entry => (
            <tr key={entry.id}>
              <td>{entry.member_name ?? 'Unknown'}</td>
              <td>{entry.gender === 'male' ? 'Male' : 'Female'}</td>
              <td>{entry.finish_time}</td>
              <td>{format(parseISO(entry.submitted_at), 'd MMM yyyy HH:mm')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
