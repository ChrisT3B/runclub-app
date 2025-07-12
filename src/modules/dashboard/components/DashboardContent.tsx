import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../modules/auth/hooks/useAuth';
import { BookingService } from '../../../modules/admin/services/bookingService';

interface DashboardContentProps {
  onNavigate?: (page: string) => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ onNavigate }) => {
  const { state } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  
  useEffect(() => {
    loadUpcomingBookings();
  }, [state.user]);
  
  const loadUpcomingBookings = async () => {
    if (!state.user?.id) {
      setLoadingBookings(false);
      return;
    }
    
    try {
      const bookings = await BookingService.getMemberBookings(state.user.id);
      
      // Filter for upcoming runs that aren't cancelled
      const upcoming = bookings.filter(booking => {
        const isNotCancelled = !booking.cancelled_at;
        const isFuture = new Date(booking.run_date) >= new Date();
        return isNotCancelled && isFuture;
      }).slice(0, 3); // Show max 3 upcoming
      
      setUpcomingBookings(upcoming);
    } catch (error) {
      console.error('Failed to load upcoming bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };
      
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome to your RunClub member portal</p>
      </div>
      
      {/* Quick Stats Card */}
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

      {/* Upcoming Runs Section */}
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

      {/* Profile Summary Card */}
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
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.fullName || 'Not set'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.email}</div>
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
  );
};