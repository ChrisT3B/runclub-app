import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ScheduledRunsService, ScheduledRun } from '../../admin/services/scheduledRunsService';
import { BookingService } from '../../admin/services/bookingService';

interface LeadYourRunProps {
  onNavigateToAttendance?: (runId: string, runTitle: string) => void;
}

export const LeadYourRun: React.FC<LeadYourRunProps> = ({ onNavigateToAttendance }) => {
  const { state } = useAuth();
  const [assignedRuns, setAssignedRuns] = useState<ScheduledRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadAssignedRuns();
  }, [state.user]);

  const loadAssignedRuns = async () => {
    if (!state.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Get all runs and filter for assigned ones
      const allRuns = await ScheduledRunsService.getScheduledRuns();
      
      console.log('🔍 Current user ID:', state.user.id);
      console.log('🔍 Current user access level:', state.member?.access_level);
      
      // Filter runs where current user is assigned as LIRF
      const myAssignedRuns = allRuns.filter(run => {
        const isAssigned = run.assigned_lirf_1 === state.user?.id ||
                            run.assigned_lirf_2 === state.user?.id ||
                            run.assigned_lirf_3 === state.user?.id;

        console.log('🔍 Checking run assignment:', {
            title: run.run_title,
            runId: run.id,
            lirf1: run.assigned_lirf_1,
            lirf2: run.assigned_lirf_2,
            lirf3: run.assigned_lirf_3,
            currentUserId: state.user?.id,
            isMatch: isAssigned
        });

        return isAssigned;
      });

      console.log('🔍 Found assigned runs:', myAssignedRuns.length);
      
      // Add booking counts to each run
      console.log('🔍 Starting booking fetch for', myAssignedRuns.length, 'runs');
      
      const runsWithBookings = await Promise.all(
        myAssignedRuns.map(async (run, index) => {
          console.log(`🔍 Fetching bookings for run ${index + 1}:`, run.id, run.run_title);
          
          try {
            const bookings = await BookingService.getRunBookings(run.id);
            const activeBookings = bookings.filter(b => !b.cancelled_at);
            
            console.log('🔍 Booking data for run:', {
              runId: run.id,
              title: run.run_title,
              allBookings: bookings.length,
              activeBookings: activeBookings.length,
              bookings: bookings.map(b => ({
                id: b.id,
                member_id: b.member_id,
                cancelled_at: b.cancelled_at
              }))
            });
            
            return {
              ...run,
              bookings_count: activeBookings.length,
              bookings: activeBookings
            };
          } catch (error) {
            console.error('❌ Error getting bookings for run:', run.id, error);
            return {
              ...run,
              bookings_count: 0,
              bookings: []
            };
          }
        })
      );
      
      console.log('🔍 Finished booking fetch, final data:', runsWithBookings.map(r => ({
        id: r.id,
        title: r.run_title,
        bookings_count: r.bookings_count
      })));

      // Filter for today and future runs, plus completed runs from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];
      
      console.log('🔍 Today for comparison:', todayString);
      
      const relevantRuns = runsWithBookings.filter(run => {
        const runDate = new Date(run.run_date + 'T12:00:00'); // Add noon to avoid timezone issues
        runDate.setHours(0, 0, 0, 0);
        
        const isToday = run.run_date === todayString;
        const isFuture = run.run_date > todayString;
        const isInProgress = run.run_status === 'in_progress';
        const isCompletedToday = run.run_status === 'completed' && isToday;
        
        const shouldShow = isFuture || isInProgress || isCompletedToday || isToday;
        
        console.log('🔍 Date filtering:', {
          title: run.run_title,
          runDate: run.run_date,
          runDateParsed: runDate.toISOString().split('T')[0],
          today: todayString,
          status: run.run_status,
          isToday,
          isFuture,
          isInProgress,
          isCompletedToday,
          shouldShow
        });
        
        return shouldShow;
      });

      // Sort by date and time
      relevantRuns.sort((a, b) => {
        const dateA = new Date(`${a.run_date}T${a.run_time}`);
        const dateB = new Date(`${b.run_date}T${b.run_time}`);
        return dateA.getTime() - dateB.getTime();
      });

      console.log('🔍 Final assigned runs loaded:', relevantRuns.map(run => ({
        id: run.id,
        title: run.run_title,
        date: run.run_date,
        status: run.run_status,
        bookings_count: run.bookings_count,
        assigned_lirfs: [run.assigned_lirf_1, run.assigned_lirf_2, run.assigned_lirf_3].filter(Boolean)
      })));

      setAssignedRuns(relevantRuns);
    } catch (err: any) {
      console.error('Failed to load assigned runs:', err);
      setError(err.message || 'Failed to load your assigned runs');
    } finally {
      setLoading(false);
    }
  };

  const updateRunStatus = async (runId: string, newStatus: 'in_progress' | 'completed') => {
    if (!state.user?.id) return;

    try {
      setStatusUpdating(runId);
      setError('');

      // Update run status in database
      await ScheduledRunsService.updateRunStatus(runId, newStatus);
      
      // Refresh the runs list
      await loadAssignedRuns();
      
      // Auto-navigate to attendance when starting a run
      if (newStatus === 'in_progress') {
        console.log('🎯 Auto-navigating to attendance for run:', runId);
        const run = assignedRuns.find(r => r.id === runId);
        if (run && onNavigateToAttendance) {
          // Small delay to allow UI to update
          setTimeout(() => {
            onNavigateToAttendance(runId, run.run_title);
          }, 500);
        }
      }
      
    } catch (err: any) {
      console.error('Failed to update run status:', err);
      setError(err.message || 'Failed to update run status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    // Add noon time to avoid timezone issues
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
      minute: '2-digit'
    });
  };

  const getRunStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { bg: '#f3f4f6', color: '#6b7280', text: 'Scheduled' },
      in_progress: { bg: '#fef3c7', color: '#92400e', text: 'In Progress' },
      completed: { bg: '#dcfce7', color: '#166534', text: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#dc2626', text: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;

    return (
      <span style={{
        background: config.bg,
        color: config.color,
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {config.text}
      </span>
    );
  };

  const isRunToday = (dateString: string) => {
    const runDate = new Date(dateString + 'T12:00:00'); // Add noon to avoid timezone issues
    const today = new Date();
    return runDate.toDateString() === today.toDateString();
  };

  const canStartRun = (run: ScheduledRun) => {
    return run.run_status === 'scheduled' && isRunToday(run.run_date);
  };

  const canManageAttendance = (run: ScheduledRun) => {
    return run.run_status === 'in_progress';
  };

  const canCompleteRun = (run: ScheduledRun) => {
    return run.run_status === 'in_progress';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading your assigned runs...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏃‍♂️ Lead Your Runs</h1>
        <p className="page-description">Manage runs you're assigned to lead</p>
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

      {assignedRuns.length === 0 ? (
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>No Assigned Runs</h3>
            <p style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
              You don't have any runs assigned to you at the moment.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
              Check with admins or assign yourself to runs from the Scheduled Runs page.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {assignedRuns.map((run) => (
            <div key={run.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="card-title">{run.run_title}</h3>
                    <p style={{ color: 'var(--gray-600)', margin: '4px 0' }}>
                      📅 {formatDate(run.run_date)} at {formatTime(run.run_time)}
                    </p>
                  </div>
                  {getRunStatusBadge(run.run_status)}
                </div>
              </div>
              
              <div className="card-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>
                      Meeting Point:
                    </div>
                    <div style={{ color: 'var(--gray-900)' }}>📍 {run.meeting_point}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>
                      Distance:
                    </div>
                    <div style={{ color: 'var(--gray-900)' }}>🏃‍♂️ {run.approximate_distance}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>
                      Participants:
                    </div>
                    <div style={{ color: 'var(--gray-900)' }}>
                      👥 {run.bookings_count || 0} / {run.max_participants}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {canStartRun(run) && (
                    <button
                      className="btn btn-primary"
                      onClick={() => updateRunStatus(run.id, 'in_progress')}
                      disabled={statusUpdating === run.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {statusUpdating === run.id ? '⏳' : '▶️'} 
                      {statusUpdating === run.id ? 'Starting...' : 'Start Run'}
                    </button>
                  )}

                  {canManageAttendance(run) && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onNavigateToAttendance?.(run.id, run.run_title)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      📝 Manage Attendance
                    </button>
                  )}

                  {canCompleteRun(run) && (
                    <button
                      className="btn btn-success"
                      onClick={() => updateRunStatus(run.id, 'completed')}
                      disabled={statusUpdating === run.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        background: '#16a34a',
                        borderColor: '#16a34a'
                      }}
                    >
                      {statusUpdating === run.id ? '⏳' : '✅'} 
                      {statusUpdating === run.id ? 'Completing...' : 'Complete Run'}
                    </button>
                  )}

                  {run.run_status === 'completed' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#16a34a',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      ✅ Run completed
                      {run.completed_at && (
                        <span style={{ color: 'var(--gray-500)', fontSize: '12px' }}>
                          at {new Date(run.completed_at).toLocaleTimeString('en-GB')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {run.run_status === 'in_progress' && run.started_at && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: '#fef3c7',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#92400e'
                  }}>
                    🏃‍♂️ Run started at {new Date(run.started_at).toLocaleTimeString('en-GB')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};