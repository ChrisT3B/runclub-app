// AppContent.tsx - Cleaned version with password reset logic removed

import React, { useState, useEffect } from 'react';
import { useAuth } from './modules/auth/context/AuthContext';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { AuthContent } from './modules/auth/components/AuthContent';
import { DashboardContent } from './modules/dashboard/components/DashboardContent';
import { ViewScheduledRuns } from './modules/runs/components/ViewScheduledRuns';
import { ManageScheduledRuns } from './modules/admin/components/ManageScheduledRuns';
import { ProfilePage } from './modules/membership/components/ProfilePage';
import { MemberList } from './modules/admin/components/MemberList';
import { CreateRunPage } from './modules/admin/components/CreateRunPage';
import { LeadYourRun } from './modules/activeruns/components/LeadYourRun';
import { RunAttendance } from './modules/activeruns/components/RunAttendance';
import { CommunicationsDashboard } from './modules/communications/components/CommunicationsDashboard';

export const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // State for attendance navigation
  const [attendanceRunId, setAttendanceRunId] = useState<string | null>(null);
  const [attendanceRunTitle, setAttendanceRunTitle] = useState<string>('');

  // Simple navigation function
  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  // Initialize browser history to prevent PWA closing
  useEffect(() => {
    // Add initial history entry if needed
    if (window.history.length === 1) {
      window.history.pushState({ page: 'dashboard' }, '', window.location.href);
    }

    // Handle browser back button
    const handlePopState = () => {
      // Prevent PWA from closing by staying on dashboard
      setCurrentPage('dashboard');
      // Add another history entry to prevent closing
      window.history.pushState({ page: 'dashboard' }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Show auth content if not authenticated or not initialized
  if (!state.isAuthenticated || !state.isInitialized) {
    return <AuthContent />;
  }

  // Main app navigation
  const renderContent = () => {
    if (attendanceRunId) {
      return (
        <RunAttendance 
          runId={attendanceRunId}
          runTitle={attendanceRunTitle}
          onBack={() => {
            setAttendanceRunId(null);
            setAttendanceRunTitle('');
            setCurrentPage('lead-your-run');
          }}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent />;
      case 'view-runs':
        return <ViewScheduledRuns />;
      case 'manage-runs':
        return <ManageScheduledRuns />;
      case 'profile':
        return <ProfilePage />;
      case 'members':
        return <MemberList />;
      case 'create-run':
        return (
          <CreateRunPage
            onSuccess={() => {
              alert('Scheduled run created successfully!');
              setCurrentPage('dashboard');
            }}
            onCancel={() => setCurrentPage('dashboard')}
          />
        );
      case 'lead-your-run':
        return (
          <LeadYourRun 
            onNavigateToAttendance={(runId: string, runTitle: string) => {
              setAttendanceRunId(runId);
              setAttendanceRunTitle(runTitle);
            }}
          />
        );
      case 'communications':
        return <CommunicationsDashboard />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <DashboardLayout 
      currentPage={currentPage}
      onNavigate={handleNavigation}
    >
      {renderContent()}
    </DashboardLayout>
  );
};