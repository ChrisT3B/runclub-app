// AppContent.tsx - Final version that handles password reset properly

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
    console.log('🔄 AppContent handleNavigation called with:', page);
    setCurrentPage(page);
  };

  // Check if we're in a password reset flow
  const isPasswordResetFlow = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlHash = window.location.hash;
    
    // Check for recovery type in URL params or access_token in hash (Supabase redirect)
    const hasRecoveryParam = urlParams.get('type') === 'recovery';
    const hasRecoveryHash = urlHash.includes('access_token') && urlHash.includes('type=recovery');
    
    // ENHANCED DEBUG: Multiple checks
    const isResetPath = window.location.pathname === '/reset-password';
    const hasAnyRecovery = hasRecoveryParam || hasRecoveryHash || isResetPath;
    
    console.log('🔍 AppContent isPasswordResetFlow check:', {
      pathname: window.location.pathname,
      hasRecoveryParam,
      hasRecoveryHash,
      isResetPath,
      fullHash: urlHash,
      fullSearch: window.location.search,
      finalResult: hasAnyRecovery
    });
    
    return hasAnyRecovery;
  };

  // Initialize browser history to prevent PWA closing
  useEffect(() => {
    // Skip history management if we're in password reset flow
    if (isPasswordResetFlow()) {
      console.log('🔄 Skipping history management - in password reset flow');
      return;
    }

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

  // CRITICAL: Show auth content if not authenticated, not initialized, OR in password reset flow
  if (!state.isAuthenticated || !state.isInitialized || isPasswordResetFlow()) {
    console.log('🔄 Showing AuthContent because:', {
      isAuthenticated: state.isAuthenticated,
      isInitialized: state.isInitialized,
      isPasswordResetFlow: isPasswordResetFlow(),
      decision: 'SHOW_AUTH_CONTENT'
    });
    return <AuthContent />;
  }

  console.log('✅ Showing main app content - user authenticated and not in reset flow');

  // Main app navigation
  const renderContent = () => {
    console.log('🎯 AppContent renderContent - currentPage:', currentPage);
    
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
        console.log('✅ Rendering DashboardContent');
        return <DashboardContent />;
      case 'scheduled-runs':
        console.log('✅ Rendering ViewScheduledRuns');
        return <ViewScheduledRuns />;
      case 'manage-runs':
        console.log('✅ Rendering ManageScheduledRuns');
        return <ManageScheduledRuns />;
      case 'profile':
        console.log('✅ Rendering ProfilePage');
        return <ProfilePage />;
      case 'members':
        console.log('✅ Rendering MemberList');
        return <MemberList />;
      case 'create-run':
        console.log('✅ Rendering CreateRunPage');
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
        console.log('✅ Rendering LeadYourRun');
        return (
          <LeadYourRun 
            onNavigateToAttendance={(runId: string, runTitle: string) => {
              setAttendanceRunId(runId);
              setAttendanceRunTitle(runTitle);
            }}
          />
        );
      case 'communications':
        console.log('✅ Rendering CommunicationsDashboard');
        return <CommunicationsDashboard />;
      default:
        console.log('⚠️ Unknown page, defaulting to DashboardContent. Page was:', currentPage);
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