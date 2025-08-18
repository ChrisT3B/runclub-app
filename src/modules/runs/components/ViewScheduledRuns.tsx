// src/modules/runs/components/ViewScheduledRuns.tsx
// INTEGRATED VERSION - Using existing RunCard and RunFilters with BookingManager enhancement

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ScheduledRunsService, RunWithDetails } from '../../admin/services/scheduledRunsService';
import { BookingService, BookingError } from '../../admin/services/bookingService';
import { ErrorModal } from '../../../shared/components/ui/ErrorModal';
import { ShareCallbacks } from '../utils/runUtils';
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal';
import { RunCard } from './RunCard';
import { RunFilters, FilterType, FilterCounts } from './RunFilters';


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
     facebookUrl?: string; // Add this
  }>({
    isOpen: false,
    title: '',
    message: '',
    facebookUrl: undefined // Add this
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
  // Open Facebook if there's a URL stored
  if (shareModal.facebookUrl) {
    window.open(shareModal.facebookUrl, '_blank');
  }
  
  setShareModal({ 
    isOpen: false, 
    title: '', 
    message: '', 
    facebookUrl: undefined 
  });
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
  const { filteredRuns, filterCounts }: { 
    filteredRuns: RunWithDetails[], 
    filterCounts: FilterCounts 
  } = useMemo(() => {
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

    const counts: FilterCounts = {
      all: runs.length,
      available: runs.filter(r => !r.is_booked && !r.is_full).length,
      myBookings: runs.filter(r => r.is_booked).length,
      myAssignments: runs.filter(r => r.user_is_assigned_lirf).length
    };

    return { filteredRuns: filtered, filterCounts: counts };
  }, [runs, filter, canManageRuns]);

  // ✅ BookingManager integration callbacks 
  const handleBookingChange = useCallback((updatedRun: RunWithDetails) => {
    setRuns(prev => prev.map(r => r.id === updatedRun.id ? updatedRun : r));
  }, []);

  const handleBookingError = useCallback((error: BookingError) => {
    setErrorModal({
      isOpen: true,
      title: error.title || 'Booking Error',
      message: error.message
    });
  }, []);

  // Traditional booking functions for RunCard compatibility
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

    } catch (err: any) {
      setErrorModal({
        isOpen: true,
        title: 'LIRF Assignment Failed',
        message: err.message || 'Failed to assign LIRF role'
      });
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
        title: 'Success',
        message,
        facebookUrl: undefined // No URL for regular success
      });
    },
    onError: (message: string) => {
      setErrorModal({
        isOpen: true,
        title: 'Share Error',
        message
      });
    },
      onFacebookShare: (message: string, fbUrl: string) => {
        setShareModal({
         isOpen: true,
         title: 'Facebook Share',
         message,
         facebookUrl: fbUrl
        });
      },
    onFacebookGroupShare: (message: string, facebookUrl?: string) => {
      setShareModal({
        isOpen: true,
        title: 'Facebook Group Share',
        message,
        facebookUrl: facebookUrl // Store the URL for later
      });
    }
  };

  if (loading) {
    return (
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
        Loading scheduled runs...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
        <h2 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>
          Unable to Load Runs
        </h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
          {error}
        </p>
        <button 
          onClick={loadScheduledRuns}
          style={{
            background: 'var(--red-primary)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="view-scheduled-runs">
      {/* ✅ EXISTING: Use working RunFilters component */}
      <RunFilters
        currentFilter={filter}
        onFilterChange={setFilter}
        filterCounts={filterCounts}
        canManageRuns={canManageRuns}
      />

      {/* Run Cards */}
      {filteredRuns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
          <h2 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>
            No Runs Found
          </h2>
          <p style={{ color: 'var(--gray-600)' }}>
            {filter === 'available' ? 'No runs available for booking right now.' :
             filter === 'my-bookings' ? 'You haven\'t booked any runs yet.' :
             filter === 'my-assignments' ? 'You don\'t have any LIRF assignments.' :
             'No scheduled runs found.'}
          </p>
        </div>
      ) : (
        <div className="runs-grid">
          {filteredRuns.map(run => (
            // ✅ ENHANCED: RunCard with BookingManager integration
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
              // ✅ NEW: BookingManager enhancement props
              userId={state.user?.id}
              onBookingChange={handleBookingChange}
              onBookingError={handleBookingError}
              useBookingManager={true}
            />
          ))}
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        title={confirmModal.title}
        message={confirmModal.message}
          confirmText={
    shareModal.title === 'Facebook Group Share' ? 'Open Facebook Group' :
    shareModal.title === 'Facebook Share' ? 'Open Facebook' :
    'OK'
  }
  cancelText="" // Empty string to hide the cancel button
/>
    

      {/* Share Success Modal */}
      <ErrorModal
        isOpen={shareModal.isOpen}
        onClose={closeShareModal}
        title={shareModal.title}
        message={shareModal.message}
      />
    </div>
  );
};

export default ViewScheduledRuns;