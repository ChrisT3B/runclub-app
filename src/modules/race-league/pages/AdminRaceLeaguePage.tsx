import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../services/supabase';
import { RaceLeagueService, RaceLeagueRace, getRaceStatus, RACE_STATUS_LABELS, RACE_STATUS_CSS } from '../services/RaceLeagueService';
import { League } from '../../leagues/types';
import { PointsEditor } from '../components/PointsEditor';
import { AdminRaceForm } from '../components/AdminRaceForm';

interface AdminRaceLeaguePageProps {
  onNavigate: (page: string, raceId?: string) => void;
}

export const AdminRaceLeaguePage: React.FC<AdminRaceLeaguePageProps> = ({ onNavigate }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [races, setRaces] = useState<RaceLeagueRace[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setIsAdmin(false); setLoading(false); return; }

    const { data } = await supabase
      .from('members')
      .select('access_level')
      .eq('id', user.id)
      .single();
    if (data?.access_level !== 'admin') { setIsAdmin(false); setLoading(false); return; }
    setIsAdmin(true);

    const activeLeague = await RaceLeagueService.getActiveLeague();
    setLeague(activeLeague);
    if (activeLeague) {
      const raceList = await RaceLeagueService.getRaces(activeLeague.id);
      setRaces(raceList);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (isAdmin === false) return null;
  if (loading) return <div className="race-league-empty">Loading...</div>;

  const handleSavePoints = async (points: Record<string, number>) => {
    if (!league) return;
    await RaceLeagueService.updatePointsStructure(league.id, points);
    const refreshed = await RaceLeagueService.getActiveLeague();
    setLeague(refreshed);
  };

  const handleRaceCreated = async () => {
    setShowAddForm(false);
    if (league) {
      const raceList = await RaceLeagueService.getRaces(league.id);
      setRaces(raceList);
    }
  };

  return (
    <div>
      <h2>Race League Admin</h2>

      {/* Season Settings */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Season Settings</h3>
        </div>
        <div className="card-content">
          {!league ? (
            <p style={{ color: 'var(--gray-500)' }}>
              No active Race League found. Insert a row into the <code>leagues</code> table with{' '}
              <code>type = 'race_series'</code> and <code>is_active = true</code> to get started.
            </p>
          ) : (
            <>
              <p><strong>{league.name}</strong> &mdash; Season {league.season_year}</p>
              <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>Points Table</h4>
              <PointsEditor initialStructure={league.points_structure} onSave={handleSavePoints} />
            </>
          )}
        </div>
      </div>

      {/* Races */}
      {league && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Races</h3>
            <button className="btn btn-primary" onClick={() => setShowAddForm(prev => !prev)}>
              {showAddForm ? 'Cancel' : '+ Add Race'}
            </button>
          </div>
          <div className="card-content">
            {showAddForm && (
              <AdminRaceForm
                leagueId={league.id}
                onSuccess={handleRaceCreated}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {races.length === 0 ? (
              <div className="race-league-empty">No races added yet.</div>
            ) : (
              races.map(race => {
                const status = getRaceStatus(race);
                return (
                  <div key={race.id} className="race-card">
                    <div className="race-card__header">
                      <span className="race-card__name">{race.name}</span>
                      <span className={`race-status ${RACE_STATUS_CSS[status]}`}>
                        {RACE_STATUS_LABELS[status]}
                      </span>
                    </div>
                    <div className="race-card__meta">
                      {format(parseISO(race.race_date), 'd MMM yyyy')}
                    </div>
                    <div className="race-card__actions">
                      <button className="btn btn-secondary" onClick={() => onNavigate('admin-race-league-race', race.id)}>
                        Manage &rarr;
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
