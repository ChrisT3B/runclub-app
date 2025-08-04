import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ScheduledRunsService, RunWithDetails } from '../services/scheduledRunsService';
import { BookingService, BookingError } from '../services/bookingService';
import { ErrorModal } from '../../../shared/components/ui/ErrorModal';
import { Share2 } from 'lucide-react';
import { formatDate, formatTime, isRunUrgent, handleRunShare, ShareCallbacks } from '../../runs/utils/runUtils';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { renderTextWithLinks } from '../../../utils/linkHelper';

export const ViewScheduledRuns: React.FC = () => {
  const { state, permissions } = useAuth();
  const [runs, setRuns] = useState<RunWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'my-bookings' | 'my-assignments'>('all');
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  
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

  // Share Success Modal State
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Use permissions instead of checking access_level directly
  const canManageRuns = permissions.canManageRuns; // true for LIRF and admin

  // Helper function to get responsive button text
  const getButtonText = useCallback((fullText: string, shortText: string, loading: boolean, loadingText: string) => {
    if (loading) return loadingText;
    
    // Use shorter text on mobile
    if (window.innerWidth <= 768) {
      return shortText;
    }
    
    return fullText;
  }, []);

  // Modal control functions
  const closeErrorModal = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const closeShareModal = () => {
    setShareModal({ isOpen: false, title: '', message: '' });
  };

  // Description expansion toggle
  const toggleDescription = (runId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
  };

  // Truncate description helper
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // OPTIMIZED: Single comprehensive API call
  const loadScheduledRuns = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use the ultra-optimized method
      const runsWithDetails = await ScheduledRunsService.getScheduledRunsWithDetails(state.user?.id);
      setRuns(runsWithDetails);

    } catch (err: any) {
      console.error('Failed to load runs:', err);
      setError(err.message || 'Failed to load scheduled runs');
    } finally {
      setLoading(false);
    }
  }, [state.user?.id]);

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

  // Load runs when user changes
  useEffect(() => {
    loadScheduledRuns();
  }, [loadScheduledRuns]);

  // PERFORMANCE: Use useMemo for expensive calculations
  const { filteredRuns, urgentVacancies, filterCounts } = useMemo(() => {
    const filtered = runs.filter(run => {
      switch (filter) {
        case 'available':
          return !run.is_booked && !run.is_full;
        case 'my-bookings':
          return run.is_booked;
        case 'my-assignments':
          return canManageRuns && run.user_is_assigned_lirf;
        default:
          return true;
      }
    });

    const urgent = canManageRuns 
      ? runs
          .filter(run => isRunUrgent(run.run_date, run.lirf_vacancies))
          .reduce((total, run) => total + run.lirf_vacancies, 0)
      : 0;

    const counts = {
      all: runs.length,
      available: runs.filter(r => !r.is_booked && !r.is_full).length,
      myBookings: runs.filter(r => r.is_booked).length,
      myAssignments: runs.filter(r => r.user_is_assigned_lirf).length
    };

    return { filteredRuns: filtered, urgentVacancies: urgent, filterCounts: counts };
  }, [runs, filter, canManageRuns]);

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

      // OPTIMIZED: Only reload data, don't need to refetch everything
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

  const handleCancelBooking = async (runId: string, bookingId: string, runTitle: string) => {
    if (!state.user?.id) return;

    setConfirmModal({
      isOpen: true,
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel your booking for "${runTitle}"?`,
      onConfirm: () => {
        closeConfirmModal();
        performCancelBooking(runId, bookingId);
      }
    });
  };

  const performCancelBooking = async (runId: string, bookingId: string) => {
    try {
      setBookingLoading(runId);
      
      await BookingService.cancelBooking(bookingId, 'User cancelled');
      await loadScheduledRuns();
      setError('');
      
    } catch (err) {
      console.error('Cancellation error:', err);
      
      if (err instanceof BookingError) {
        setErrorModal({
          isOpen: true,
          title: err.title || 'Cancellation Error',
          message: err.message
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Cancellation Failed',
          message: 'Failed to cancel booking. Please try again or contact support if the problem persists.'
        });
      }
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
      } else if (!run.assigned_lirf_2) {
        updateData.assigned_lirf_2 = state.user.id;
      } else if (!run.assigned_lirf_3) {
        updateData.assigned_lirf_3 = state.user.id;
      } else {
        setErrorModal({
          isOpen: true,
          title: 'LIRF Assignment Failed',
          message: 'All LIRF positions are already filled for this run.'
        });
        return;
      }

      await ScheduledRunsService.updateScheduledRun(runId, updateData);
      await loadScheduledRuns();
      setError('');
      
    } catch (err: any) {
      console.error('LIRF assignment error:', err);
    
      if (err instanceof BookingError) {
        setErrorModal({
          isOpen: true,
          title: err.title || 'LIRF Assignment Failed',
          message: err.message
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: 'LIRF Assignment Failed',
          message: err.message || 'Failed to assign LIRF position. Please try again.'
        });
      }
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleUnassignSelfAsLIRF = async (runId: string) => {
    if (!state.user?.id) return;

    const run = runs.find(r => r.id === runId);
    if (!run) return;

    setConfirmModal({
      isOpen: true,
      title: 'Unassign LIRF',
      message: `Are you sure you want to unassign yourself as LIRF from "${run.run_title}"? Admins will be notified of this change.`,
      onConfirm: () => {
        closeConfirmModal();
        performUnassignLIRF(runId);
      }
    });
  };

  const performUnassignLIRF = async (runId: string) => {
    if (!state.user?.id) return;

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
      console.error('LIRF unassignment error:', err);
      
      if (err instanceof BookingError) {
        setErrorModal({
          isOpen: true,
          title: err.title || 'LIRF Unassignment Failed',
          message: err.message
        });
      } else {
        setErrorModal({
          isOpen: true,
          title: 'LIRF Unassignment Failed',
          message: err.message || 'Failed to unassign LIRF position. Please try again.'
        });
      }
    } finally {
      setAssignmentLoading(null);
    }
  };

  // Share callbacks
  const shareCallbacks: ShareCallbacks = {
    onSuccess: (message: string) => {
      setShareModal({
        isOpen: true,
        title: 'Success!',
        message
      });
      setShowShareMenu(null);
    },
    onError: (message: string) => {
      setErrorModal({
        isOpen: true,
        title: 'Share Failed',
        message
      });
      setShowShareMenu(null);
    },
    onFacebookGroupShare: (message: string) => {
      setShareModal({
        isOpen: true,
        title: 'Shared to Facebook Group',
        message
      });
      setShowShareMenu(null);
    }
  };

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
          {canManageRuns ?
            'Book runs and manage LIRF assignments. Urgent LIRF vacancies are highlighted.' :
            'Book and manage your upcoming runs.'
          }
        </p>
        
        {canManageRuns && urgentVacancies > 0 && (
          <div className="urgent-alert">
            <div className="urgent-alert__icon">⚠️</div>
            <div className="urgent-alert__content">
              <div className="urgent-alert__title">Urgent LIRF Assignments Needed</div>
              <div className="urgent-alert__message">
                {urgentVacancies} LIRF position{urgentVacancies > 1 ? 's' : ''} needed for runs in the next 48 hours
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={loadScheduledRuns} className="error-retry">
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          onClick={() => setFilter('all')}
          className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
        >
          All Runs ({filterCounts.all})
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`filter-tab ${filter === 'available' ? 'filter-tab--active' : ''}`}
        >
          Available ({filterCounts.available})
        </button>
        <button
          onClick={() => setFilter('my-bookings')}
          className={`filter-tab ${filter === 'my-bookings' ? 'filter-tab--active' : ''}`}
        >
          My Bookings ({filterCounts.myBookings})
        </button>
        {canManageRuns && (
          <button
            onClick={() => setFilter('my-assignments')}
            className={`filter-tab ${filter === 'my-assignments' ? 'filter-tab--active' : ''}`}
          >
            My LIRF Assignments ({filterCounts.myAssignments})
          </button>
        )}
      </div>

      {/* Run Cards */}
      {filteredRuns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📅</div>
          <div className="empty-state__title">
            {filter === 'all' ? 'No runs scheduled' :
             filter === 'available' ? 'No available runs' :
             filter === 'my-bookings' ? 'No bookings found' :
             'No LIRF assignments'}
          </div>
          <div className="empty-state__message">
            {filter === 'all' ? 'Check back later for new runs!' :
             filter === 'available' ? 'All runs are either full or you\'re already booked' :
             filter === 'my-bookings' ? 'Book a run to see it here' :
             'No LIRF assignments yet'}
          </div>
        </div>
      ) : (
        <div className="runs-grid">
          {filteredRuns.map((run) => {
            const isUrgent = canManageRuns && isRunUrgent(run.run_date, run.lirf_vacancies);
            const isExpanded = expandedDescriptions.has(run.id);
            const shouldTruncate = run.description && run.description.length > 100;
            
            return (
              <div
                key={run.id}
                className={`card ${run.is_booked ? 'run-card--booked' : ''} ${run.is_full ? 'run-card--full' : ''} ${isUrgent ? 'run-card--urgent' : ''} ${run.user_is_assigned_lirf ? 'run-card--assigned' : ''}`}
              >
                <div className="card-content" style={{ padding: '18px' }}>
                  {/* Header with badges */}
                  <div className="responsive-header">
                    <div>
                      <h3 className="card-title">{run.run_title}</h3>
                      <div className="run-card__badges">
                        {run.is_booked && <span className="badge badge--booked">Booked</span>}
                        {run.is_full && <span className="badge badge--full">Full</span>}
                        {run.user_is_assigned_lirf && <span className="badge badge--assigned">LIRF</span>}
                        {isUrgent && <span className="badge badge--urgent">Urgent</span>}
                      </div>
                    </div>
                  </div>

                  {/* Run Info Grid */}
                  <div className="responsive-info-grid">
                    <div className="run-info-item">
                      <div className="run-info-item__primary">
                        📅 {formatDate(run.run_date)} at {formatTime(run.run_time)}
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
                      {canManageRuns && (
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
                  {/* Description */}
                          {run.description && (
                          <div className="run-description">
                            <div className="run-description__content">
                              {(() => {
                                const textToRender = shouldTruncate && !isExpanded 
                                  ? truncateText(run.description)
                                  : run.description;
                                return renderTextWithLinks(textToRender);
                              })()}
                            </div>
                            {shouldTruncate && (
                              <button
                                onClick={() => toggleDescription(run.id)}
                                className="run-description__toggle"
                              >
                                {isExpanded ? 'Show Less' : 'Show More'}
                              </button>
                            )}
                          </div>
                        )}
                  {/* LIRF Assignment Info - LIRFs/Admins only */}
                  {canManageRuns && (
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
                <div 
                  className="run-card-actions-container"
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '16px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid var(--gray-100)',
                    padding: '12px 8px 0 8px'
                  }}
                >
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
                      {getButtonText('🗑️ Drop out', '🗑️ Cancel', bookingLoading === run.id, 'Dropping...')}
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
                      {getButtonText('🏃‍♂️ Join in', '🏃‍♂️ Join', bookingLoading === run.id, 'Booking...')}
                    </button>
                  )}

                  {/* Share Button - LIRFs/Admins only */}
                  {canManageRuns && (
                    <div className="share-menu">
                      <button
                        className="share-button action-btn action-btn--secondary"
                        onClick={() => setShowShareMenu(showShareMenu === run.id ? null : run.id)}
                      >
                        <Share2 size={14} />
                        {getButtonText('Share Run', 'Share', false, '')}
                      </button>
                      
                      {showShareMenu === run.id && (
                        <div className="share-dropdown">
                          <button
                            onClick={() => handleRunShare(run, 'copy', shareCallbacks)}
                            className="share-option"
                          >
                            📋 Copy Link
                          </button>
                          <button
                            onClick={() => handleRunShare(run, 'whatsapp', shareCallbacks)}
                            className="share-option"
                          >
                            💬 WhatsApp
                          </button>
                          <button
                            onClick={() => handleRunShare(run, 'facebook-group', shareCallbacks)}
                            className="share-option"
                          >
                            📘 Facebook Group
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIRF Assignment Actions - LIRFs/Admins only */}
                  {canManageRuns && state.user && (
                    <div className="lirf-actions">
                      {run.user_is_assigned_lirf ? (
                        <button
                          onClick={() => handleUnassignSelfAsLIRF(run.id)}
                          disabled={assignmentLoading === run.id}
                          className="action-btn action-btn--danger"
                        >
                          {getButtonText('👨‍🏫 Unassign LIRF', '👨‍🏫 Unassign', assignmentLoading === run.id, 'Unassigning...')}
                        </button>
                      ) : run.lirf_vacancies > 0 ? (
                        <button
                          onClick={() => handleAssignSelfAsLIRF(run.id)}
                          disabled={assignmentLoading === run.id}
                          className="action-btn action-btn--secondary"
                        >
                          {getButtonText('👨‍🏫 Assign Me as LIRF', '👨‍🏫 Assign Me', assignmentLoading === run.id, 'Assigning...')}
                        </button>
                      ) : (
                        <div className="action-status action-status--assigned">
                          LIRFs fully assigned
                        </div>
                      )}
                    </div>
                  )}
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
        confirmText="Yes, Unassign Me"
        cancelText="Keep Assignment"
        type="danger"
      />

      {/* Share Success Modal */}
      <ConfirmationModal
        isOpen={shareModal.isOpen}
        title={shareModal.title}
        message={shareModal.message}
        onConfirm={closeShareModal}
        onCancel={closeShareModal}
        confirmText="OK"
        cancelText=""
      />
    </div>
  );
};

export default ViewScheduledRuns;