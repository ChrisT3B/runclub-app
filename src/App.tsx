import React, { useState, useEffect } from 'react'
import { AuthProvider } from './modules/auth/context/AuthContext'
import { LoginForm } from './modules/auth/components/LoginForm'
import { RegisterForm } from './modules/auth/components/RegisterForm'
import { ForgotPasswordForm } from './modules/auth/components/ForgotPasswordForm'
import { PasswordResetForm } from './modules/auth/components/PasswordResetForm'
import { useAuth } from './modules/auth/hooks/useAuth'
import { AuthLayout } from './shared/layouts/AuthLayout'
import { DashboardLayout } from './shared/layouts/DashboardLayout'
import { Card } from './shared/components/ui/Card'
import { PageHeader } from './shared/components/ui/PageHeader'
import { ProfileEditForm } from './modules/membership/components/ProfileEditForm'
import { MemberList } from './modules/admin/components/MemberList'

// Dashboard content component - Updated for custom CSS
const DashboardContent = () => {
  const { state } = useAuth()
  
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome to your RunClub member portal</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Profile</h3>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Name:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.user?.fullName || 'Chris Tompkins'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.user?.email || 'christompkins@3bprojects.co.uk'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Access Level:</div>
              <span style={{ 
                background: 'var(--red-light)', 
                color: 'var(--red-primary)', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '500' 
              }}>
                {state.user?.accessLevel || 'member'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Status:</div>
              <span style={{ 
                background: '#dcfce7', 
                color: '#166534', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '500' 
              }}>
                {state.user?.membershipStatus || 'Pending'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Stats</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: 'var(--gray-600)' }}>Upcoming Events:</span>
              <span style={{ fontWeight: '600' }}>3</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: 'var(--gray-600)' }}>Events Attended:</span>
              <span style={{ fontWeight: '600' }}>12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gray-600)' }}>Member Since:</span>
              <span style={{ fontWeight: '600' }}>Dec 2024</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
            <p>No recent activity to display</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Your event bookings and activity will appear here</p>
          </div>
        </div>
      </div>
    </>
  )
}

// Main app content with navigation
const AppContent = () => {
  const { state } = useAuth()
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [profileMode, setProfileMode] = useState<'view' | 'edit'>('view')

  useEffect(() => {
    // Check if this is a password reset link
    const urlParams = new URLSearchParams(window.location.search)
    const type = urlParams.get('type')
    
    if (type === 'recovery') {
      setCurrentView('reset')
    }
  }, [])
  
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Show dashboard if authenticated (except during password reset)
  if (state.isAuthenticated && currentView !== 'reset') {
    return (
      <DashboardLayout 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
      >
        {currentPage === 'dashboard' && <DashboardContent />}
        {currentPage === 'events' && (
          <div>
            <PageHeader title="Events" subtitle="View and book upcoming runs" />
            <Card>
              <p className="text-gray-500">Events module coming soon...</p>
            </Card>
          </div>
        )}
  
{currentPage === 'profile' && (
  <div>
    <div className="page-header">
      <h1 className="page-title">My Profile</h1>
      <p className="page-description">Manage your profile and settings</p>
    </div>
    
    {profileMode === 'view' ? (
      // View Mode
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Profile Information</h3>
          <button 
            className="btn btn-primary"
            onClick={() => setProfileMode('edit')}
          >
            Edit Profile
          </button>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Name:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.fullName || 'Not set'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Phone:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.phone || 'Not set'}</div>
              </div>
            </div>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Emergency Contact:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.emergencyContact || 'Not set'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Emergency Phone:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.emergencyPhone || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Access Level:</div>
                <span style={{ 
                  background: 'var(--red-light)', 
                  color: 'var(--red-primary)', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '500' 
                }}>
                  {state.user?.accessLevel || 'member'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      // Edit Mode
      <ProfileEditForm 
        onCancel={() => setProfileMode('view')}
        onSave={() => setProfileMode('view')}
      />
    )}
  </div>
)}
{currentPage === 'members' && <MemberList />}

        {/* Add more pages as needed */}
      </DashboardLayout>
    )
  }
  
  // Authentication flows
  return (
    <AuthLayout>
      {currentView === 'login' && (
        <LoginForm 
          onSuccess={() => console.log('Login successful!')}
          onForgotPassword={() => setCurrentView('forgot')}
          onRegister={() => setCurrentView('register')}
        />
      )}
      
      {currentView === 'register' && (
        <RegisterForm 
          onSuccess={() => console.log('Registration successful!')}
          onLogin={() => setCurrentView('login')}
        />
      )}
      
      {currentView === 'forgot' && (
        <ForgotPasswordForm 
          onBack={() => setCurrentView('login')}
        />
      )}
      
      {currentView === 'reset' && (
        <PasswordResetForm 
          onSuccess={() => {
            alert('Password updated successfully! Please log in with your new password.')
            setCurrentView('login')
          }}
          onBack={() => setCurrentView('forgot')}
        />
      )}
    </AuthLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App