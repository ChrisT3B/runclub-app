import React, { useState, useEffect } from 'react';
import { X, Calendar, Download, ExternalLink, Shield } from 'lucide-react';

interface LirfAssignmentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: any; // ScheduledRun type
}

const LirfAssignmentSuccessModal: React.FC<LirfAssignmentSuccessModalProps> = ({
  isOpen,
  onClose,
  run
}) => {
    if (!isOpen || !run) return null;
  const [calendarMethod, setCalendarMethod] = useState<string | null>(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
// Debug logging

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCalendarMethod(null);
      setShowCalendarOptions(false);
    }
  }, [isOpen]);

  // ✅ FIX: Early return AFTER useEffect to prevent hook issues
  if (!isOpen || !run) {

    return null;
  }

  // Format date and time for display
  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Generate calendar event data with "Leading:" prefix
  const generateCalendarEvent = () => {
    const eventTitle = `Leading: ${run.run_title}`;
    const eventDate = run.run_date;
    const eventTime = run.run_time;
    const location = run.meeting_point || 'TBC';
    
    // Create description with LIRF-specific content
    const description = [
      `You're leading this run for Run Alcester.`,
      `Please arrive 15 minutes early to greet participants and review the route.`,
      run.description ? `Run Details: ${run.description}` : '',
      `Distance: ${run.approximate_distance || 'TBC'}`
    ].filter(Boolean).join('\\n\\n');

    return {
      title: eventTitle,
      date: eventDate,
      time: eventTime,
      location: location,
      description: description
    };
  };

  // Generate ICS file content
  const generateICS = () => {
    const event = generateCalendarEvent();
    const startDateTime = new Date(`${event.date}T${event.time}`);
    const endDateTime = new Date(startDateTime.getTime() + (90 * 60 * 1000)); // Add 90 minutes

    // Format dates for ICS (YYYYMMDDTHHMMSS)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Run Alcester//Run Booking//EN',
      'BEGIN:VEVENT',
      `UID:lirf-${run.id}-${Date.now()}@runalcester.co.uk`,
      `DTSTART:${formatICSDate(startDateTime)}`,
      `DTEND:${formatICSDate(endDateTime)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\\n/g, '\\n')}`,
      `LOCATION:${event.location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  };

  // Download ICS file
  const downloadICS = () => {
    const icsContent = generateICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leading-${run.run_title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCalendarMethod('download');
  };

  // Open Google Calendar
  const openGoogleCalendar = () => {
    const event = generateCalendarEvent();
    const startDateTime = new Date(`${event.date}T${event.time}`);
    const endDateTime = new Date(startDateTime.getTime() + (90 * 60 * 1000));

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const googleUrl = new URL('https://calendar.google.com/calendar/render');
    googleUrl.searchParams.set('action', 'TEMPLATE');
    googleUrl.searchParams.set('text', event.title);
    googleUrl.searchParams.set('dates', `${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}`);
    googleUrl.searchParams.set('details', event.description.replace(/\\n/g, '\n'));
    googleUrl.searchParams.set('location', event.location);

    window.open(googleUrl.toString(), '_blank');
    setCalendarMethod('google');
  };

  // Detect native calendar apps
  const openNativeCalendar = () => {
    const icsContent = generateICS();
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);

    // Try to open with native calendar app
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setCalendarMethod('native');
  };

  const handleAddToCalendar = () => {
    setShowCalendarOptions(true);
  };

  const renderCalendarOptions = () => (
    <div className="calendar-buttons">
      <button
        onClick={openGoogleCalendar}
        className="calendar-btn calendar-btn--primary"
      >
        <ExternalLink size={20} />
        Google Calendar
      </button>

      <button
        onClick={openNativeCalendar}
        className="calendar-btn calendar-btn--secondary"
      >
        <Calendar size={20} />
        Open in Calendar App
      </button>

      <button
        onClick={downloadICS}
        className="calendar-btn calendar-btn--secondary"
      >
        <Download size={20} />
        Download Calendar File
      </button>
    </div>
  );

  const renderSuccessContent = () => (
    <div className="lirf-assignment-success-content">
      {/* LIRF Recognition Header */}
      <div className="success-header">
        <div className="success-icon">
          <Shield size={48} className="success-shield" />
        </div>
        <h2 className="success-title">LIRF Assignment Confirmed!</h2>
        <p className="success-subtitle">Thanks for choosing to Lead this run for the club</p>
      </div>

      {/* Run Details */}
      <div className="run-details-preview">
        <h3>Leading: {run.run_title}</h3>
        <div className="run-details-grid">
          <div className="detail-item">
            <strong>📅 Date:</strong> {formatDate(run.run_date)}
          </div>
          <div className="detail-item">
            <strong>⏰ Time:</strong> {formatTime(run.run_time)}
          </div>
          <div className="detail-item">
            <strong>📍 Meeting Point:</strong> {run.meeting_point}
          </div>
          {run.approximate_distance && (
            <div className="detail-item">
              <strong>📏 Distance:</strong> {run.approximate_distance}
            </div>
          )}
        </div>
      </div>

      {/* LIRF Responsibilities Reminder */}
      <div className="lirf-responsibilities">
        <h4>📋 LIRF Responsibilities</h4>
        <ul>
          <li>Plan your session or run in advance and perform a risk assessment</li>
          <li>Ensure all participants are accounted for during the run</li>
          <li>Carry First Aid Kit & Mobile phone</li>
        </ul>
      </div>

      {/* Calendar Integration */}
      <div className="calendar-integration">
        <h4>📅 Add to Your Calendar</h4>

        
        {!showCalendarOptions ? (
            <>
          <button
            onClick={handleAddToCalendar}
            className="calendar-btn calendar-btn--primary"
          >
            <Calendar size={20} />
            Add to Calendar
          </button>
     {/* Add "Got it, thanks!" button right after the calendar button */}
      <button
        onClick={onClose}
        className="calendar-btn calendar-btn--secondary"
        style={{ marginTop: '12px' }}
      >
        Got it, thanks!
      </button>
    </>    
    ) : (
          renderCalendarOptions()
        )}
        
        {calendarMethod && (
          <p className="calendar-success">
            ✅ Calendar event created with "Leading:" prefix
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lirf-assignment-success-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        {renderSuccessContent()}


      </div>
    </div>
  );
};

export default LirfAssignmentSuccessModal;
