// Fixed RunCard Component with Scroll Handling
// File: src/modules/runs/components/RunCard.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Share2 , //share icon
  Facebook,     // Facebook icon <Facebook />
  MessageCircle, // WhatsApp-style icon (or use Phone)
  Mail,         // Email icon
  Copy,         // Copy icon
  Users         // Group icon (for Facebook Group)
  } from 'lucide-react';
import { formatDate, formatTime, isRunUrgent, handleRunShare, ShareCallbacks } from '../utils/runUtils';
import { renderTextWithLinks } from '../../../utils/linkHelper';
import { RunWithDetails } from '../../admin/services/scheduledRunsService';
import { BookingError } from '../../admin/services/bookingService';
import { BookingManager } from './BookingManager';
import { createPortal } from 'react-dom';

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
  onBookingChange?: (updatedRun: RunWithDetails) => void;
  onBookingError?: (error: BookingError) => void;
  useBookingManager?: boolean;
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
  onBookingChange,
  onBookingError,
  useBookingManager = false
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    show: boolean;
  }>({
    top: 0,
    left: 0,
    show: false
  });

  const shareButtonRef = useRef<HTMLButtonElement>(null);

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
    if (!shareButtonRef.current) return;
    
    const buttonRect = shareButtonRef.current.getBoundingClientRect();
    const dropdownWidth = 180;
    
    let top = buttonRect.bottom + window.scrollY + 4;
    let left = buttonRect.right + window.scrollX - dropdownWidth;
    
    if (left < 10) {
      left = buttonRect.left + window.scrollX;
    }
    
    setDropdownPosition({
      top,
      left,
      show: !dropdownPosition.show
    });
  };

  const handleShare = (platform: string) => {
    handleRunShare(run, platform, shareCallbacks);
    setDropdownPosition(prev => ({ ...prev, show: false }));
  };

  // Enhanced useEffect with scroll handling
  useEffect(() => {
    if (!dropdownPosition.show) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideButton = shareButtonRef.current?.contains(target);
      const isInsideDropdown = document.querySelector('.share-dropdown')?.contains(target);
      
      // Only close if click is truly outside both button AND dropdown
      if (!isInsideButton && !isInsideDropdown) {
        setDropdownPosition(prev => ({ ...prev, show: false }));
      }
    };

    const handleScroll = () => {
      // Close dropdown on any scroll event
      setDropdownPosition(prev => ({ ...prev, show: false }));
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Close dropdown on touch scroll (mobile)
      const target = event.target as Element;
      const isInsideDropdown = document.querySelector('.share-dropdown')?.contains(target);
      
      // Only close if touch is outside the dropdown
      if (!isInsideDropdown) {
        setDropdownPosition(prev => ({ ...prev, show: false }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Close dropdown on Escape key
      if (event.key === 'Escape') {
        setDropdownPosition(prev => ({ ...prev, show: false }));
      }
    };

    const handleResize = () => {
      // Close dropdown on window resize (orientation change, etc.)
      setDropdownPosition(prev => ({ ...prev, show: false }));
    };

    // Add all event listeners
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchstart', handleTouchMove, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchstart', handleTouchMove);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [dropdownPosition.show]);

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

          {/* ✅ Action Buttons Container */}
          <div className="run-card-actions-container">
            {/* Booking Button */}
            {renderBookingButton()}

            {/* Share Button */}
            <button
              ref={shareButtonRef}
              onClick={handleShareClick}
              className="action-btn action-btn--secondary share-button"
            >
              <Share2 size={16} />
              {getButtonText('Share Run', 'Share', false, '')}
            </button>

            {/* LIRF Button */}
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

      {/* ✅ Share dropdown portal - OUTSIDE the main component */}
      {dropdownPosition.show && createPortal(
        <div 
          className="share-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999
          }}
        >
          <button 
            onClick={() => handleShare('whatsapp')}
            className="share-option"
          >
            <MessageCircle size={16} />
            {' '}WhatsApp
          </button>
          <button 
            onClick={() => handleShare('facebook-group')}
            className="share-option"
          >
            <Users size={16} />
            {' '} Facebook Group
          </button>
          <button 
            onClick={() => handleShare('facebook')}
            className="share-option"
          >
            <Facebook size={16} />
            {' '} Facebook
          </button>
          <button 
            onClick={() => handleShare('email')}
            className="share-option"
          >
            <Mail size={16} />
            {' '} Email
          </button>
          <button 
            onClick={() => handleShare('copy')}
            className="share-option"
          >
            <Copy size={16} />
            {' '} Copy Link 
          </button>
        </div>,
        document.body
      )}
    </>
  );
};