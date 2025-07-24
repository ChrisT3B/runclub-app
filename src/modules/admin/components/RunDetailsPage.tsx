import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { ScheduledRunsService, RunWithDetails } from '../services/scheduledRunsService';
import { BookingService, BookingError } from '../services/bookingService';
import { DashboardLayout } from '../../../shared/layouts/DashboardLayout';
import { ErrorModal } from '../../../shared/components/ui/ErrorModal';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { formatDate, formatTime } from '../../runs/utils/runUtils';

export const RunDetailsPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { state, permissions } = useAuth();
  
  const [run, setRun] = useState<RunWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState('scheduled-runs');

  // Error Modal State
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (runId) {
      loadRunDetails();
    }
  }, [runId, state.user?.id]);

  const loadRunDetails = async () => {
    if (!runId) return;

    try {
      setLoading(true);
      setError('');

      // Get the specific run with details
      const runs = await ScheduledRunsService.getScheduledRunsWithDetails(state.user?.id);
      const foundRun = runs.find(r => r.id === runId);
      
      if (!foundRun) {
        setError('Run not found');
        return;
      }

      setRun(foundRun);
    } catch (err: any) {
      console.error('Failed to load run details:', err);
      setError(err.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRun = async () => {
    if (!state.user?.id || !run) return;

    try {
      setBookingLoading(true);
      await BookingService.createBooking({
        run_id: run.id,
        member_id: state.user.id
      });

      // Reload run details
      await loadRunDetails();
      
    } catch (err) {
      console.error('Booking error:', err);
      
      if (err instanceof BookingError) {
        setErrorModal({
          isOpen: true,
          title: err.title || 'Booking Error',
          message: err.message
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Booking Failed',
          message: 'An unexpected error occurred while booking. Please try again.'
        });
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!run?.user_booking_id) return;

    setConfirmModal({
      isOpen: true,
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel your booking for "${run.run_title}"? This action cannot be undone.`,
      onConfirm: () => {
        closeConfirmModal();
        performCancelBooking();
      }
    });
  };

  const performCancelBooking = async () => {
    if (!run?.user_booking_id) return;

    try {
      setBookingLoading(true);
      await BookingService.cancelBooking(run.user_booking_id, 'Cancelled by member');
      await loadRunDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const closeErrorModal = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const handleNavigate = (page: string) => {
    if (page === 'scheduled-runs') {
      navigate('/');
    } else {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--gray-300)',
            borderTop: '4px solid var(--red-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          Loading run details...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !run) {
    return (
      <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
          <h2 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>
            {error || 'Run Not Found'}
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
            {error ? 'There was a problem loading this run.' : 'The run you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            ← Back to Scheduled Runs
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate}>
      <div>
        {/* Header with back button */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gray-600)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--gray-900)';
                e.currentTarget.style.background = 'var(--gray-100)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--gray-600)';
                e.currentTarget.style.background = 'none';
              }}
              title="Back to Scheduled Runs"
            >
              ←
            </button>
            <div>
              <h1 className="page-title">{run.run_title}</h1>
              <p className="page-description">Run details and booking information</p>
            </div>
          </div>
        </div>

        {/* Run Details Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="card-title">{run.run_title}</h3>
                <p style={{ color: 'var(--gray-600)', margin: '4px 0' }}>
                  📅 {formatDate(run.run_date)} at {formatTime(run.run_time)}
                </p>
              </div>
              
              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {run.is_booked && (
                  <span style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    ✅ You're Booked
                  </span>
                )}
                
                {run.is_full && (
                  <span style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    🚫 Full
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="card-content">
            {/* Run Information Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '24px', 
              marginBottom: '24px' 
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '8px' }}>
                  📍 Meeting Point
                </div>
                <div style={{ color: 'var(--gray-900)', fontSize: '16px' }}>{run.meeting_point}</div>
              </div>
              
              {run.approximate_distance && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '8px' }}>
                    🏃‍♂️ Distance
                  </div>
                  <div style={{ color: 'var(--gray-900)', fontSize: '16px' }}>{run.approximate_distance}</div>
                </div>
              )}
              
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '8px' }}>
                  👥 Participants
                </div>
                <div style={{ color: 'var(--gray-900)', fontSize: '16px' }}>
                  {run.booking_count} / {run.max_participants} booked
                  {run.max_participants - run.booking_count > 0 && (
                    <span style={{ color: 'var(--gray-500)', fontSize: '14px', marginLeft: '8px' }}>
                      ({run.max_participants - run.booking_count} spaces available)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {run.description && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '8px' }}>
                  📝 Description
                </div>
                <div style={{ 
                  color: 'var(--gray-700)', 
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {run.description}
                </div>
              </div>
            )}

            {/* LIRF Information for admins/LIRFs */}
            {permissions.canManageRuns && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '8px' }}>
                  👨‍🏫 LIRF Assignments
                </div>
                {run.assigned_lirfs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {run.assigned_lirfs.map((lirf, index) => (
                      <div key={index} style={{ color: 'var(--gray-700)' }}>
                        • {lirf.name}
                      </div>
                    ))}
                    {run.lirf_vacancies > 0 && (
                      <div style={{ color: 'var(--red-600)', fontWeight: '500' }}>
                        • {run.lirf_vacancies} position{run.lirf_vacancies > 1 ? 's' : ''} still needed
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>
                    No LIRFs assigned yet
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {!state.user ? (
                <div style={{
                  padding: '12px 24px',
                  background: 'var(--gray-100)',
                  color: 'var(--gray-600)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  You're already logged in - refresh the page if you don't see booking options
                </div>
              ) : run.is_booked ? (
                <button
                  onClick={handleCancelBooking}
                  disabled={bookingLoading}
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {bookingLoading ? '⏳' : '🗑️'} 
                  {bookingLoading ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              ) : run.is_full ? (
                <div style={{
                  padding: '12px 24px',
                  background: 'var(--gray-100)',
                  color: 'var(--gray-600)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  This run is currently full
                </div>
              ) : (
                <button
                  onClick={handleBookRun}
                  disabled={bookingLoading}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {bookingLoading ? '⏳' : '🏃‍♂️'} 
                  {bookingLoading ? 'Booking...' : 'Join'}
                </button>
              )}

              <button
                onClick={() => navigate('/')}
                className="btn btn-secondary"
              >
                ← Back to All Runs
              </button>
            </div>
          </div>
        </div>

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          title={errorModal.title}
          message={errorModal.message}
          onClose={closeErrorModal}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirmModal}
          confirmText="Yes, Cancel Booking"
          cancelText="Keep Booking"
          type="danger"
        />
      </div>
    </DashboardLayout>
  );
};