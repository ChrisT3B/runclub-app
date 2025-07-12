import React, { useState } from 'react';
import { useAuth } from './modules/auth/hooks/useAuth';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { AuthContent } from './modules/auth/components/AuthContent';
import { DashboardContent } from './modules/dashboard/components/DashboardContent';
import { ViewScheduledRuns } from './modules/admin/components/ViewScheduledRuns';
import { ManageScheduledRuns } from './modules/admin/components/ManageScheduledRuns';
import { ProfilePage } from './modules/membership/components/ProfilePage';
import { MemberList } from './modules/admin/components/MemberList';
import { CreateRunPage } from './modules/admin/components/CreateRunPage';

export const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

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
      onNavigate={setCurrentPage}
    >
      {currentPage === 'dashboard' && <DashboardContent onNavigate={setCurrentPage} />}
      {currentPage === 'scheduled-runs' && <ViewScheduledRuns />}
      {currentPage === 'manage-runs' && <ManageScheduledRuns />}
      {currentPage === 'profile' && <ProfilePage />}
      {currentPage === 'members' && <MemberList />}
      {currentPage === 'create-run' && (
        <CreateRunPage
          onSuccess={() => {
            alert('Scheduled run created successfully!');
            setCurrentPage('dashboard');
          }}
          onCancel={() => setCurrentPage('dashboard')}
        />
      )}
    </DashboardLayout>
  );
};