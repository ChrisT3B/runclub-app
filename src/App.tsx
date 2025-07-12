import { useState, useEffect } from 'react'
import { AuthProvider } from './modules/auth/context/AuthContext'
import { LoginForm } from './modules/auth/components/LoginForm'
import { RegisterForm } from './modules/auth/components/RegisterForm'
import { ForgotPasswordForm } from './modules/auth/components/ForgotPasswordForm'
import { PasswordResetForm } from './modules/auth/components/PasswordResetForm'
import { useAuth } from './modules/auth/hooks/useAuth'
import { AuthLayout } from './shared/layouts/AuthLayout'
import { DashboardLayout } from './shared/layouts/DashboardLayout'
import { ProfileEditForm } from './modules/membership/components/ProfileEditForm'
import { MemberList } from './modules/admin/components/MemberList'
import { CreateScheduledRunForm } from './modules/admin/components/CreateScheduledRunForm'
import { ManageScheduledRuns } from './modules/admin/components/ManageScheduledRuns'
import { ViewScheduledRuns } from './modules/admin/components/ViewScheduledRuns'
import { BookingService } from './modules/admin/services/bookingService'


// Dashboard content component - Updated with booking info
const DashboardContent = ({ onNavigate }: { onNavigate?: (page: string) => void }) => {
  const { state } = useAuth()
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  
  useEffect(() => {
    loadUpcomingBookings()
  }, [state.user])
  
  const loadUpcomingBookings = async () => {
    if (!state.user?.id) {
      setLoadingBookings(false)
      return
    }
    
    try {
      const bookings = await BookingService.getMemberBookings(state.user.id)
      console.log('All bookings:', bookings)
      
      // Filter for upcoming runs that aren't cancelled
      const upcoming = bookings.filter(booking => {
        const isNotCancelled = !booking.cancelled_at
        const isFuture = new Date(booking.run_date) >= new Date()
        console.log(`Booking ${booking.run_title}: cancelled=${!!booking.cancelled_at}, future=${isFuture}, date=${booking.run_date}`)
        return isNotCancelled && isFuture
      }).slice(0, 3) // Show max 3 upcoming
      
      console.log('Upcoming bookings:', upcoming)
      setUpcomingBookings(upcoming)
    } catch (error) {
      console.error('Failed to load upcoming bookings:', error)
    } finally {
      setLoadingBookings(false)
    }
  }
      
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }
  
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
return (
  <>
    <div className="page-header">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-description">Welcome to your RunClub member portal</p>
    </div>
    
    {/* Quick Stats Card - Now at the top */}
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3 className="card-title">Quick Stats</h3>
      </div>
      <div className="card-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
              {loadingBookings ? '...' : upcomingBookings.length}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Upcoming Runs</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
              12
            </div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Events Attended</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
              Dec 2024
            </div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Member Since</div>
          </div>
        </div>
      </div>
    </div>

    {/* Upcoming Runs Section - Now 2nd position */}
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3 className="card-title">Your Upcoming Runs</h3>
        <button 
          className="btn btn-primary"
          onClick={() => onNavigate?.('scheduled-runs')}
          style={{ fontSize: '14px' }}
        >
          View All Runs
        </button>
      </div>
      <div className="card-content">
        {loadingBookings ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
            Loading your bookings...
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏃‍♂️</div>
            <p style={{ margin: '0 0 8px 0' }}>No upcoming runs booked</p>
            <button 
              className="btn btn-secondary"
              onClick={() => onNavigate?.('scheduled-runs')}
              style={{ fontSize: '14px', marginTop: '12px' }}
            >
              Browse Available Runs
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingBookings.map((booking) => (
              <div 
                key={booking.id}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  background: 'var(--gray-50)',
                  borderRadius: '8px',
                  border: '1px solid var(--gray-200)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--red-primary)', marginBottom: '4px' }}>
                    {booking.run_title}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                    📅 {formatDate(booking.run_date)} at {formatTime(booking.run_time)}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                    📍 {booking.meeting_point}
                  </div>
                </div>
                <div style={{ 
                  background: '#dcfce7', 
                  color: '#166534', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '500' 
                }}>
                  ✅ Booked
                </div>
              </div>
            ))}
            
            {upcomingBookings.length > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={() => onNavigate?.('scheduled-runs')}
                style={{ fontSize: '14px', alignSelf: 'flex-start', marginTop: '8px' }}
              >
                Manage All Bookings →
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Profile Card - Now 3rd position */}
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Your Profile</h3>
        <button 
          className="btn btn-secondary"
          onClick={() => onNavigate?.('profile')}
          style={{ fontSize: '14px' }}
        >
          Edit Profile
        </button>
      </div>
      <div className="card-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Name:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.user?.fullName || 'Chris Tompkins'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.user?.email || 'christompkins@3bprojects.co.uk'}</div>
            </div>
          </div>
          <div>
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
        {currentPage === 'dashboard' && <DashboardContent onNavigate={setCurrentPage} />}
        {currentPage === 'scheduled-runs' && <ViewScheduledRuns />}
        {currentPage === 'manage-runs' && <ManageScheduledRuns />}
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
        {currentPage === 'create-run' && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Create Scheduled Run</h1>
              <p className="page-description">Set up new running sessions for club members</p>
            </div>
            <CreateScheduledRunForm 
              onSuccess={() => {
                alert('Scheduled run created successfully!');
                setCurrentPage('dashboard');
              }}
              onCancel={() => setCurrentPage('dashboard')}
            />
          </div>
        )}
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