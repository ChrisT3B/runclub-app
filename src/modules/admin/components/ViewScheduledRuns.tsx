// Step 2 Update: ViewScheduledRuns.tsx with extracted RunCard
// File: src/modules/admin/components/ViewScheduledRuns.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ScheduledRunsService, RunWithDetails } from '../services/scheduledRunsService';
import { BookingService, BookingError } from '../services/bookingService';
import { ErrorModal } from '../../../shared/components/ui/ErrorModal';
import { formatDate, formatTime, isRunUrgent, ShareCallbacks } from '../../runs/utils/runUtils';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { RunFilters, FilterType, FilterCounts } from '../../runs/utils/components/RunFilters';
import { RunCard } from '../../runs/utils/components/RunCard';

export const ViewScheduledRuns: React.FC = () => {
  const { state, permissions } = useAuth();
  const [runs, setRuns] = useState<RunWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  
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

    const counts: FilterCounts = {
      all: runs.length,
      available: runs.filter(r => !r.is_booked && !r.is_full).length,
      myBookings: runs.filter(r => r.is_booked).length,
      myAssignments: runs.filter(r => r.user_is_assigned_lirf).length
    };

    return { filteredRuns: filtered, urgentVacancies: urgent, filterCounts: counts };
  }, [runs, filter, canManageRuns]);

  // Booking Actions
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

  // LIRF Assignment Actions
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
    },
    onError: (message: string) => {
      setErrorModal({
        isOpen: true,
        title: 'Share Failed',
        message
      });
    },
    onFacebookGroupShare: (message: string) => {
      setShareModal({
        isOpen: true,
        title: 'Shared to Facebook Group',
        message
      });
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
      <RunFilters
        currentFilter={filter}
        onFilterChange={setFilter}
        filterCounts={filterCounts}
        canManageRuns={canManageRuns}
      />

      {/* Run Cards - Now much simpler! */}
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
          {filteredRuns.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              canManageRuns={canManageRuns}
              isBookingLoading={bookingLoading === run.id}
              isAssignmentLoading={assignmentLoading === run.id}
              onBookRun={handleBookRun}
              onCancelBooking={handleCancelBooking}
              onAssignSelfAsLIRF={handleAssignSelfAsLIRF}
              onUnassignSelfAsLIRF={handleUnassignSelfAsLIRF}
              shareCallbacks={shareCallbacks}
              getButtonText={getButtonText}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeErrorModal}
      />

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