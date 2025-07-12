import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { ScheduledRunsService, ScheduledRun } from '../services/scheduledRunsService';
import { BookingService } from '../services/bookingService';
import { Share2 } from 'lucide-react';

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

export const ViewScheduledRuns: React.FC = () => {
  const { state } = useAuth();
  const [runs, setRuns] = useState<RunWithAllInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'my-bookings' | 'my-assignments'>('all');
  const [urgentVacancies, setUrgentVacancies] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);

  const isLIRFOrAdmin = state.user?.accessLevel === 'lirf' || state.user?.accessLevel === 'admin';

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareMenu && event.target) {
        // Check if the clicked element is inside a share dropdown
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
        const next7Days = new Date();
        next7Days.setDate(next7Days.getDate() + 7);
        
        const urgentCount = runsWithAllInfo
          .filter(run => {
            const runDate = new Date(run.run_date);
            return runDate <= next7Days && run.lirf_vacancies > 0;
          })
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
      setError('Please log in to book a run');
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
    } catch (err: any) {
      setError(err.message || 'Failed to book run');
    } finally {
      setBookingLoading(null);
    }
  };

  const handleCancelBooking = async (runId: string, bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

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

  const handleShareRun = (run: RunWithAllInfo, platform: string) => {
    const runUrl = window.location.origin + '/runs/' + run.id;
    const runText = `🏃‍♂️ ${run.run_title}\n\n📅 ${formatDate(run.run_date)} at ${formatTime(run.run_time)}\n📍 ${run.meeting_point}\n${run.approximate_distance ? `🏃‍♂️ ${run.approximate_distance}\n` : ''}${run.description ? `\n${run.description}\n` : ''}\n👥 ${run.max_participants - run.booking_count} spaces available!\n\nBook your place now! 👇`;
    
    
    // Fallback copy function
    const copyFallback = (text: string) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Make it invisible but still functional
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        
        // For iOS Safari
        if (navigator.userAgent.match(/ipad|iphone/i)) {
          textArea.contentEditable = 'true';
          textArea.readOnly = false;
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          textArea.setSelectionRange(0, 999999);
        } else {
          textArea.select();
        }
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('✅ Run details copied to clipboard!');
        } else {
          alert('❌ Copy failed. Please try manually selecting and copying the text.');
        }
      } catch (err) {
        alert('❌ Copy not supported. Please manually copy the text.');
      }
    };
    
    switch (platform) {
      case 'facebook-group':
        // Facebook doesn't allow direct posting via URL anymore, so we'll open the group and copy text
        const fbGroupUrl = `https://www.facebook.com/groups/runalcester`;
        
        // Copy the text to clipboard first
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(runText).then(() => {
            // Then open the Facebook group
            window.open(fbGroupUrl, '_blank');
            alert('📋 Run details copied to clipboard!\n\nFacebook group is opening - paste the details into a new post.');
          }).catch(() => {
            copyFallback(runText);
            window.open(fbGroupUrl, '_blank');
            alert('📋 Run details copied to clipboard!\n\nFacebook group is opening - paste the details into a new post.');
          });
        } else {
          copyFallback(runText);
          window.open(fbGroupUrl, '_blank');
          alert('📋 Run details copied to clipboard!\n\nFacebook group is opening - paste the details into a new post.');
        }
        break;
        
      case 'facebook':
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(runUrl)}&quote=${encodeURIComponent(runText)}`;
        window.open(fbUrl, '_blank');
        break;
        
      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(runText)}&url=${encodeURIComponent(runUrl)}`;
        window.open(twitterUrl, '_blank');
        break;
        
      case 'whatsapp':
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(runText + '\n\n' + runUrl)}`;
        window.open(whatsappUrl, '_blank');
        break;
        
      case 'copy':
        // More reliable copy method
        const textToCopy = runText + '\n\n' + runUrl;
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            alert('✅ Run details copied to clipboard!');
          }).catch(() => {
            // Fall back to older method
            copyFallback(textToCopy);
          });
        } else {
          // Use fallback method directly
          copyFallback(textToCopy);
        }
        break;
        
      default:
        console.log('Unknown sharing platform:', platform);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilRun = (dateString: string) => {
    const runDate = new Date(dateString);
    const today = new Date();
    const diffTime = runDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="view-scheduled-runs">
        <div className="loading">Loading scheduled runs...</div>
      </div>
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
        <div style={{
          background: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '24px' }}>⚠️</div>
          <div>
            <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
              Urgent: {urgentVacancies} LIRF position{urgentVacancies > 1 ? 's' : ''} needed
            </div>
            <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
              Runs in the next 7 days require LIRF assignment
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        borderBottom: '1px solid var(--gray-200)',
        paddingBottom: '16px'
      }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            border: filter === 'all' ? '2px solid var(--red-primary)' : '1px solid var(--gray-300)',
            background: filter === 'all' ? 'var(--red-light)' : 'white',
            color: filter === 'all' ? 'var(--red-primary)' : 'var(--gray-700)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: filter === 'all' ? '600' : '400'
          }}
        >
          All Runs ({runs.length})
        </button>
        
        <button
          onClick={() => setFilter('available')}
          style={{
            padding: '8px 16px',
            border: filter === 'available' ? '2px solid var(--red-primary)' : '1px solid var(--gray-300)',
            background: filter === 'available' ? 'var(--red-light)' : 'white',
            color: filter === 'available' ? 'var(--red-primary)' : 'var(--gray-700)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: filter === 'available' ? '600' : '400'
          }}
        >
          Available ({runs.filter(r => !r.is_booked && !r.is_full).length})
        </button>

        {state.user && (
          <button
            onClick={() => setFilter('my-bookings')}
            style={{
              padding: '8px 16px',
              border: filter === 'my-bookings' ? '2px solid var(--red-primary)' : '1px solid var(--gray-300)',
              background: filter === 'my-bookings' ? 'var(--red-light)' : 'white',
              color: filter === 'my-bookings' ? 'var(--red-primary)' : 'var(--gray-700)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: filter === 'my-bookings' ? '600' : '400'
            }}
          >
            My Bookings ({runs.filter(r => r.is_booked).length})
          </button>
        )}

        {isLIRFOrAdmin && (
          <button
            onClick={() => setFilter('my-assignments')}
            style={{
              padding: '8px 16px',
              border: filter === 'my-assignments' ? '2px solid var(--red-primary)' : '1px solid var(--gray-300)',
              background: filter === 'my-assignments' ? 'var(--red-light)' : 'white',
              color: filter === 'my-assignments' ? 'var(--red-primary)' : 'var(--gray-700)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: filter === 'my-assignments' ? '600' : '400'
            }}
          >
            My LIRF Duties ({runs.filter(r => r.user_is_assigned_lirf).length})
          </button>
        )}
      </div>

      {error && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {filteredRuns.length === 0 ? (
        <div className="card">
          <div className="card-content">
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
              <h3 style={{ margin: '0 0 8px 0' }}>
                {filter === 'available' ? 'No Available Runs' : 
                 filter === 'my-bookings' ? 'No Bookings Yet' : 
                 filter === 'my-assignments' ? 'No LIRF Assignments' : 'No Scheduled Runs'}
              </h3>
              <p style={{ margin: '0' }}>
                {filter === 'available' ? 'All current runs are either full or you have already booked them.' :
                 filter === 'my-bookings' ? 'You haven\'t booked any runs yet.' :
                 filter === 'my-assignments' ? 'You haven\'t been assigned as LIRF to any runs yet.' :
                 'No runs are currently scheduled.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredRuns.map((run) => {
            const daysUntil = getDaysUntilRun(run.run_date);
            const isUrgent = isLIRFOrAdmin && daysUntil <= 7 && run.lirf_vacancies > 0;
            
            return (
              <div 
                key={run.id} 
                className="card"
                style={{ 
                  border: isUrgent ? '2px solid #fecaca' : '1px solid #e5e7eb',
                  background: isUrgent ? '#fef2f2' : 'white'
                }}
              >
                <div className="card-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: 'var(--red-primary)'
                        }}>
                          {run.run_title}
                        </h3>
                        
                        {/* Status Badges */}
                        {run.is_booked && (
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#dbeafe',
                            color: '#1e40af'
                          }}>
                            ✅ Booked
                          </div>
                        )}
                        
                        {isLIRFOrAdmin && run.user_is_assigned_lirf && (
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#dcfce7',
                            color: '#166534'
                          }}>
                            👨‍🏫 LIRF Assigned
                          </div>
                        )}
                        
                        {run.is_full && (
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#fee2e2',
                            color: '#dc2626'
                          }}>
                            🚫 Full
                          </div>
                        )}
                        
                        {isUrgent && (
                          <div style={{
                            background: '#fecaca',
                            color: '#dc2626',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            ⚠️ URGENT
                          </div>
                        )}
                      </div>
                      
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: '16px',
                        marginBottom: '16px'
                      }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-600)' }}>
                            📅 {formatDate(run.run_date)}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                            🕐 {formatTime(run.run_time)}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-600)' }}>
                            📍 {run.meeting_point}
                          </div>
                          {run.approximate_distance && (
                            <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                              🏃‍♂️ {run.approximate_distance}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-600)' }}>
                            👥 {run.booking_count}/{run.max_participants} booked
                          </div>
                          {isLIRFOrAdmin && (
                            <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                              👨‍🏫 {run.assigned_lirfs.length}/{run.lirfs_required} LIRF{run.lirfs_required > 1 ? 's' : ''}
                              {run.lirf_vacancies > 0 && (
                                <span style={{ color: '#dc2626', fontWeight: '500' }}>
                                  {' '}({run.lirf_vacancies} needed)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {run.description && (
                        <div style={{ 
                          background: 'var(--gray-50)', 
                          padding: '12px', 
                          borderRadius: '6px',
                          marginBottom: '16px'
                        }}>
                          <div style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                            {run.description}
                          </div>
                        </div>
                      )}

                      {/* LIRF Assignment Info - LIRFs/Admins only */}
                      {isLIRFOrAdmin && (
                        <div style={{ 
                          background: 'var(--gray-50)', 
                          padding: '12px', 
                          borderRadius: '6px',
                          marginBottom: '16px'
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '8px' }}>
                            LIRF Assignments
                          </div>
                          {run.assigned_lirfs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {run.assigned_lirfs.map((lirf, index) => (
                                <div key={index} style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                                  • {lirf.name}
                                </div>
                              ))}
                              {run.lirf_vacancies > 0 && (
                                <div style={{ fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>
                                  • {run.lirf_vacancies} position{run.lirf_vacancies > 1 ? 's' : ''} still needed
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '14px', color: '#dc2626' }}>
                              No LIRFs assigned yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                      {/* Member Booking Actions */}
                      {!state.user ? (
                        <div style={{ 
                          padding: '8px 16px',
                          background: 'var(--gray-100)',
                          color: 'var(--gray-500)',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}>
                          Log in to book
                        </div>
                      ) : run.is_booked ? (
                        <button
                          onClick={() => run.user_booking_id && handleCancelBooking(run.id, run.user_booking_id)}
                          disabled={bookingLoading === run.id}
                          className="btn btn-secondary"
                          style={{ 
                            fontSize: '14px',
                            background: '#fef2f2',
                            borderColor: '#fecaca',
                            color: '#dc2626'
                          }}
                        >
                          {bookingLoading === run.id ? 'Cancelling...' : '🗑️ Cancel Booking'}
                        </button>
                      ) : run.is_full ? (
                        <div style={{ 
                          padding: '8px 16px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          Run is full
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBookRun(run.id)}
                          disabled={bookingLoading === run.id}
                          className="btn btn-primary"
                          style={{ fontSize: '14px' }}
                        >
                          {bookingLoading === run.id ? 'Booking...' : '🏃‍♂️ Book Run'}
                        </button>
                      )}

                      {/* Share Button - LIRFs/Admins only */}
                      {isLIRFOrAdmin && (
                        <div style={{ position: 'relative' }}>
                          <button
                            className="share-button btn btn-secondary"
                            onClick={() => setShowShareMenu(showShareMenu === run.id ? null : run.id)}
                            style={{ 
                              fontSize: '14px', 
                              width: '100%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '8px' 
                            }}
                          >
                            <Share2 size={16} />
                            Share Run
                          </button>
                          
                          {showShareMenu === run.id && (
                            <div 
                              className="share-dropdown"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: '0',
                                background: 'white',
                                border: '1px solid var(--gray-300)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                zIndex: 10,
                                minWidth: '200px',
                                marginTop: '4px'
                              }}
                            >
                              <div style={{ padding: '8px 0' }}>
                                <div
                                  onClick={() => {
                                    handleShareRun(run, 'copy');
                                    setShowShareMenu(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  📋 Copy to Clipboard
                                </div>
                                
                                <div
                                  onClick={() => {
                                    handleShareRun(run, 'facebook-group');
                                    setShowShareMenu(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  🎯 Post to Club Facebook Group
                                </div>
                                
                                <div
                                  onClick={() => {
                                    handleShareRun(run, 'facebook');
                                    setShowShareMenu(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  📘 Share on Facebook
                                </div>
                                
                                <div
                                  onClick={() => {
                                    handleShareRun(run, 'whatsapp');
                                    setShowShareMenu(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  💬 Share on WhatsApp
                                </div>
                                
                                <div
                                  onClick={() => {
                                    handleShareRun(run, 'twitter');
                                    setShowShareMenu(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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
                            className="btn btn-secondary"
                            style={{ 
                              fontSize: '14px',
                              background: '#fef2f2',
                              borderColor: '#fecaca',
                              color: '#dc2626'
                            }}
                          >
                            {assignmentLoading === run.id ? 'Unassigning...' : '👨‍🏫 Unassign LIRF'}
                          </button>
                        ) : run.lirf_vacancies > 0 ? (
                          <button
                            onClick={() => handleAssignSelfAsLIRF(run.id)}
                            disabled={assignmentLoading === run.id}
                            className="btn btn-secondary"
                            style={{ fontSize: '14px' }}
                          >
                            {assignmentLoading === run.id ? 'Assigning...' : '👨‍🏫 Assign Me as LIRF'}
                          </button>
                        ) : (
                          <div style={{ 
                            padding: '8px 16px',
                            background: '#f3f4f6',
                            color: '#6b7280',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}>
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
    </div>
  );
};

export default ViewScheduledRuns;