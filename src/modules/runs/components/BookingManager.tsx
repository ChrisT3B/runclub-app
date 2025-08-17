// src/modules/runs/components/BookingManager.tsx

import React, { useState, useCallback } from 'react';
import { UserPlus, UserMinus, UserX, Loader2 } from 'lucide-react';
import { BookingService, BookingError } from '../../admin/services/bookingService';
import { RunWithDetails } from '../../admin/services/scheduledRunsService';
import { BookingSuccessModal } from './BookingSuccessModal';

interface BookingManagerProps {
  // Core data
  run: RunWithDetails;
  userId?: string;
  
  // UI Integration callbacks
  onBookingChange: (run: RunWithDetails) => void;
  onError: (error: BookingError) => void;
  
  // Optional customization
  showSuccessModal?: boolean;
  autoRefreshData?: boolean;
  className?: string;
}

interface BookingManagerState {
  isLoading: boolean;
  lastAction: 'booking' | 'cancelling' | null;
  showSuccessModal: boolean;
  successData: {
    run: RunWithDetails;
    action: 'book' | 'cancel';
  } | null;
}

interface BookingButtonState {
  text: string;
  shortText: string;
  icon: React.ReactNode;
  disabled: boolean;
  className: string;
  variant: 'primary' | 'danger' | 'disabled' | 'loading';
}

export const BookingManager: React.FC<BookingManagerProps> = ({
  run,
  userId,
  onBookingChange,
  onError,
  showSuccessModal = true,
  autoRefreshData = true,
  className = ''
}) => {
  const [state, setState] = useState<BookingManagerState>({
    isLoading: false,
    lastAction: null,
    showSuccessModal: false,
    successData: null
  });

  // Detect mobile for responsive text
  const isMobile = window.innerWidth <= 768;

  // Handle optimistic UI updates
  const handleOptimisticUpdate = useCallback((updatedRun: RunWithDetails) => {
    onBookingChange(updatedRun);
  }, [onBookingChange]);

  // Rollback optimistic update on error
  const rollbackOptimisticUpdate = useCallback(() => {
    onBookingChange(run);
  }, [run, onBookingChange]);

  // Enhanced error handling with context-aware messages
  const handleBookingError = useCallback((error: BookingError, originalRun: RunWithDetails) => {
    // Rollback optimistic update
    rollbackOptimisticUpdate();

    // Create context-aware error messages
    const errorConfig: Record<string, { title: string; message: string }> = {
      'ALREADY_BOOKED': {
        title: 'Already Booked',
        message: 'You\'ve already booked this run. Check your bookings to see all your upcoming runs.'
      },
      'RUN_FULL': {
        title: 'Run is Full',
        message: 'This run has reached capacity while you were booking. Please try a different run.'
      },
      'LIRF_CONFLICT': {
        title: 'LIRF Assignment Conflict',
        message: 'You\'re assigned as LIRF for this run. Please cancel your LIRF assignment first.'
      },
      'AUTH_ERROR': {
        title: 'Login Required',
        message: 'Please log in to book runs.'
      }
    };

    const config = errorConfig[error.type] || {
      title: 'Booking Error',
      message: error.message || 'An unexpected error occurred. Please try again.'
    };

    onError(new BookingError(config.message, error.type, config.title));
  }, [rollbackOptimisticUpdate, onError]);

  // Core booking function with optimistic updates
  const handleBookRun = useCallback(async () => {
    if (!userId) {
      onError(new BookingError('Please log in to book runs.', 'AUTH_ERROR', 'Login Required'));
      return;
    }

    if (state.isLoading) return;

    // Set loading state
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      lastAction: 'booking' 
    }));

    // Optimistic UI update
    const optimisticRun: RunWithDetails = {
      ...run,
      is_booked: true,
      booking_count: run.booking_count + 1,
      is_full: (run.booking_count + 1) >= run.max_participants,
      user_booking_id: 'optimistic-' + Date.now() // Temporary ID
    };

    handleOptimisticUpdate(optimisticRun);

    try {
      // Perform actual booking
      const booking = await BookingService.createBooking({
        run_id: run.id,
        member_id: userId
      });

      // Update with real booking data
      const finalRun: RunWithDetails = {
        ...optimisticRun,
        user_booking_id: booking.id
      };

      handleOptimisticUpdate(finalRun);

      // Show success modal with calendar integration
      if (showSuccessModal) {
        setState(prev => ({
          ...prev,
          showSuccessModal: true,
          successData: {
            run: finalRun,
            action: 'book'
          }
        }));
      }

    } catch (err) {
      console.error('Booking error:', err);
      const bookingError = err instanceof BookingError ? err : new BookingError(
        'Failed to book run. Please try again.',
        'GENERAL'
      );
      handleBookingError(bookingError, run);
    } finally {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastAction: null 
      }));
    }
  }, [userId, run, state.isLoading, handleOptimisticUpdate, handleBookingError, showSuccessModal, onError]);

  // Core cancel booking function
  const handleCancelBooking = useCallback(async () => {
    if (!userId || !run.user_booking_id) return;
    if (state.isLoading) return;

    // Set loading state
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      lastAction: 'cancelling' 
    }));

    // Optimistic UI update
    const optimisticRun: RunWithDetails = {
      ...run,
      is_booked: false,
      booking_count: Math.max(0, run.booking_count - 1),
      is_full: false,
      user_booking_id: undefined
    };

    handleOptimisticUpdate(optimisticRun);

    try {
      // Perform actual cancellation
      await BookingService.cancelBooking(run.user_booking_id, 'Cancelled by member');

      // Show brief success feedback for cancellation
      if (showSuccessModal) {
        setState(prev => ({
          ...prev,
          showSuccessModal: true,
          successData: {
            run: optimisticRun,
            action: 'cancel'
          }
        }));
      }

    } catch (err) {
      console.error('Cancellation error:', err);
      const bookingError = err instanceof BookingError ? err : new BookingError(
        'Failed to cancel booking. Please try again.',
        'GENERAL'
      );
      handleBookingError(bookingError, run);
    } finally {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        lastAction: null 
      }));
    }
  }, [userId, run, state.isLoading, handleOptimisticUpdate, handleBookingError, showSuccessModal]);

  // Get current button state based on run and loading status
  const getButtonState = useCallback((): BookingButtonState => {
    // Loading states
    if (state.isLoading && state.lastAction === 'booking') {
      return {
        text: 'Booking...',
        shortText: 'Booking...',
        icon: <Loader2 size={16} className="animate-spin" />,
        disabled: true,
        className: 'action-btn--loading',
        variant: 'loading'
      };
    }

    if (state.isLoading && state.lastAction === 'cancelling') {
      return {
        text: 'Cancelling...',
        shortText: 'Cancelling...',
        icon: <Loader2 size={16} className="animate-spin" />,
        disabled: true,
        className: 'action-btn--loading',
        variant: 'loading'
      };
    }

    // Already booked state
    if (run.is_booked) {
      return {
        text: 'Drop Out of Run',
        shortText: 'Drop Out',
        icon: <UserMinus size={16} />,
        disabled: false,
        className: 'action-btn--danger',
        variant: 'danger'
      };
    }

    // Run is full state
    if (run.is_full) {
      return {
        text: 'Run is Full',
        shortText: 'Full',
        icon: <UserX size={16} />,
        disabled: true,
        className: 'action-btn--disabled',
        variant: 'disabled'
      };
    }

    // Available to book state
    return {
      text: 'Join This Run',
      shortText: 'Join Run',
      icon: <UserPlus size={16} />,
      disabled: false,
      className: 'action-btn--primary',
      variant: 'primary'
    };
  }, [run.is_booked, run.is_full, state.isLoading, state.lastAction]);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    if (run.is_booked) {
      handleCancelBooking();
    } else {
      handleBookRun();
    }
  }, [run.is_booked, handleBookRun, handleCancelBooking]);

  // Close success modal
  const handleCloseSuccessModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showSuccessModal: false, 
      successData: null 
    }));
  }, []);

  const buttonState = getButtonState();

  return (
    <div className={`booking-manager ${className}`}>
      {/* Main Booking Button - using existing RunCard CSS classes */}
      <button
        onClick={handleButtonClick}
        disabled={buttonState.disabled}
        className={`action-btn ${buttonState.className}`}
        type="button"
        aria-label={buttonState.text}
      >
        <span className="booking-action-btn__icon">
          {buttonState.icon}
        </span>
        <span className="booking-action-btn__text">
          {isMobile ? buttonState.shortText : buttonState.text}
        </span>
      </button>

      {/* Success Modal with Calendar Integration */}
      {showSuccessModal && state.successData && (
        <BookingSuccessModal
          isOpen={state.showSuccessModal}
          onClose={handleCloseSuccessModal}
          run={state.successData.run}
          bookingType={state.successData.action}
        />
      )}
    </div>
  );
};

// Export button component for standalone use
export const BookingActionButton: React.FC<{
  buttonState: BookingButtonState;
  onClick: () => void;
  isMobile?: boolean;
}> = ({ buttonState, onClick, isMobile = false }) => (
  <button
    onClick={onClick}
    disabled={buttonState.disabled}
    className={`booking-action-btn ${buttonState.className}`}
    type="button"
    aria-label={buttonState.text}
  >
    <span className="booking-action-btn__icon">
      {buttonState.icon}
    </span>
    <span className="booking-action-btn__text">
      {isMobile ? buttonState.shortText : buttonState.text}
    </span>
  </button>
);