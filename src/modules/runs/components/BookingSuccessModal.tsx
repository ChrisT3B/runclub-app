// src/modules/runs/components/booking/BookingSuccessModal.tsx

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Download, Smartphone } from 'lucide-react';
import { formatDate, formatTime } from '../utils/runUtils';
import { RunWithDetails } from '../../admin/services/scheduledRunsService';

interface BookingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: RunWithDetails;
  bookingType: 'book' | 'cancel';
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  isOpen,
  onClose,
  run,
  bookingType
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  // Show animation and detect device capabilities
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      detectDeviceCapabilities();
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const detectDeviceCapabilities = () => {
    // Detect if device is mobile
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);


  };

  const generateICSFile = () => {
    const startDateTime = new Date(`${run.run_date}T${run.run_time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // 90 minutes duration
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Run Alcester//RunClub App//EN',
      'BEGIN:VEVENT',
      `UID:run-${run.id}-${Date.now()}@runalcester.co.uk`,
      `DTSTART:${formatICSDate(startDateTime)}`,
      `DTEND:${formatICSDate(endDateTime)}`,
      `SUMMARY:${run.run_title}`,
      `DESCRIPTION:${run.description ? run.description.replace(/\n/g, '\\n') : 'Run Alcester group run'}`,
      `LOCATION:${run.meeting_point}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Run starts in 30 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  };

  const downloadICSFile = () => {
    const icsContent = generateICSFile();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `run-${run.run_title.toLowerCase().replace(/\s+/g, '-')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openNativeCalendar = () => {
    const startDateTime = new Date(`${run.run_date}T${run.run_time}`);
    const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);
    
    if (isMobile) {
      // For mobile devices, try to open native calendar
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(run.run_title)}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(run.description || 'Run Alcester group run')}&location=${encodeURIComponent(run.meeting_point)}`;
      
      window.open(googleCalendarUrl, '_blank');
    } else {
      // For desktop, download ICS file
      downloadICSFile();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`booking-success-modal ${isVisible ? 'booking-success-modal--visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="booking-success-modal__content">
        {/* Success Animation */}
        <div className="booking-success-modal__animation">
          {bookingType === 'book' ? (
            <div className="success-checkmark">
              <div className="checkmark-circle">
                <div className="checkmark-stem"></div>
                <div className="checkmark-kick"></div>
              </div>
            </div>
          ) : (
            <div className="cancel-animation">
              <div className="cancel-circle">
                <div className="cancel-x"></div>
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        <div className="booking-success-modal__header">
          <h2>
            {bookingType === 'book' ? '🎉 You\'re all set!' : '✅ Booking cancelled'}
          </h2>
          <p>
            {bookingType === 'book' 
              ? `You've successfully booked "${run.run_title}"` 
              : `You've cancelled your booking for "${run.run_title}"`
            }
          </p>
        </div>

        {/* Run Details */}
        {bookingType === 'book' && (
          <>
            <div className="booking-success-modal__details">
              <div className="run-detail">
                <Calendar size={18} />
                <span>{formatDate(run.run_date)}</span>
              </div>
              <div className="run-detail">
                <Clock size={18} />
                <span>{formatTime(run.run_time)}</span>
              </div>
              <div className="run-detail">
                <MapPin size={18} />
                <span>{run.meeting_point}</span>
              </div>
              {run.approximate_distance && (
                <div className="run-detail">
                  <Users size={18} />
                  <span>{run.approximate_distance}</span>
                </div>
              )}
            </div>

            {/* Calendar Integration */}
            <div className="booking-success-modal__calendar">
              <h3>Add to Calendar</h3>
              <p>Don't forget about your run! Add it to your calendar:</p>
              
              <div className="calendar-buttons">
                {isMobile ? (
                    <>
                    <button 
                        className="calendar-btn calendar-btn--primary"
                        onClick={openNativeCalendar}
                    >
                        <Smartphone size={20} />
                        Open in Calendar App
                    </button>
                    
                    <button 
                        className="calendar-btn calendar-btn--secondary"
                        onClick={downloadICSFile}
                    >
                        <Download size={20} />
                        Download Calendar File
                    </button>
                    </>
                ) : (
                    <button 
                    className="calendar-btn calendar-btn--primary"
                    onClick={downloadICSFile}
                    >
                    <Download size={20} />
                    Download Calendar File
                    </button>
                )}
                
                <button 
                    className="calendar-btn calendar-btn--secondary"
                    onClick={() => {
                    const startDateTime = new Date(`${run.run_date}T${run.run_time}`);
                    const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);
                    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(run.run_title)}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(run.description || 'Run Alcester group run')}&location=${encodeURIComponent(run.meeting_point)}`;
                    window.open(googleCalendarUrl, '_blank');
                    }}
                >
                    <Calendar size={20} />
                    Google Calendar
                </button>
                </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="booking-success-modal__actions">
          <button 
            className="btn btn--primary"
            onClick={handleClose}
          >
            {bookingType === 'book' ? 'Great, thanks!' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};