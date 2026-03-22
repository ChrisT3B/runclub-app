import React, { useEffect, useState } from 'react';
import '../race-league.css';
import { RaceLeagueService, RaceLeagueRace } from '../services/RaceLeagueService';
import { League } from '../../leagues/types';
import { RaceLeagueInfoPanel } from '../components/RaceLeagueInfoPanel';
import { RaceCard } from '../components/RaceCard';

interface RaceLeaguePageProps {
  onNavigate: (page: string, raceId?: string) => void;
}

export const RaceLeaguePage: React.FC<RaceLeaguePageProps> = ({ onNavigate }) => {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [races, setRaces] = useState<RaceLeagueRace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const isVisible = await RaceLeagueService.isLeagueVisible();
      setVisible(isVisible);
      if (!isVisible) { setLoading(false); return; }

      const activeLeague = await RaceLeagueService.getActiveLeague();
      setLeague(activeLeague);
      if (activeLeague) {
        const raceList = await RaceLeagueService.getRaces(activeLeague.id);
        setRaces(raceList);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (visible === false) return null;
  if (loading) return <div className="race-league-empty">Loading...</div>;

  if (!league) {
    return (
      <div className="card">
        <div className="card-content">
          <div className="race-league-empty">No active Race League found.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="race-league-page-header">
        <h2>{league.name}</h2>
        <button className="btn btn-secondary" onClick={() => onNavigate('race-league-standings')}>View Standings &rarr;</button>
      </div>

      <RaceLeagueInfoPanel pointsStructure={league.points_structure} />

      <h3>Races</h3>

      {races.length === 0 ? (
        <div className="race-league-empty">No races scheduled yet.</div>
      ) : (
        races.map(race => (
          <RaceCard key={race.id} race={race} onNavigate={onNavigate} />
        ))
      )}
    </div>
  );
};
