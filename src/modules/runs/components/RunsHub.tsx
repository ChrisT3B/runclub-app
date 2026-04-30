import React, { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ViewScheduledRuns } from './ViewScheduledRuns';
import { LeadYourRun } from '../../activeruns/components/LeadYourRun';
import { RunsOverview } from './RunsOverview';

interface RunsHubProps {
  onNavigateToAttendance: (runId: string, runTitle: string) => void;
}

type TabId = 'all-runs' | 'my-assignments' | 'overview';

export const RunsHub: React.FC<RunsHubProps> = ({ onNavigateToAttendance }) => {
  const { permissions } = useAuth();
  const isLirfOrAdmin = permissions.canManageRuns;
  const isAdmin = permissions.canManageMembers;

  const defaultTab: TabId = (() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('scrollToRunId')) {
      return 'all-runs';
    }
    if (isLirfOrAdmin && !isAdmin) return 'my-assignments';
    return 'all-runs';
  })();

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

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
          <LeadYourRun onNavigateToAttendance={onNavigateToAttendance} />
        </div>
      )}

      {isAdmin && (
        <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
          <RunsOverview />
        </div>
      )}
    </div>
  );
};

export default RunsHub;
