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
        <h2 className="league-admin-hub__title">League Admin</h2>
        <div className="league-admin-hub__denied">
          Access denied. Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="league-admin-hub__title">League Admin</h2>

      <div className="card league-admin-hub__card">
        <div className="card-header">
          <h3 className="card-title">Parkrun League</h3>
        </div>
        <div className="card-content">
          <p className="league-admin-hub__description">
            Review pending parkrun submissions and manage the leaderboard.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('admin-leagues')}>
            Review Entries &rarr;
          </button>
        </div>
      </div>

      <div className="card league-admin-hub__card">
        <div className="card-header">
          <h3 className="card-title">Improvement Report</h3>
        </div>
        <div className="card-content">
          <p className="league-admin-hub__description">
            View each member's age-grade improvement over the league year and export the data as CSV.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('admin-league-improvement')}>
            View Improvement Report &rarr;
          </button>
        </div>
      </div>

      <div className="card league-admin-hub__card">
        <div className="card-header">
          <h3 className="card-title">Expiring Entries</h3>
        </div>
        <div className="card-content">
          <p className="league-admin-hub__description">
            See which members have a leaderboard result over 5 months old so you can remind them to submit a newer one.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('admin-league-expiring')}>
            View Expiring Entries &rarr;
          </button>
        </div>
      </div>

      <div className="card league-admin-hub__card">
        <div className="card-header">
          <h3 className="card-title">Race League</h3>
        </div>
        <div className="card-content">
          <p className="league-admin-hub__description">
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
