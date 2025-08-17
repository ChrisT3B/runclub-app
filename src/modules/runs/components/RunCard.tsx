// Updated RunCard Component with BookingManager Integration
// File: src/modules/runs/components/RunCard.tsx

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { formatDate, formatTime, isRunUrgent, handleRunShare, ShareCallbacks } from '../utils/runUtils';
import { renderTextWithLinks } from '../../../utils/linkHelper';
import { RunWithDetails } from '../../admin/services/scheduledRunsService';
import { BookingError } from '../../admin/services/bookingService';
import { BookingManager } from './BookingManager';

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
  // Helper function from parent for responsive text
  getButtonText: (fullText: string, shortText: string, loading: boolean, loadingText: string) => string;
  // ✅ NEW: BookingManager integration props
  userId?: string;
  onBookingChange?: (updatedRun: RunWithDetails) => void;
  onBookingError?: (error: BookingError) => void;
  useBookingManager?: boolean; // Flag to enable BookingManager
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
  // ✅ NEW: BookingManager props
  userId,
  onBookingChange,
  onBookingError,
  useBookingManager = false
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
    setShowShareMenu(!showShareMenu);
  };

  const handleShare = (platform: string) => {
    handleRunShare(run, platform, shareCallbacks);
    setShowShareMenu(false);
  };

  // ✅ NEW: Render enhanced or traditional booking buttons
  const renderBookingButton = () => {
    if (useBookingManager && onBookingChange && onBookingError && userId) {
      // ✅ Enhanced: Use BookingManager for enhanced booking experience
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
      // ✅ Traditional: Use existing booking buttons
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

  return (
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

        {/* ✅ UPDATED: Action Buttons Container */}
        <div className="run-card-actions-container">
          {/* ✅ ENHANCED: BookingManager or Traditional Booking Button */}
          {renderBookingButton()}

          {/* Share Button - NO changes needed */}
          <button
            onClick={handleShareClick}
            className="action-btn action-btn--secondary share-button"
            style={{ position: 'relative' }}
          >
            <Share2 size={16} />
            {getButtonText('Share Run', 'Share', false, '')}
            
            {/* Share dropdown */}
            {showShareMenu && (
              <div className="share-dropdown">
                <button 
                  onClick={() => handleShare('whatsapp')}
                  className="share-option"
                >
                  📱 WhatsApp
                </button>
                <button 
                  onClick={() => handleShare('facebook-group')}
                  className="share-option"
                    >
                  👥 Facebook Group
                </button>
                <button 
                  onClick={() => handleShare('email')}
                  className="share-option"
                >
                  📘 Facebook
                </button>
                <button 
                  onClick={() => handleShare('email')}
                  className="share-option"
                >
                  📧 Email
                </button>
                <button 
                  onClick={() => handleShare('copy')}
                  className="share-option"
                >
                  📋 Copy Link
                </button>
              </div>
            )}
          </button>

          {/* LIRF Button - NO changes needed */}
          {canManageRuns && (
            run.user_is_assigned_lirf ? (
              <button
                onClick={() => onUnassignSelfAsLIRF(run.id)}
                disabled={isAssignmentLoading}
                className="action-btn action-btn--danger"
              >
                {getButtonText('👨‍🏫 Unassign LIRF', '👨‍🏫 Unassign', isAssignmentLoading, 'Unassigning...')}
              </button>
            ) : run.lirf_vacancies > 0 ? (
              <button
                onClick={() => onAssignSelfAsLIRF(run.id)}
                disabled={isAssignmentLoading}
                className="action-btn action-btn--secondary"
              >
                {getButtonText('👨‍🏫 Assign Me as LIRF', '👨‍🏫 Assign Me', isAssignmentLoading, 'Assigning...')}
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
  );
};