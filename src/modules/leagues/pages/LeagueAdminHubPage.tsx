import React from 'react';
import { useAuth } from '../../auth/context/AuthContext';

interface LeagueAdminHubPageProps {
  onNavigate: (page: string) => void;
}

export const LeagueAdminHubPage: React.FC<LeagueAdminHubPageProps> = ({ onNavigate }) => {
  const { permissions } = useAuth();

  if (!permissions.canManageMembers) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>League Admin</h2>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--gray-500)' }}>
          Access denied. Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>League Admin</h2>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h3 className="card-title">Parkrun League</h3>
        </div>
        <div className="card-content">
          <p style={{ color: 'var(--gray-600)', marginBottom: '12px' }}>
            Review pending parkrun submissions and manage the leaderboard.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('admin-leagues')}>
            Review Entries &rarr;
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h3 className="card-title">Race League</h3>
        </div>
        <div className="card-content">
          <p style={{ color: 'var(--gray-600)', marginBottom: '12px' }}>
            Manage races, control submissions, configure points, and lock results.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('admin-race-league')}>
            Manage Race League &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
