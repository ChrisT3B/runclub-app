import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { ScheduledRunsService, ScheduledRun } from '../services/scheduledRunsService';
import { BookingService, BookingError } from '../services/bookingService';
import { ErrorModal } from '../../../shared/components/ui/ErrorModal';
import { Share2 } from 'lucide-react';
import { formatDate, formatTime, isRunUrgent, handleRunShare } from '../../runs/utils/runUtils';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';


interface RunWithAllInfo extends ScheduledRun {
  booking_count: number;
  is_booked: boolean;
  user_booking_id?: string;
  is_full: boolean;
  bookings?: any[];
  lirf_vacancies: number;
  user_is_assigned_lirf: boolean;
  assigned_lirfs: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

export const ViewScheduledRuns: React.FC = () =>  {
  const { state } = useAuth();
  const [runs, setRuns] = useState<RunWithAllInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'my-bookings' | 'my-assignments'>('all');
  const [urgentVacancies, setUrgentVacancies] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  
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

  const isLIRFOrAdmin = state.user?.access_level === 'lirf' || state.user?.access_level === 'admin';

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu && event.target) {
        const target = event.target as Element;
        const isInsideDropdown = target.closest('.share-dropdown');
        const isShareButton = target.closest('.share-button');
        
        if (!isInsideDropdown && !isShareButton) {
          setShowShareMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  useEffect(() => {
    loadScheduledRuns();
  }, [state.user]);

  const loadScheduledRuns = async () => {
    try {
      setLoading(true);
      const runsData = await ScheduledRunsService.getScheduledRuns();
      
      // Get booking and LIRF information for each run
      const runsWithAllInfo = await Promise.all(
        runsData.map(async (run) => {
          // Get bookings
          const bookings = await BookingService.getRunBookings(run.id);
          const activeBookings = bookings.filter(b => !b.cancelled_at);
          const bookingCount = activeBookings.length;
          
          let isBooked = false;
          let userBookingId: string | undefined;

          if (state.user?.id) {
            try {
              isBooked = await BookingService.hasMemberBookedRun(state.user.id, run.id);
              if (isBooked) {
                const userBookings = await BookingService.getMemberBookings(state.user.id);
                const userBooking = userBookings.find(
                  booking => booking.run_id === run.id && !booking.cancelled_at
                );
                userBookingId = userBooking?.id;
              }
            } catch (error) {
              console.error('Error checking booking status:', error);
            }
          }

          // Get LIRF assignment info
          const assignedLirfs = [];
          let userIsAssignedLirf = false;
          
          if (run.assigned_lirf_1) {
            const lirf = await getLIRFDetails(run.assigned_lirf_1);
            if (lirf) {
              assignedLirfs.push({ ...lirf, position: 1 });
              if (run.assigned_lirf_1 === state.user?.id) userIsAssignedLirf = true;
            }
          }
          if (run.assigned_lirf_2) {
            const lirf = await getLIRFDetails(run.assigned_lirf_2);
            if (lirf) {
              assignedLirfs.push({ ...lirf, position: 2 });
              if (run.assigned_lirf_2 === state.user?.id) userIsAssignedLirf = true;
            }
          }
          if (run.assigned_lirf_3) {
            const lirf = await getLIRFDetails(run.assigned_lirf_3);
            if (lirf) {
              assignedLirfs.push({ ...lirf, position: 3 });
              if (run.assigned_lirf_3 === state.user?.id) userIsAssignedLirf = true;
            }
          }
          
          const lirfVacancies = run.lirfs_required - assignedLirfs.length;

          return {
            ...run,
            booking_count: bookingCount,
            is_booked: isBooked,
            user_booking_id: userBookingId,
            is_full: bookingCount >= run.max_participants,
            bookings: isLIRFOrAdmin ? activeBookings : undefined,
            lirf_vacancies: lirfVacancies,
            user_is_assigned_lirf: userIsAssignedLirf,
            assigned_lirfs: assignedLirfs
          };
        })
      );

      setRuns(runsWithAllInfo);

      // Calculate urgent vacancies for LIRFs/Admins
      if (isLIRFOrAdmin) {
        const urgentCount = runsWithAllInfo
          .filter(run => isRunUrgent(run.run_date, run.lirf_vacancies))
          .reduce((total, run) => total + run.lirf_vacancies, 0);
        
        setUrgentVacancies(urgentCount);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load scheduled runs');
    } finally {
      setLoading(false);
    }
  };

  const getLIRFDetails = async (lirfId: string) => {
    try {
      const lirfs = await ScheduledRunsService.getAvailableLirfs();
      const lirf = lirfs.find(l => l.id === lirfId);
      return lirf ? { id: lirf.id, name: lirf.full_name } : null;
    } catch (error) {
      console.error('Error getting LIRF details:', error);
      return null;
    }
  };

  const handleBookRun = async (runId: string) => {
    if (!state.user?.id) {
      setErrorModal({
        isOpen: true,
        title: 'Login Required',
        message: 'Please log in to book a run.'
      });
      return;
    }

    try {
      setBookingLoading(runId);
      await BookingService.createBooking({
        run_id: runId,
        member_id: state.user.id
      });

      await loadScheduledRuns();
      setError('');
      
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
          message: 'An unexpected error occurred while booking. Please try again or contact support if the problem persists.'
        });
      }
    } finally {
      setBookingLoading(null);
    }
  };

  const closeErrorModal = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const handleCancelBooking = async (runId: string, bookingId: string, runTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel your booking for "${runTitle}"? This action cannot be undone.`,
      onConfirm: () => {
        closeConfirmModal();
        performCancelBooking(runId, bookingId);
      }
    });
  };

  const performCancelBooking = async (runId: string, bookingId: string) => {
    try {
      setBookingLoading(runId);
      await BookingService.cancelBooking(bookingId, 'Cancelled by member');
      await loadScheduledRuns();
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking');
    } finally {
      setBookingLoading(null);
    }
  };

  const handleAssignSelfAsLIRF = async (runId: string) => {
    if (!state.user?.id) return;

    try {
      setAssignmentLoading(runId);
      
      const run = runs.find(r => r.id === runId);
      if (!run) return;

      let updateData: any = {};
      if (!run.assigned_lirf_1) {
        updateData.assigned_lirf_1 = state.user.id;
      } else if (!run.assigned_lirf_2 && run.lirfs_required >= 2) {
        updateData.assigned_lirf_2 = state.user.id;
      } else if (!run.assigned_lirf_3 && run.lirfs_required >= 3) {
        updateData.assigned_lirf_3 = state.user.id;
      } else {
        setError('No LIRF positions available for this run');
        return;
      }

      await ScheduledRunsService.updateScheduledRun(runId, updateData);
      await loadScheduledRuns();
      setError('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to assign LIRF');
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleUnassignSelfAsLIRF = async (runId: string) => {
    if (!state.user?.id) return;

    if (!confirm('Are you sure you want to unassign yourself from this run? Admins will be notified.')) {
      return;
    }

    try {
      setAssignmentLoading(runId);
      
      const run = runs.find(r => r.id === runId);
      if (!run) return;

      let updateData: any = {};
      if (run.assigned_lirf_1 === state.user.id) {
        updateData.assigned_lirf_1 = null;
      } else if (run.assigned_lirf_2 === state.user.id) {
        updateData.assigned_lirf_2 = null;
      } else if (run.assigned_lirf_3 === state.user.id) {
        updateData.assigned_lirf_3 = null;
      }

      await ScheduledRunsService.updateScheduledRun(runId, updateData);
      
      console.log('TODO: Notify admins of LIRF unassignment for run:', run.run_title);
      
      await loadScheduledRuns();
      setError('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to unassign LIRF');
    } finally {
      setAssignmentLoading(null);
    }
  };

  const filteredRuns = runs.filter(run => {
    switch (filter) {
      case 'available':
        return !run.is_booked && !run.is_full;
      case 'my-bookings':
        return run.is_booked;
      case 'my-assignments':
        return isLIRFOrAdmin && run.user_is_assigned_lirf;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="loading">Loading scheduled runs...</div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Scheduled Runs</h1>
        <p className="page-description">
          {isLIRFOrAdmin ? 'Book runs and manage your LIRF assignments' : 'Book your place on upcoming club runs'}
        </p>
      </div>

      {/* Urgent Vacancies Alert - LIRFs/Admins only */}
      {isLIRFOrAdmin && urgentVacancies > 0 && (
        <div className="urgent-alert">
          <div className="urgent-alert__icon">⚠️</div>
          <div className="urgent-alert__content">
            <div className="urgent-alert__title">
              Urgent: {urgentVacancies} LIRF position{urgentVacancies > 1 ? 's' : ''} needed
            </div>
            <div className="urgent-alert__description">
              Runs in the next 7 days require LIRF assignment
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="run-filters">
        <button
          onClick={() => setFilter('all')}
          className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
        >
          All Runs ({runs.length})
        </button>
        
        <button
          onClick={() => setFilter('available')}
          className={`filter-tab ${filter === 'available' ? 'filter-tab--active' : ''}`}
        >
          Available ({runs.filter(r => !r.is_booked && !r.is_full).length})
        </button>

        {state.user && (
          <button
            onClick={() => setFilter('my-bookings')}
            className={`filter-tab ${filter === 'my-bookings' ? 'filter-tab--active' : ''}`}
          >
            My Bookings ({runs.filter(r => r.is_booked).length})
          </button>
        )}

        {isLIRFOrAdmin && (
          <button
            onClick={() => setFilter('my-assignments')}
            className={`filter-tab ${filter === 'my-assignments' ? 'filter-tab--active' : ''}`}
          >
            My LIRF Duties ({runs.filter(r => r.user_is_assigned_lirf).length})
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {filteredRuns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏃‍♂️</div>
          <h3 className="empty-state__title">
            {filter === 'available' ? 'No Available Runs' : 
             filter === 'my-bookings' ? 'No Bookings Yet' : 
             filter === 'my-assignments' ? 'No LIRF Assignments' : 'No Scheduled Runs'}
          </h3>
          <p className="empty-state__description">
            {filter === 'available' ? 'All current runs are either full or you have already booked them.' :
             filter === 'my-bookings' ? 'You haven\'t booked any runs yet.' :
             filter === 'my-assignments' ? 'You haven\'t been assigned as LIRF to any runs yet.' :
             'No runs are currently scheduled.'}
          </p>
        </div>
      ) : (
        <div className="runs-grid">
          {filteredRuns.map((run) => {
            const isUrgent = isLIRFOrAdmin && isRunUrgent(run.run_date, run.lirf_vacancies);
            
            return (
              <div 
                key={run.id} 
                className={`run-card ${isUrgent ? 'run-card--urgent' : ''}`}
              >
                <div className="run-card__content">
                  <div className="run-card__layout">
                    <div className="run-card__info">
                      <div className="run-card__header">
                        <h3 className="run-card__title">
                          {run.run_title}
                        </h3>
                        
                        {/* Status Badges */}
                        <div className="run-card__badges">
                          {run.is_booked && (
                            <div className="status-badge status-badge--booked">
                              ✅ Booked
                            </div>
                          )}
                          
                          {isLIRFOrAdmin && run.user_is_assigned_lirf && (
                            <div className="status-badge status-badge--lirf-assigned">
                              👨‍🏫 LIRF Assigned
                            </div>
                          )}
                          
                          {run.is_full && (
                            <div className="status-badge status-badge--full">
                              🚫 Full
                            </div>
                          )}
                          
                          {isUrgent && (
                            <div className="status-badge status-badge--urgent">
                              ⚠️ URGENT
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="run-info-grid">
                        <div className="run-info-item">
                          <div className="run-info-item__primary">
                            📅 {formatDate(run.run_date)}
                          </div>
                          <div className="run-info-item__secondary">
                            🕐 {formatTime(run.run_time)}
                          </div>
                        </div>
                        
                        <div className="run-info-item">
                          <div className="run-info-item__primary">
                            📍 {run.meeting_point}
                          </div>
                          {run.approximate_distance && (
                            <div className="run-info-item__secondary">
                              🏃‍♂️ {run.approximate_distance}
                            </div>
                          )}
                        </div>
                        
                        <div className="run-info-item">
                          <div className="run-info-item__primary">
                            👥 {run.booking_count}/{run.max_participants} booked
                          </div>
                          {isLIRFOrAdmin && (
                            <div className="run-info-item__secondary">
                              👨‍🏫 {run.assigned_lirfs.length}/{run.lirfs_required} LIRF{run.lirfs_required > 1 ? 's' : ''}
                              {run.lirf_vacancies > 0 && (
                                <span className="run-info-item__highlight">
                                  {' '}({run.lirf_vacancies} needed)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {run.description && (
                        <div className="run-description">
                          {run.description}
                        </div>
                      )}

                      {/* LIRF Assignment Info - LIRFs/Admins only */}
                      {isLIRFOrAdmin && (
                        <div className="lirf-info">
                          <div className="lirf-info__title">
                            LIRF Assignments
                          </div>
                          {run.assigned_lirfs.length > 0 ? (
                            <div className="lirf-info__list">
                              {run.assigned_lirfs.map((lirf, index) => (
                                <div key={index} className="lirf-info__item">
                                  • {lirf.name}
                                </div>
                              ))}
                              {run.lirf_vacancies > 0 && (
                                <div className="lirf-info__vacancy">
                                  • {run.lirf_vacancies} position{run.lirf_vacancies > 1 ? 's' : ''} still needed
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="lirf-info__empty">
                              No LIRFs assigned yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="run-card__actions">
                      {/* Member Booking Actions */}
                      {!state.user ? (
                        <div className="action-status action-status--unavailable">
                          Log in to book
                        </div>
                      ) : run.is_booked ? (
                        <button
                          onClick={() => run.user_booking_id && handleCancelBooking(run.id, run.user_booking_id, run.run_title)}
                          disabled={bookingLoading === run.id}
                          className="action-btn action-btn--danger"
                        >
                          {bookingLoading === run.id ? 'Cancelling...' : '🗑️ Cancel Booking'}
                        </button>
                      ) : run.is_full ? (
                        <div className="action-status action-status--full">
                          Run is full
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBookRun(run.id)}
                          disabled={bookingLoading === run.id}
                          className="action-btn action-btn--primary"
                        >
                          {bookingLoading === run.id ? 'Booking...' : '🏃‍♂️ Book Run'}
                        </button>
                      )}

                      {/* Share Button - LIRFs/Admins only */}
                      {isLIRFOrAdmin && (
                        <div className="share-menu">
                          <button
                            className="share-button action-btn action-btn--secondary"
                            onClick={() => setShowShareMenu(showShareMenu === run.id ? null : run.id)}
                          >
                            <Share2 size={16} />
                            Share Run
                          </button>
                          
                          {showShareMenu === run.id && (
                            <div className="share-dropdown">
                              <div className="share-dropdown__content">
                                <div
                                  className="share-dropdown__item"
                                  onClick={() => {
                                    handleRunShare(run, 'copy');
                                    setShowShareMenu(null);
                                  }}
                                >
                                  📋 Copy to Clipboard
                                </div>
                                
                                <div
                                  className="share-dropdown__item"
                                  onClick={() => {
                                    handleRunShare(run, 'facebook-group');
                                    setShowShareMenu(null);
                                  }}
                                >
                                  🎯 Post to Club Facebook Group
                                </div>
                                
                                <div
                                  className="share-dropdown__item"
                                  onClick={() => {
                                    handleRunShare(run, 'facebook');
                                    setShowShareMenu(null);
                                  }}
                                >
                                  📘 Share on Facebook
                                </div>
                                
                                <div
                                  className="share-dropdown__item"
                                  onClick={() => {
                                    handleRunShare(run, 'whatsapp');
                                    setShowShareMenu(null);
                                  }}
                                >
                                  💬 Share on WhatsApp
                                </div>
                                
                                <div
                                  className="share-dropdown__item"
                                  onClick={() => {
                                    handleRunShare(run, 'twitter');
                                    setShowShareMenu(null);
                                  }}
                                >
                                  🐦 Share on Twitter/X
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* LIRF Assignment Actions - LIRFs/Admins only */}
                      {isLIRFOrAdmin && (
                        run.user_is_assigned_lirf ? (
                          <button
                            onClick={() => handleUnassignSelfAsLIRF(run.id)}
                            disabled={assignmentLoading === run.id}
                            className="action-btn action-btn--danger"
                          >
                            {assignmentLoading === run.id ? 'Unassigning...' : '👨‍🏫 Unassign LIRF'}
                          </button>
                        ) : run.lirf_vacancies > 0 ? (
                          <button
                            onClick={() => handleAssignSelfAsLIRF(run.id)}
                            disabled={assignmentLoading === run.id}
                            className="action-btn action-btn--secondary"
                          >
                            {assignmentLoading === run.id ? 'Assigning...' : '👨‍🏫 Assign Me as LIRF'}
                          </button>
                        ) : (
                          <div className="action-status action-status--assigned">
                            LIRFs fully assigned
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
  );
};

export default ViewScheduledRuns;