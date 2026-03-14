import React, { useEffect, useState } from 'react';
import { ParkrunLeagueService } from '../services/ParkrunLeagueService';
import { SubmitEntryForm } from '../components/SubmitEntryForm';
import { SubmitEntryFormData } from '../types';
import '../leagues.css';

interface SubmitEntryPageProps {
  onNavigate: (page: string) => void;
}

export const SubmitEntryPage: React.FC<SubmitEntryPageProps> = ({ onNavigate }) => {
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [savedAthleteId, setSavedAthleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [league, athleteId] = await Promise.all([
        ParkrunLeagueService.getActiveLeague(),
        ParkrunLeagueService.getSavedAthleteId(),
      ]);
      if (league) setLeagueId(league.id);
      setSavedAthleteId(athleteId);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Submit a Parkrun Result</h2>
        <p style={{ color: 'var(--gray-500)' }}>Loading...</p>
      </div>
    );
  }

  if (!leagueId) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Submit a Parkrun Result</h2>
        <div className="league-empty">No active league at the moment.</div>
        <button className="btn" onClick={() => onNavigate('leagues')} style={{ marginTop: '16px' }}>
          Back to League
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div>
        <h2 style={{ marginBottom: '24px' }}>Submit a Parkrun Result</h2>
        <div className="league-success card">
          <div className="card-content">
            <h3 style={{ color: 'var(--success-color)', marginBottom: '8px' }}>Entry Submitted</h3>
            <p>An admin will review it shortly. You will be notified if there is a problem.</p>
            <button className="btn btn-primary" onClick={() => onNavigate('leagues')}>
              Back to League
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (formData: SubmitEntryFormData) => {
    await ParkrunLeagueService.submitEntry(formData, leagueId);
    setSubmitted(true);
  };

  return (
    <div>
      <div className="league-page-header">
        <h2>Submit a Parkrun Result</h2>
        <button className="btn" onClick={() => onNavigate('leagues')} style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
          Back to League
        </button>
      </div>
      <div className="card">
        <div className="card-content">
          <SubmitEntryForm savedAthleteId={savedAthleteId} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
};
