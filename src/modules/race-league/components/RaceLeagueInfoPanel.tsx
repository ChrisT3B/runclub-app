import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RaceLeagueInfoPanelProps {
  pointsStructure: Record<string, number> | null;
}

export const RaceLeagueInfoPanel: React.FC<RaceLeagueInfoPanelProps> = ({ pointsStructure }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sortedPoints = pointsStructure
    ? Object.entries(pointsStructure).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    : [];

  return (
    <div className="race-info-panel">
      <button
        className="race-info-panel__toggle"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls="race-league-info-content"
      >
        <span>How the Race League works</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="race-info-panel__content" id="race-league-info-content">
          <h4>Run Alcester Race League</h4>
          <p>
            The Race League tracks your results across a series of externally-organised races throughout the season.
            After completing a race, submit your finish time via the app. Scoring is split by gender — your finishing
            position among league entrants in your gender group determines how many points you earn. Points accumulate
            across all races in the season.
          </p>

          {sortedPoints.length > 0 ? (
            <table className="race-info-panel__points-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {sortedPoints.map(([pos, pts]) => (
                  <tr key={pos}>
                    <td>{pos}</td>
                    <td>{pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Points to be announced.</p>
          )}
        </div>
      )}
    </div>
  );
};
