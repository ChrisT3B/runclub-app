import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ViewScheduledRuns } from './ViewScheduledRuns';
import { LeadYourRun } from '../../activeruns/components/LeadYourRun';
import { RunsOverview } from './RunsOverview';

interface RunsHubProps {
  onNavigateToAttendance: (runId: string, runTitle: string) => void;
}

type TabId = 'all-runs' | 'my-assignments' | 'overview';

const RETURN_TAB_KEY = 'runsHubReturnTab';
const VALID_TABS: ReadonlyArray<TabId> = ['all-runs', 'my-assignments', 'overview'];

export const RunsHub: React.FC<RunsHubProps> = ({ onNavigateToAttendance }) => {
  const { permissions } = useAuth();
  const isLirfOrAdmin = permissions.canManageRuns;
  const isAdmin = permissions.canManageMembers;

  const defaultTab: TabId = (() => {
    if (typeof window === 'undefined') return 'all-runs';

    // Dashboard deep-link: jump to the run on All Runs
    if (sessionStorage.getItem('scrollToRunId')) return 'all-runs';

    // Returning from RunAttendance: restore the tab the user was on
    const stored = sessionStorage.getItem(RETURN_TAB_KEY);
    if (stored && (VALID_TABS as readonly string[]).includes(stored)) {
      sessionStorage.removeItem(RETURN_TAB_KEY);
      return stored as TabId;
    }

    if (isLirfOrAdmin && !isAdmin) return 'my-assignments';
    return 'all-runs';
  })();

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  const handleNavigateToAttendance = (runId: string, runTitle: string) => {
    // Remember which tab to return to after the attendance flow
    sessionStorage.setItem(RETURN_TAB_KEY, activeTab);
    onNavigateToAttendance(runId, runTitle);
  };

  // Overview row click → switch to All Runs and scroll/highlight that run.
  // ViewScheduledRuns is already mounted (display:none), so its scroll-on-mount
  // effect won't re-fire — handle the scroll directly here.
  const handleNavigateToRun = (runId: string) => {
    setActiveTab('all-runs');
    setTimeout(() => {
      const el = document.getElementById(`run-card-${runId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.5)';
      setTimeout(() => {
        el.style.boxShadow = '';
      }, 2000);
    }, 100);
  };

  return (
    <div>
      <div className="filter-tabs">
        <button
          type="button"
          className={`filter-tab ${activeTab === 'all-runs' ? 'filter-tab--active' : ''}`}
          onClick={() => setActiveTab('all-runs')}
        >
          All Runs
        </button>

        {isLirfOrAdmin && (
          <button
            type="button"
            className={`filter-tab ${activeTab === 'my-assignments' ? 'filter-tab--active' : ''}`}
            onClick={() => setActiveTab('my-assignments')}
          >
            My Assignments
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            className={`filter-tab ${activeTab === 'overview' ? 'filter-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
        )}
      </div>

      <div style={{ display: activeTab === 'all-runs' ? 'block' : 'none' }}>
        <ViewScheduledRuns />
      </div>

      {isLirfOrAdmin && (
        <div style={{ display: activeTab === 'my-assignments' ? 'block' : 'none' }}>
          <LeadYourRun onNavigateToAttendance={handleNavigateToAttendance} />
        </div>
      )}

      {isAdmin && (
        <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
          <RunsOverview onNavigateToRun={handleNavigateToRun} />
        </div>
      )}
    </div>
  );
};

export default RunsHub;
