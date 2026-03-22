import React, { useEffect, useState } from 'react';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { RaceLeagueService } from '../../race-league/services/RaceLeagueService';

interface LeaguesHubPageProps {
  onNavigate: (page: string) => void;
}

export const LeaguesHubPage: React.FC<LeaguesHubPageProps> = ({ onNavigate }) => {
  const [parkrunVisible, setParkrunVisible] = useState(false);
  const [raceLeagueVisible, setRaceLeagueVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pv, rv] = await Promise.all([
        ParkrunLeagueService.isLeagueVisible(),
        RaceLeagueService.isLeagueVisible(),
      ]);
      setParkrunVisible(pv);
      setRaceLeagueVisible(rv);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Club Leagues</h2>
        <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
      </div>
    );
  }

  if (!parkrunVisible && !raceLeagueVisible) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Club Leagues</h2>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--gray-500)' }}>
          No leagues available at the moment.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Club Leagues</h2>

      {parkrunVisible && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <h3 className="card-title">Parkrun League</h3>
          </div>
          <div className="card-content">
            <p style={{ color: 'var(--gray-600)', marginBottom: '12px' }}>
              Submit your latest parkrun result and compete on the age-graded leaderboard.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('leagues')}>View League Table</button>
              <button className="btn btn-secondary" onClick={() => onNavigate('leagues-submit')}>Submit a Result</button>
            </div>
          </div>
        </div>
      )}

      {raceLeagueVisible && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <h3 className="card-title">Race League</h3>
          </div>
          <div className="card-content">
            <p style={{ color: 'var(--gray-600)', marginBottom: '12px' }}>
              Submit your race times from externally-organised events and earn points based on finishing position.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('race-league')}>View Races</button>
              <button className="btn btn-secondary" onClick={() => onNavigate('race-league-standings')}>View Standings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
