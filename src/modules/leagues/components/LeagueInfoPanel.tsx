import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function LeagueInfoPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="league-info-panel">
      <button
        className="league-info-panel__toggle"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls="league-info-content"
      >
        <span>How the league works</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div
          id="league-info-content"
          className="league-info-panel__content"
        >
          <h3>Run Alcester Parkrun League</h3>

          <p>
            The Run Alcester Parkrun League is open to anyone who uses the Run Alcester app — no matter your pace, age, or how long you've been running. It's just for fun, but the kind of fun that gets you out of bed on a Saturday morning.
          </p>

          <h4>How does it work?</h4>

          <p>
            The league is ranked using parkrun's <strong>Age Grade percentage</strong> — a score that adjusts your finish time based on your age and gender, so everyone competes on a level playing field. Whether you're chasing a PB or just keeping consistent, there's always something to aim for. Even if your fastest days are behind you, a birthday can nudge your age grade up — and that counts.
          </p>

          <p>
            The league reflects <strong>current form</strong>. Only results from the last 6 months appear on the leaderboard. Once your result is more than 6 months old it drops off automatically, so you'll need to submit a more recent run to stay in the league.
          </p>

          <p>
            Want to understand age grade scoring better? <a href="https://support.parkrun.com/hc/en-us/articles/200565263" target="_blank" rel="noopener noreferrer">What is Age Grade? — parkrun support</a>
          </p>

          <h4>How do I join?</h4>

          <ol>
            <li>Run a parkrun — any parkrun, anywhere</li>
            <li>Open the app and go to <strong>League &rarr; Submit a New Result</strong></li>
            <li>Enter your <strong>parkrun venue</strong>, <strong>date</strong>, <strong>finish time</strong>, and <strong>age grade %</strong> — all shown in your parkrun results email</li>
            <li>Your submission will be reviewed and will appear on the leaderboard once approved</li>
          </ol>

          <p>
            You can submit a new result any time. If your age grade improves — by running faster or simply having a birthday and matching your previous time — just submit again and your leaderboard position will update.
          </p>

          <h4>A few things worth knowing</h4>

          <ul>
            <li>You can join at any time — there's no fixed start date</li>
            <li>Each person has one active entry on the leaderboard (your most recently submitted approved result)</li>
            <li>Results older than 6 months drop off automatically to keep the league based on current form</li>
            <li>Each month the admin team will post a league update — including a heads-up for anyone whose result is due to expire soon</li>
            <li>The leaderboard updates as results are approved — check back after submitting</li>
          </ul>

          <p>
            Any questions? Post them in the Run Alcester Facebook group and we'll see you at a parkrun soon!
          </p>
        </div>
      )}
    </div>
  );
}
