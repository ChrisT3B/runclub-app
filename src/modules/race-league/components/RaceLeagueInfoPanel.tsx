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
              Depending on your club finishing position you will be awarded league points for each race. For the Organised races, chip times will be used in preference to gun times, if available. For the handicap race, we will confirm the parameters closer to the time.
              Points are awarded equally for each of the races in the calendar and all races count. So, if you enter all the races, you have a much better chance of winning the overall race league. The points awarded for each club position in the races are shown below in the comments. 
              So, for example if you are the 2nd Run Alcester female to finish a particular race you will score 12 league points or if you are the 7th male you will score 5 league points.
              Please make sure that when you enter the race you add Run Alcester as your club. 
              Also please use our new fantastic Run Alcester app to enter the league and submit your results. This will help us enormously going forward.
              By doing the league in this way, we can write a race league report after the races and share the successes of those taking part and update the league after every race.
              We are trying to keep the league as simple as possible and the aim is to use local races that are accessible and reasonably priced and we can use the league it to celebrate the considerable racing talent we have in our club.
              We will post reminders for entry, but advise early entry wherever possible.
              Good Luck!
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
