// AppContent.tsx - Enhanced with navigation history

import React, { useState, useEffect } from 'react';
import { useAuth } from './modules/auth/context/AuthContext';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { AuthContent } from './modules/auth/components/AuthContent';
import { DashboardContent } from './modules/dashboard/components/DashboardContent';
import { ViewScheduledRuns } from './modules/admin/components/ViewScheduledRuns';
import { ManageScheduledRuns } from './modules/admin/components/ManageScheduledRuns';
import { ProfilePage } from './modules/membership/components/ProfilePage';
import { MemberList } from './modules/admin/components/MemberList';
import { CreateRunPage } from './modules/admin/components/CreateRunPage';
import { LeadYourRun } from './modules/activeruns/components/LeadYourRun';
import { RunAttendance } from './modules/activeruns/components/RunAttendance';
import { CommunicationsDashboard } from './modules/communications/components/CommunicationsDashboard';
import { useNavigationHistory } from './shared/hooks/useNavigationHistory';

export const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { addToHistory, goBack, canGoBack } = useNavigationHistory();
  
  // State for attendance navigation
  const [attendanceRunId, setAttendanceRunId] = useState<string | null>(null);
  const [attendanceRunTitle, setAttendanceRunTitle] = useState<string>('');

  // Enhanced navigation function that tracks history
  const handleNavigation = (page: string) => {
    if (page !== currentPage && currentPage !== 'dashboard') {
      // Add current page to history (except dashboard)
      addToHistory(currentPage);
    }
    setCurrentPage(page);
  };

  // Handle browser back navigation
  useEffect(() => {
    const handleNavigateBack = (event: CustomEvent) => {
      const previousPage = event.detail.page;
      setCurrentPage(previousPage);
    };

    window.addEventListener('navigate-back', handleNavigateBack as EventListener);
    return () => window.removeEventListener('navigate-back', handleNavigateBack as EventListener);
  }, []);

  // Handle programmatic back navigation
  const handleGoBack = () => {
    const previousPage = goBack();
    setCurrentPage(previousPage);
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show authentication content if not authenticated
  if (!state.isAuthenticated) {
    return <AuthContent />;
  }

  // Show dashboard if authenticated
  return (
    <DashboardLayout 
      currentPage={currentPage} 
      onNavigate={handleNavigation}
      canGoBack={canGoBack && currentPage !== 'dashboard'}
      onGoBack={handleGoBack}
    >
      {currentPage === 'dashboard' && <DashboardContent onNavigate={handleNavigation} />}
      
      {currentPage === 'scheduled-runs' && <ViewScheduledRuns />}
      
      {currentPage === 'lead-your-run' && (
        <LeadYourRun 
          onNavigateToAttendance={(runId: string, runTitle: string) => {
            setAttendanceRunId(runId);
            setAttendanceRunTitle(runTitle);
            handleNavigation('run-attendance');
          }}
        />
      )}
      
      {currentPage === 'run-attendance' && attendanceRunId && (
        <RunAttendance 
          runId={attendanceRunId}
          runTitle={attendanceRunTitle}
          onBack={() => {
            setCurrentPage('lead-your-run');
            setAttendanceRunId(null);
            setAttendanceRunTitle('');
          }}
        />
      )}
      
      {currentPage === 'manage-runs' && <ManageScheduledRuns />}
      
      {currentPage === 'profile' && <ProfilePage />}
      
      {currentPage === 'members' && <MemberList />}
      
      {currentPage === 'communications' && <CommunicationsDashboard onNavigate={handleNavigation} />}
      
      {currentPage === 'create-run' && (
        <CreateRunPage
          onSuccess={() => {
            alert('Scheduled run created successfully!');
            handleNavigation('dashboard');
          }}
          onCancel={() => handleNavigation('dashboard')}
        />
      )}
    </DashboardLayout>
  );
};