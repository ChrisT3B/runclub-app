// AppContent.tsx - Updated with password reset path detection

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
import { PasswordResetForm } from './modules/auth/components/PasswordResetForm';

export const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // State for attendance navigation
  const [attendanceRunId, setAttendanceRunId] = useState<string | null>(null);
  const [attendanceRunTitle, setAttendanceRunTitle] = useState<string>('');

  // State for password reset mode
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);

  // Simple navigation function
  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  // Password reset completion handler
  const handlePasswordResetComplete = () => {
    // Clear the URL and exit reset mode
    window.history.replaceState({}, document.title, '/');
    setIsPasswordResetMode(false);
    setCurrentPage('dashboard');
  };

  // Check for password reset path FIRST
  useEffect(() => {
    // Check if this is a password reset redirect
    if (window.location.pathname === '/reset-password') {
      console.log('Password reset path detected');
      setIsPasswordResetMode(true);
      return; // Don't set up normal navigation
    }
  }, []);

  // Initialize browser history to prevent PWA closing
  useEffect(() => {
    // Skip if we're in password reset mode
    if (isPasswordResetMode) return;

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
  }, [isPasswordResetMode]);

  // Show password reset if in reset mode
  if (isPasswordResetMode) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ 
          maxWidth: '400px', 
          margin: '0 auto', 
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '100vh'
        }}>
          <PasswordResetForm 
            onSuccess={() => {
              alert('Password updated successfully! Please log in with your new password.');
              handlePasswordResetComplete();
            }}
            onBack={handlePasswordResetComplete}
          />
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          {/* Add this simple refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Refresh App
        </button>
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