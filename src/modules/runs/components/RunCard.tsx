// Clean RunCard Component with Share Modal - Final Version
// File: src/modules/runs/components/RunCard.tsx

import React, { useState, useEffect } from 'react';
import { 
  Share2,
  Facebook,
  MessageCircle,
  Copy,
  Users,
  X,
  ShieldPlus,
  ShieldX,
  ShieldCheck
} from 'lucide-react';
import { formatDate, formatTime, isRunUrgent, handleRunShare, ShareCallbacks } from '../utils/runUtils';
import { renderTextWithLinks } from '../../../utils/linkHelper';
import { RunWithDetails } from '../../admin/services/scheduledRunsService';
import { BookingError } from '../../admin/services/bookingService';
import { BookingManager } from './BookingManager';
import { createPortal } from 'react-dom';
import LirfAssignmentManager from './LirfAssignmentManager';  

interface RunCardProps {
  run: RunWithDetails;
  canManageRuns: boolean;
  isBookingLoading: boolean;
  isAssignmentLoading: boolean;
  onBookRun: (runId: string) => void;
  onCancelBooking: (runId: string, bookingId: string, runTitle: string) => void;
  onAssignSelfAsLIRF: (runId: string) => void;
  onUnassignSelfAsLIRF: (runId: string) => void;
  shareCallbacks: ShareCallbacks;
  getButtonText: (fullText: string, shortText: string, loading: boolean, loadingText: string) => string;
  userId?: string;
  user?: any; // ADD this line
  onBookingChange?: (updatedRun: RunWithDetails) => void;
  onBookingError?: (error: BookingError) => void;
  onAssignmentSuccess?: () => void; // ADD this line
  onAssignmentError?: (title: string, message: string) => void; // ADD this line
  onUnassignmentConfirm?: (runId: string, runTitle: string) => void; // ADD this line
  useBookingManager?: boolean;
  useLirfAssignmentManager?: boolean; // ADD this line
    showLirfSuccessModal?: boolean;
  onCloseLirfSuccessModal?: () => void;
  onShowLirfSuccessModal?: (run: any) => void;
}

export const RunCard: React.FC<RunCardProps> = ({
  run,
  canManageRuns,
  isBookingLoading,
  isAssignmentLoading,
  onBookRun,
  onCancelBooking,
  onAssignSelfAsLIRF,
  onUnassignSelfAsLIRF,
  shareCallbacks,
  getButtonText,
  userId,
  user, // ADD this line
  onBookingChange,
  onBookingError,
    onAssignmentSuccess, // ADD this line
  onAssignmentError, // ADD this line
  onUnassignmentConfirm, // ADD this line
  useBookingManager = false,
  useLirfAssignmentManager = false, // ADD this line
    showLirfSuccessModal = false,
  onCloseLirfSuccessModal,
  onShowLirfSuccessModal,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Calculate properties
  const isUrgent = canManageRuns && isRunUrgent(run.run_date, run.lirf_vacancies);
  const shouldTruncateDescription = run.description && run.description.length > 100;

  // Helper functions
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleShare = (platform: string) => {
    handleRunShare(run, platform, shareCallbacks);
    setShowShareModal(false);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
  };

  // Simple modal event handling - just Escape key
  useEffect(() => {
    if (!showShareModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowShareModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showShareModal]);

  // Render booking button
  const renderBookingButton = () => {
    if (useBookingManager && onBookingChange && onBookingError && userId) {
      return (
        <BookingManager
          run={run}
          userId={userId}
          onBookingChange={onBookingChange}
          onError={onBookingError}
          showSuccessModal={true}
          className="run-card__booking-manager"
        />
      );
    } else {
      if (run.is_booked) {
        return (
          <button
            onClick={() => onCancelBooking(run.id, run.user_booking_id!, run.run_title)}
            disabled={isBookingLoading}
            className="action-btn action-btn--danger"
          >
            {getButtonText('❌ Cancel Booking', '❌ Cancel', isBookingLoading, 'Cancelling...')}
          </button>
        );
      } else if (run.is_full) {
        return (
          <div className="action-status action-status--full">
            Run Full
          </div>
        );
      } else {
        return (
          <button
            onClick={() => onBookRun(run.id)}
            disabled={isBookingLoading}
            className="action-btn action-btn--primary"
          >
            {getButtonText('🏃‍♂️ Book Run', '🏃‍♂️ Book', isBookingLoading, 'Booking...')}
          </button>
        );
      }
    }
  };
// Render LIRF button (Following BookingManager pattern exactly)
const renderLirfButton = () => {
  if (!canManageRuns) {
    return null;
  }
  if (useLirfAssignmentManager && onAssignmentSuccess && onAssignmentError && onUnassignmentConfirm && user) {
    return (
      <LirfAssignmentManager
        run={run}
        user={user}
        onAssignmentSuccess={onAssignmentSuccess}
        onAssignmentError={onAssignmentError}
        onUnassignmentConfirm={onUnassignmentConfirm}
                showSuccessModal={showLirfSuccessModal}
        onCloseSuccessModal={onCloseLirfSuccessModal}
        onShowSuccessModal={onShowLirfSuccessModal}
      />
    );
  } else {
    // Fallback to traditional prop-based approach (like BookingManager does)
    if (!canManageRuns) {
      return null;
    }
    
    if (run.user_is_assigned_lirf) {
      return (
        <button
          onClick={() => onUnassignSelfAsLIRF(run.id)}
          disabled={isAssignmentLoading}
          className="action-btn action-btn--danger"
        >
          <ShieldX size={16} />
          {getButtonText(' Unassign LIRF', ' Unassign', isAssignmentLoading, 'Unassigning...')}
        </button>
      );
    } else if (run.lirf_vacancies > 0) {
      return (
        <button
          onClick={() => onAssignSelfAsLIRF(run.id)}
          disabled={isAssignmentLoading}
          className="action-btn action-btn--secondary"
        >
          <ShieldPlus size={16} />
          {getButtonText(' Assign Me as LIRF', ' Assign Me', isAssignmentLoading, 'Assigning...')}
        </button>
      );
    } else {
      return (
        <div className="action-status action-status--assigned">
          LIRFs fully assigned
        </div>
      );
    }
  }
};
  return (
    <>
      <div
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
                  <ShieldCheck size={16} />
                   {' '}{run.assigned_lirfs.length}/{run.lirfs_required} LIRF{run.lirfs_required > 1 ? 's' : ''}
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
                  const textToRender = shouldTruncateDescription && !isDescriptionExpanded 
                    ? truncateText(run.description)
                    : run.description;
                  return renderTextWithLinks(textToRender);
                })()}
              </div>
              {shouldTruncateDescription && (
                <button
                  onClick={toggleDescription}
                  className="run-description__toggle"
                >
                  {isDescriptionExpanded ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
          )}
          
          {/* LIRF Assignment Info */}
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

          {/* Action Buttons Container */}
          <div className="run-card-actions-container">
            {/* Booking Button */}
            {renderBookingButton()}

            {/* Share Button - Simple click to open modal */}
            <button
              onClick={handleShareClick}
              className="action-btn action-btn--secondary share-button"
            >
              <Share2 size={16} />
              {getButtonText('Share Run', 'Share', false, '')}
            </button>

            {/* LIRF Button */}

            {renderLirfButton()}
          </div>
        </div>
      </div>

      {/* Simple Share Modal */}
      {showShareModal && createPortal(
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3 className="modal-title">Share This Run</h3>
              <button 
                onClick={closeShareModal}
                className="modal-close-btn"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Run Info Preview */}
            <div className="share-modal-preview">
              <h4>{run.run_title}</h4>
              <p>📅 {formatDate(run.run_date)} at {formatTime(run.run_time)}</p>
              <p>📍 {run.meeting_point}</p>
            </div>

            {/* Share Options */}
            <div className="share-options">
              <button 
                onClick={() => handleShare('whatsapp')}
                className="share-option-btn"
              >
                <MessageCircle size={20} />
                <span>WhatsApp</span>
              </button>

              <button 
                onClick={() => handleShare('facebook-group')}
                className="share-option-btn"
              >
                <Users size={20} />
                <span>Facebook Group</span>
              </button>

              <button 
                onClick={() => handleShare('facebook')}
                className="share-option-btn"
              >
                <Facebook size={20} />
                <span>Facebook</span>
              </button>


              <button 
                onClick={() => handleShare('copy')}
                className="share-option-btn"
              >
                <Copy size={20} />
                <span>Copy Link</span>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="modal-actions">
              <button 
                onClick={closeShareModal}
                className="btn btn--secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};