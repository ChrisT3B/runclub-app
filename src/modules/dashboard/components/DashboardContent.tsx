import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { BookingService } from '../../../modules/admin/services/bookingService';
import { NotificationService, Notification } from '../../../modules/communications/services/NotificationService';
import { NotificationModal } from '../../../shared/components/ui/NotificationModal';
import { supabase } from '../../../services/supabase';
import { renderTextWithLinks } from '../../../utils/linkHelper';

interface DashboardContentProps {
  onNavigate?: (page: string) => void;
}

interface UserStats {
  attendanceCount: number;
  memberSince: string;
  membershipStatus: string;
}

interface LirfLookAhead {
  date: string;
  runName: string;
  lirfAssigned: boolean;
  lirfName: string;
  runId: string;
  lirfCount: number;
  lirfsRequired: number;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ onNavigate }) => {
  const { state, permissions } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    attendanceCount: 0,
    memberSince: '',
    membershipStatus: 'Active'
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [lirfLookAhead, setLirfLookAhead] = useState<LirfLookAhead[]>([]);
  const [loadingLirf, setLoadingLirf] = useState(true);

  useEffect(() => {
    if (state.user?.id) {
      loadUpcomingBookings();
      loadUserStats();
      loadNotifications();
      // Load LIRF look-ahead for LIRF/Admin users
      if (permissions.accessLevel === 'admin' || permissions.accessLevel === 'lirf') {
        loadLirfLookAhead();
      }
    }
  }, [state.user, permissions.accessLevel]);
  
  const loadUpcomingBookings = async () => {
    if (!state.user?.id) {
      setLoadingBookings(false);
      return;
    }
    
    try {
      const bookings = await BookingService.getMemberBookings(state.user.id);
      
      // Filter for upcoming runs that aren't cancelled
      const upcoming = bookings.filter(booking => {
        const isNotCancelled = !booking.cancelled_at;
        
        // Create date objects for comparison
        const runDateTime = new Date(`${booking.run_date}T${booking.run_time}`);
        const now = new Date();
        
        // Check if run is in the future (including later today)
        const isFuture = runDateTime > now;
        
        return isNotCancelled && isFuture;
      }).slice(0, 3); // Show max 3 upcoming
      
      setUpcomingBookings(upcoming);
    } catch (error) {
      console.error('Failed to load upcoming bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadNotifications = async () => {
    if (!state.user?.id) {
      setLoadingNotifications(false);
      return;
    }

    try {
      // Only load a small number for dashboard
      const userNotifications = await NotificationService.getUserNotifications(3);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Don't show notifications section if loading fails
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadUserStats = async () => {
    if (!state.user?.id) {
      setLoadingStats(false);
      return;
    }

    try {
      // Get attendance count
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('run_attendance')
        .select('id')
        .eq('member_id', state.user.id)
        .eq('attended', true);

      if (attendanceError) {
        console.error('Error fetching attendance count:', attendanceError);
      }

      // Get user creation date and membership status
      const { data: userData, error: userError } = await supabase
        .from('members')
        .select('created_at, membership_status')
        .eq('id', state.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      // Format member since date
      let memberSince = 'Unknown';
      if (userData?.created_at) {
        memberSince = new Date(userData.created_at).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        });
      }

      setUserStats({
        attendanceCount: attendanceData?.length || 0,
        memberSince,
        membershipStatus: userData?.membership_status || 'Active'
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadLirfLookAhead = async () => {
    try {
      // Get date range for next 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999);

      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

      // Fetch scheduled runs with LIRF assignments
      const { data: upcomingRuns, error: runsError } = await supabase
        .from('scheduled_runs')
        .select(`
          id,
          run_title,
          run_date,
          assigned_lirf_1,
          assigned_lirf_2,
          assigned_lirf_3,
          lirfs_required
        `)
        .gte('run_date', todayStr)
        .lte('run_date', sevenDaysStr)
        .order('run_date', { ascending: true });

      if (runsError) {
        console.error('Error fetching LIRF runs:', runsError);
        setLirfLookAhead([]);
        return;
      }

      if (!upcomingRuns || upcomingRuns.length === 0) {
        setLirfLookAhead([]);
        return;
      }

      // Get all unique LIRF IDs
      const lirfIds = new Set<string>();
      upcomingRuns.forEach((run: any) => {
        if (run.assigned_lirf_1) lirfIds.add(run.assigned_lirf_1);
        if (run.assigned_lirf_2) lirfIds.add(run.assigned_lirf_2);
        if (run.assigned_lirf_3) lirfIds.add(run.assigned_lirf_3);
      });

      // Only fetch members if we have LIRF IDs
      let memberMap = new Map();
      if (lirfIds.size > 0) {
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, full_name')
          .in('id', Array.from(lirfIds));

        if (membersError) {
          console.error('Error fetching LIRF members:', membersError);
        } else {
          memberMap = new Map(members?.map((m: any) => [m.id, m.full_name]) || []);
        }
      }

      // Transform data
      const tableData: LirfLookAhead[] = upcomingRuns.map((run: any) => {
        const lirfCount = [
          run.assigned_lirf_1,
          run.assigned_lirf_2,
          run.assigned_lirf_3,
        ].filter(Boolean).length;

        const lirfsRequired = run.lirfs_required || 0;
        const hasLirf = lirfCount > 0;

        const lirfNames = [
          run.assigned_lirf_1 ? memberMap.get(run.assigned_lirf_1) : null,
          run.assigned_lirf_2 ? memberMap.get(run.assigned_lirf_2) : null,
          run.assigned_lirf_3 ? memberMap.get(run.assigned_lirf_3) : null,
        ].filter(Boolean);

        return {
          date: run.run_date,
          runName: run.run_title,
          lirfAssigned: hasLirf,
          lirfName: lirfNames.length > 0 ? lirfNames.join(', ') : 'None',
          runId: run.id,
          lirfCount,
          lirfsRequired,
        };
      });

      setLirfLookAhead(tableData);
    } catch (error) {
      console.error('Failed to load LIRF look-ahead:', error);
      setLirfLookAhead([]);
    } finally {
      setLoadingLirf(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if not already read
      if (!notification.read_at) {
        await NotificationService.markAsRead(notification.id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
      }

      // Open modal instead of navigating
      setSelectedNotification({
        ...notification,
        read_at: notification.read_at || new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent notification click when dismissing from list
    }
    
    try {
      // The dismissNotification service already marks as read when dismissing
      await NotificationService.dismissNotification(notificationId);
      
      // Update local state - mark as read and remove from list
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      // Close modal if it's the same notification
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };
      
  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return '🚨';
    if (type === 'run_specific') return '🏃‍♂️';
    if (type === 'general') return '📢';
    return '📬';
  };

  const getNotificationPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { background: '#fef2f2', borderColor: '#dc2626', color: '#dc2626' };
      case 'high':
        return { background: '#fef3c7', borderColor: '#f59e0b', color: '#f59e0b' };
      default:
        return { background: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' };
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { background: '#dcfce7', color: '#166534' };
      case 'pending':
        return { background: '#fef3c7', color: '#92400e' };
      case 'expired':
        return { background: '#fecaca', color: '#991b1b' };
      default:
        return { background: '#f3f4f6', color: '#374151' };
    }
  };
  
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome to your Run Alcester member portal</p>
      </div>
      
      

      {/* Notifications Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">📬 Recent Notifications</h3>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate?.('communications')}
            style={{ fontSize: '14px' }}
          >
            View All
          </button>
        </div>
        <div className="card-content">
          {loadingNotifications ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📬</div>
              <p style={{ margin: '0' }}>No new notifications</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notification) => {
                const priorityStyle = getNotificationPriorityColor(notification.priority);
                const isUnread = !notification.read_at;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '16px',
                      background: isUnread ? '#fef9e7' : priorityStyle.background,
                      borderRadius: '8px',
                      border: `1px solid ${priorityStyle.borderColor}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>
                          {getNotificationIcon(notification.type, notification.priority)}
                        </span>
                        <div style={{
                          fontWeight: isUnread ? '600' : '500',
                          color: 'var(--gray-900)',
                          fontSize: '14px'
                        }}>
                          {notification.title}
                        </div>
                        {isUnread && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--red-primary)'
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--gray-600)',
                        marginBottom: '8px',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-wrap', // Preserve line breaks and formatting
                        wordBreak: 'break-word'  // Handle long words gracefully
                      }}>
                        {renderTextWithLinks(notification.message)}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--gray-500)' }}>
                        <span>📅 {formatNotificationDate(notification.sent_at)}</span>
                        {notification.sender_name && (
                          <span>👤 {notification.sender_name}</span>
                        )}
                        {notification.run_title && (
                          <span>🏃‍♂️ {notification.run_title}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDismissNotification(notification.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--gray-400)',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--gray-600)';
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--gray-400)';
                        e.currentTarget.style.background = 'none';
                      }}
                      title="Dismiss notification"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* LIRF Look-Ahead Section - Only for LIRF/Admin users */}
      {(permissions.accessLevel === 'admin' || permissions.accessLevel === 'lirf') && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">📊 7-Day LIRF Assignment Look-Ahead</h3>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate?.('admin-reports')}
              style={{ fontSize: '14px' }}
            >
              View Full Reports
            </button>
          </div>
          <div className="card-content">
            {loadingLirf ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                Loading LIRF assignments...
              </div>
            ) : lirfLookAhead.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏃‍♂️</div>
                <p style={{ margin: '0' }}>No upcoming runs in the next 7 days</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="member-table">
                  <thead className="member-table__header">
                    <tr>
                      <th className="member-table__header-cell">Date</th>
                      <th className="member-table__header-cell">Run Name</th>
                      <th className="member-table__header-cell">LIRF Assigned</th>
                      <th className="member-table__header-cell">LIRF Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lirfLookAhead.map((run) => {
                      // Determine background color based on LIRF count vs required
                      let backgroundColor = '#dcfce7'; // Green - all filled
                      if (run.lirfCount === 0) {
                        backgroundColor = '#fee2e2'; // Red - none filled
                      } else if (run.lirfCount < run.lirfsRequired) {
                        backgroundColor = '#fef3c7'; // Amber - has vacancies
                      }

                      return (
                        <tr
                          key={run.runId}
                          className="member-table__row"
                          style={{ backgroundColor }}
                        >
                          <td className="member-table__cell">{formatDate(run.date)}</td>
                          <td className="member-table__cell member-name">
                            <a
                              href={`#scheduled-runs?runId=${run.runId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                sessionStorage.setItem('scrollToRunId', run.runId);
                                onNavigate?.('scheduled-runs');
                              }}
                              style={{
                                color: 'var(--red-primary)',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                              }}
                            >
                              {run.runName}
                            </a>
                          </td>
                          <td className="member-table__cell">
                            {run.lirfCount >= run.lirfsRequired ? (
                              <span className="status-badge status-badge--active">Full ({run.lirfCount}/{run.lirfsRequired})</span>
                            ) : run.lirfCount > 0 ? (
                              <span className="status-badge" style={{ backgroundColor: '#f59e0b', color: 'white' }}>Partial ({run.lirfCount}/{run.lirfsRequired})</span>
                            ) : (
                              <span className="status-badge status-badge--inactive">None (0/{run.lirfsRequired})</span>
                            )}
                          </td>
                          <td className="member-table__cell">{run.lirfName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Runs Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Your Upcoming Runs</h3>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigate?.('scheduled-runs')}
            style={{ fontSize: '14px' }}
          >
            View All Runs
          </button>
        </div>
        <div className="card-content">
          {loadingBookings ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
              Loading your bookings...
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏃‍♂️</div>
              <p style={{ margin: '0 0 8px 0' }}>No upcoming runs booked</p>
              <button 
                className="btn btn-secondary"
                onClick={() => onNavigate?.('scheduled-runs')}
                style={{ fontSize: '14px', marginTop: '12px' }}
              >
                Browse Available Runs
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingBookings.map((booking) => (
                <div 
                  key={booking.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: 'var(--gray-50)',
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--red-primary)', marginBottom: '4px' }}>
                      {booking.run_title}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                      📅 {formatDate(booking.run_date)} at {formatTime(booking.run_time)}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                      📍 {booking.meeting_point}
                    </div>
                  </div>
                  <div style={{ 
                    background: '#dcfce7', 
                    color: '#166534', 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '500' 
                  }}>
                    ✅ Booked
                  </div>
                </div>
              ))}
              
              {upcomingBookings.length > 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={() => onNavigate?.('scheduled-runs')}
                  style={{ fontSize: '14px', alignSelf: 'flex-start', marginTop: '8px' }}
                >
                  Manage All Bookings →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
{/* Quick Stats Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Quick Stats</h3>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
                {loadingBookings ? '...' : upcomingBookings.length}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Upcoming Runs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
                {loadingStats ? '...' : userStats.attendanceCount}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Runs Attended</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
                {loadingStats ? '...' : userStats.memberSince}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Member Since</div>
            </div>
          </div>
        </div>
      </div>
          {/* Profile Summary Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Your Profile</h3>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // Navigate to profile page with edit mode enabled
                  onNavigate?.('profile');
                  // Add edit parameter to URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('edit', 'true');
                  window.history.replaceState({}, '', url.toString());
                }}
                style={{ fontSize: '14px' }}
              >
                📝 Edit Profile
              </button>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Name:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.member?.full_name || 'Not set'}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
                <div style={{ color: 'var(--gray-900)' }}>{state.user?.email}</div>
              </div>
            </div>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Access Level:</div>
                <span style={{ 
                  background: 'var(--red-light)', 
                  color: 'var(--red-primary)', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '500' 
                }}>
                  {state.member?.access_level || 'member'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Status:</div>
                <span style={{ 
                  ...getMembershipStatusColor(userStats.membershipStatus),
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '500' 
                }}>
                  {loadingStats ? '...' : userStats.membershipStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onDismiss={() => handleDismissNotification(selectedNotification.id)}
          onMarkAsRead={async () => {
            if (!selectedNotification.read_at) {
              try {
                await NotificationService.markAsRead(selectedNotification.id);
                setSelectedNotification({
                  ...selectedNotification,
                  read_at: new Date().toISOString()
                });
                setNotifications(prev => 
                  prev.map(n => 
                    n.id === selectedNotification.id 
                      ? { ...n, read_at: new Date().toISOString() }
                      : n
                  )
                );
              } catch (error) {
                console.error('Failed to mark as read:', error);
              }
            }
          }}
        />
      )}
    </>
  );
};