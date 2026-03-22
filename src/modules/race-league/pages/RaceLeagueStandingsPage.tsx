import React, { useEffect, useState } from 'react';
import { RaceLeagueService, RaceLeagueStanding, Gender } from '../services/RaceLeagueService';

interface RaceLeagueStandingsPageProps {
  onNavigate: (page: string) => void;
}

export const RaceLeagueStandingsPage: React.FC<RaceLeagueStandingsPageProps> = ({ onNavigate }) => {
  const [maleStandings, setMaleStandings] = useState<RaceLeagueStanding[]>([]);
  const [femaleStandings, setFemaleStandings] = useState<RaceLeagueStanding[]>([]);
  const [activeTab, setActiveTab] = useState<Gender>('male');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const league = await RaceLeagueService.getActiveLeague();
      if (league) {
        const [male, female] = await Promise.all([
          RaceLeagueService.getStandings(league.id, 'male'),
          RaceLeagueService.getStandings(league.id, 'female'),
        ]);
        setMaleStandings(male);
        setFemaleStandings(female);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="race-league-empty">Loading...</div>;

  const standings = activeTab === 'male' ? maleStandings : femaleStandings;

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => onNavigate('race-league')} style={{ marginBottom: '16px' }}>
        &larr; Back to Race League
      </button>

      <h2>Season Standings</h2>

      <div className="race-league-tabs">
        <button
          className={`race-league-tab ${activeTab === 'male' ? 'race-league-tab--active' : ''}`}
          onClick={() => setActiveTab('male')}
        >
          Male
        </button>
        <button
          className={`race-league-tab ${activeTab === 'female' ? 'race-league-tab--active' : ''}`}
          onClick={() => setActiveTab('female')}
        >
          Female
        </button>
      </div>

      {standings.length === 0 ? (
        <div className="race-league-empty">No results published yet.</div>
      ) : (
        <table className="race-results-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Name</th>
              <th>Points</th>
              <th>Races</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.user_id}>
                <td>{i + 1}</td>
                <td>{s.member_name ?? 'Unknown'}</td>
                <td>{s.total_points}</td>
                <td>{s.races_scored}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
