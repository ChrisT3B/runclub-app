import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { InvitationService } from '../../../services/invitationService';

interface RegistrationStats {
  totalInvited: number;
  registered: number;
  pending: number;
  registrationRate: string;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  bookingsThisMonth: number;
  attendanceThisMonth: number;
  guestsAddedThisMonth: number;
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

interface PendingInvitation {
  id: string;
  email: string;
  token: string;
  status: string;
  invited_by: string | null;
  invited_at: string;
  expires_at: string;
  invitation_sent: boolean;
  invited_by_member?: { full_name: string };
}

interface RunAttendanceSummary {
  runId: string;
  runTitle: string;
  runDate: string;
  runnerCount: number;
}

interface WeeklyRunnersData {
  weekStart: string;       // ISO date string — Monday of the selected week
  runs: RunAttendanceSummary[];
  totalRunners: number;
  averagePerRun: number;
}

interface WeeklyTrendPoint {
  weekStart: string;       // ISO date string — Monday of each week
  weekLabel: string;       // e.g. "17 Mar"
  totalRunners: number;
  runCount: number;
  averagePerRun: number;
}

interface AdminReportsProps {
  onNavigate?: (page: string) => void;
}

export const AdminReports: React.FC<AdminReportsProps> = ({ onNavigate }) => {
  const { permissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats>({
    totalInvited: 0,
    registered: 0,
    pending: 0,
    registrationRate: '0',
  });
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    bookingsThisMonth: 0,
    attendanceThisMonth: 0,
    guestsAddedThisMonth: 0,
  });
  const [lirfLookAhead, setLirfLookAhead] = useState<LirfLookAhead[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [resending, setResending] = useState<string | null>(null);

  // Weekly Runners Report state
  const [weeklyRunnersLoading, setWeeklyRunnersLoading] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [weeklyRunnersData, setWeeklyRunnersData] = useState<WeeklyRunnersData | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[]>([]);

  useEffect(() => {
    if (permissions.accessLevel === 'admin' || permissions.accessLevel === 'lirf') {
      fetchAllData();
    }
  }, [permissions]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRegistrationStats(),
        fetchUserMetrics(),
        fetchLirfLookAhead(),
        fetchPendingInvitations(),
        fetchWeeklyRunnersReport(),
        fetchWeeklyTrend(),
      ]);
    } catch (error) {
      console.error('Error fetching admin reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationStats = async () => {
    try {
      const { data: invitationStats, error } = await supabase
        .from('pending_invitations')
        .select('status')
        .in('status', ['pending', 'registered']);

      if (error) throw error;

      const totalInvited = invitationStats?.length || 0;
      const registered = invitationStats?.filter((i) => i.status === 'registered').length || 0;
      const pending = invitationStats?.filter((i) => i.status === 'pending').length || 0;
      const registrationRate = totalInvited > 0 ? ((registered / totalInvited) * 100).toFixed(1) : '0';

      setRegistrationStats({
        totalInvited,
        registered,
        pending,
        registrationRate,
      });
    } catch (error) {
      console.error('Error fetching registration stats:', error);
    }
  };

  const fetchUserMetrics = async () => {
    try {
      // Total users (excluding guests)
      const { count: totalUsers, error: totalUsersError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .neq('membership_status', 'guest');

      if (totalUsersError) {
        console.error('Error fetching total users:', totalUsersError);
        throw totalUsersError;
      }

      console.log('Total users count (excluding guests):', totalUsers);

      // Active users (booked in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUserIds, error: activeUsersError } = await supabase
        .from('run_bookings')
        .select('member_id')
        .gte('booked_at', thirtyDaysAgo.toISOString())
        .is('cancelled_at', null);

      if (activeUsersError) {
        console.error('Error fetching active users:', activeUsersError);
        throw activeUsersError;
      }

      console.log('Active user bookings:', activeUserIds);
      const activeUsers = new Set(activeUserIds?.map((b) => b.member_id)).size;

      // Bookings this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: bookingsThisMonth, error: bookingsError } = await supabase
        .from('run_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('booked_at', startOfMonth.toISOString())
        .is('cancelled_at', null);

      if (bookingsError) {
        console.error('Error fetching bookings this month:', bookingsError);
        throw bookingsError;
      }

      console.log('Bookings this month:', bookingsThisMonth);

      // Attendance this month (bookings where attended = true)
      const { count: attendanceThisMonth, error: attendanceError } = await supabase
        .from('run_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('booked_at', startOfMonth.toISOString())
        .eq('attended', true);

      if (attendanceError) {
        console.error('Error fetching attendance this month:', attendanceError);
        throw attendanceError;
      }

      console.log('Attendance this month:', attendanceThisMonth);

      // Guests added this month
      const { count: guestsAddedThisMonth, error: guestsError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'guest')
        .gte('created_at', startOfMonth.toISOString());

      if (guestsError) {
        console.error('Error fetching guests added this month:', guestsError);
        throw guestsError;
      }

      console.log('Guests added this month:', guestsAddedThisMonth);

      setUserMetrics({
        totalUsers: totalUsers || 0,
        activeUsers,
        bookingsThisMonth: bookingsThisMonth || 0,
        attendanceThisMonth: attendanceThisMonth || 0,
        guestsAddedThisMonth: guestsAddedThisMonth || 0,
      });
    } catch (error) {
      console.error('Error fetching user metrics:', error);
    }
  };

  const fetchLirfLookAhead = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999); // End of day

      // Format dates as YYYY-MM-DD for date-only comparison
      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

      console.log('Fetching runs between:', todayStr, 'and', sevenDaysStr);

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
        console.error('Supabase error fetching runs:', runsError);
        throw runsError;
      }

      console.log('Fetched upcoming runs:', upcomingRuns);

      if (!upcomingRuns || upcomingRuns.length === 0) {
        setLirfLookAhead([]);
        return;
      }

      // Get all unique LIRF IDs to fetch their names
      const lirfIds = new Set<string>();
      upcomingRuns.forEach((run: any) => {
        if (run.assigned_lirf_1) lirfIds.add(run.assigned_lirf_1);
        if (run.assigned_lirf_2) lirfIds.add(run.assigned_lirf_2);
        if (run.assigned_lirf_3) lirfIds.add(run.assigned_lirf_3);
      });

      // Fetch member names for all assigned LIRFs
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, full_name')
        .in('id', Array.from(lirfIds));

      if (membersError) {
        console.error('Error fetching LIRF member names:', membersError);
      }

      console.log('Fetched LIRF members:', members);

      // Create a lookup map
      const memberMap = new Map(members?.map((m: any) => [m.id, m.full_name]) || []);

      // Transform the data
      const tableData: LirfLookAhead[] = upcomingRuns.map((run: any) => {
        // Count how many LIRF positions are filled
        const lirfCount = [
          run.assigned_lirf_1,
          run.assigned_lirf_2,
          run.assigned_lirf_3,
        ].filter(Boolean).length;

        const lirfsRequired = run.lirfs_required || 0;
        const hasLirf = lirfCount > 0;

        // Get all assigned LIRF names
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

      console.log('Final LIRF look-ahead data:', tableData);
      setLirfLookAhead(tableData);
    } catch (error) {
      console.error('Error fetching LIRF look-ahead:', error);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select(`
          *,
          invited_by_member:members!invited_by(full_name)
        `)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const fetchWeeklyRunnersReport = async (weekStart?: string) => {
    setWeeklyRunnersLoading(true);
    try {
      const startDate = weekStart || selectedWeekStart;
      const endDate = new Date(startDate + 'T12:00:00');
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const { data: weekRuns, error: weekError } = await supabase
        .from('scheduled_runs')
        .select('id, run_title, run_date')
        .gte('run_date', startDate)
        .lte('run_date', endDateStr)
        .eq('run_status', 'completed')
        .not('run_title', 'like', '[DEMO]%')
        .order('run_date', { ascending: true });

      if (weekError) throw weekError;

      const weekRunIds = (weekRuns || []).map(r => r.id);
      let runSummaries: RunAttendanceSummary[] = [];

      if (weekRunIds.length > 0) {
        const { data: attendanceRows, error: attError } = await supabase
          .from('run_attendance')
          .select('run_id')
          .in('run_id', weekRunIds)
          .eq('marked_present', true);

        if (attError) throw attError;

        const countMap: Record<string, number> = {};
        (attendanceRows || []).forEach(row => {
          countMap[row.run_id] = (countMap[row.run_id] || 0) + 1;
        });

        runSummaries = (weekRuns || []).map(run => ({
          runId: run.id,
          runTitle: run.run_title,
          runDate: run.run_date,
          runnerCount: countMap[run.id] || 0,
        }));
      }

      const totalRunners = runSummaries.reduce((sum, r) => sum + r.runnerCount, 0);
      const averagePerRun = runSummaries.length > 0
        ? Math.round((totalRunners / runSummaries.length) * 10) / 10
        : 0;

      setWeeklyRunnersData({
        weekStart: startDate,
        runs: runSummaries,
        totalRunners,
        averagePerRun,
      });

    } catch (error) {
      console.error('Error fetching weekly runners report:', error);
    } finally {
      setWeeklyRunnersLoading(false);
    }
  };

  const fetchWeeklyTrend = async () => {
    try {
      const trendEnd = new Date();
      const trendStart = new Date();
      trendStart.setDate(trendStart.getDate() - 26 * 7);
      // Real data starts from 30 Mar 2026 — ignore test data before this date
      const dataStartDate = '2026-03-30';
      const trendStartRaw = `${trendStart.getFullYear()}-${String(trendStart.getMonth() + 1).padStart(2, '0')}-${String(trendStart.getDate()).padStart(2, '0')}`;
      const trendStartStr = trendStartRaw > dataStartDate ? trendStartRaw : dataStartDate;
      const trendEndStr = `${trendEnd.getFullYear()}-${String(trendEnd.getMonth() + 1).padStart(2, '0')}-${String(trendEnd.getDate()).padStart(2, '0')}`;

      const { data: trendRuns, error: trendRunsError } = await supabase
        .from('scheduled_runs')
        .select('id, run_date')
        .gte('run_date', trendStartStr)
        .lte('run_date', trendEndStr)
        .eq('run_status', 'completed')
        .not('run_title', 'like', '[DEMO]%');

      if (trendRunsError) throw trendRunsError;

      const trendRunIds = (trendRuns || []).map(r => r.id);

      if (trendRunIds.length === 0) {
        setWeeklyTrend([]);
        return;
      }

      const { data: trendAttendance, error: trendAttError } = await supabase
        .from('run_attendance')
        .select('run_id')
        .in('run_id', trendRunIds)
        .eq('marked_present', true);

      if (trendAttError) throw trendAttError;

      const runDateMap: Record<string, string> = {};
      (trendRuns || []).forEach(r => { runDateMap[r.id] = r.run_date; });

      const trendCountMap: Record<string, number> = {};
      (trendAttendance || []).forEach(row => {
        trendCountMap[row.run_id] = (trendCountMap[row.run_id] || 0) + 1;
      });

      const weekMap: Record<string, { total: number; runCount: number }> = {};

      trendRunIds.forEach(runId => {
        const runDate = new Date(runDateMap[runId] + 'T12:00:00');
        const day = runDate.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(runDate);
        monday.setDate(runDate.getDate() + diff);
        const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

        if (!weekMap[weekKey]) weekMap[weekKey] = { total: 0, runCount: 0 };
        weekMap[weekKey].total += trendCountMap[runId] || 0;
        weekMap[weekKey].runCount += 1;
      });

      const trendPoints: WeeklyTrendPoint[] = Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekKey, data]) => {
          const date = new Date(weekKey + 'T12:00:00');
          const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return {
            weekStart: weekKey,
            weekLabel: label,
            totalRunners: data.total,
            runCount: data.runCount,
            averagePerRun: data.runCount > 0
              ? Math.round((data.total / data.runCount) * 10) / 10
              : 0,
          };
        });

      setWeeklyTrend(trendPoints);

    } catch (error) {
      console.error('Error fetching weekly trend:', error);
    }
  };

  const resendInvitation = async (invitationId: string, email: string) => {
    setResending(invitationId);
    try {
      const result = await InvitationService.sendInvitation(email);

      if (result.success) {
        alert(`Invitation resent to ${email}`);
        await fetchPendingInvitations();
      } else {
        alert(`Failed to resend: ${result.message}`);
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Failed to resend invitation. Please try again.');
    } finally {
      setResending(null);
    }
  };

  const copyInvitationLink = (token: string) => {
    const registrationLink = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(registrationLink).then(() => {
      alert('Invitation link copied to clipboard!');
    });
  };

  if (permissions.accessLevel !== 'admin' && permissions.accessLevel !== 'lirf') {
    return (
      <div>
        <PageHeader title="Reports" />
        <div className="card">
          <div className="card-content">
            <h2 className="card-title" style={{ color: 'var(--red-primary)' }}>Access Denied</h2>
            <p>You must be a LIRF or administrator to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Reports" />
        <div className="member-list-loading">
          Loading reports...
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(selectedWeekStart + 'T12:00:00');
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const newWeekStart = `${yyyy}-${mm}-${dd}`;
    setSelectedWeekStart(newWeekStart);
    fetchWeeklyRunnersReport(newWeekStart);
    // Note: fetchWeeklyTrend is NOT called here — trend data does not change on navigation
  };

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  };

  return (
    <div>
      <PageHeader title="Reports" />

      {/* Section 1: 7-Day LIRF Assignment Look-Ahead */}
      <section style={{ marginBottom: '32px' }}>
        <h2 className="card-title">7-Day LIRF Assignment Look-Ahead</h2>
        <div className="card">
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
                {lirfLookAhead.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="member-table__cell" style={{ textAlign: 'center' }}>
                      No upcoming runs in the next 7 days
                    </td>
                  </tr>
                ) : (
                  lirfLookAhead.map((run) => {
                    // Determine background color based on LIRF count vs required
                    // 0 filled = Red (#fee2e2)
                    // 1+ vacancy = Amber (#fef3c7)
                    // All filled = Green (#dcfce7)
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
                              // Store the run ID in session storage so ViewScheduledRuns can scroll to it
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Active User Metrics */}
      <section style={{ marginBottom: '32px' }}>
        <h2 className="card-title">Active User Metrics</h2>
        <div className="card">
          <div className="table-container">
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell">Metric</th>
                  <th className="member-table__header-cell" style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="member-table__row">
                  <td className="member-table__cell">Total Users</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#3b82f6' }}>{userMetrics.totalUsers}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Active Users (30 days)</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#10b981' }}>{userMetrics.activeUsers}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Bookings This Month</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#f59e0b' }}>{userMetrics.bookingsThisMonth}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Attendance This Month</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#8b5cf6' }}>{userMetrics.attendanceThisMonth}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Guests Added This Month</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#ec4899' }}>{userMetrics.guestsAddedThisMonth}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Registration Statistics */}
      <section style={{ marginBottom: '32px' }}>
        <h2 className="card-title">Registration Statistics</h2>
        <div className="card">
          <div className="table-container">
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell">Metric</th>
                  <th className="member-table__header-cell" style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="member-table__row">
                  <td className="member-table__cell">Total Invited</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#3b82f6' }}>{registrationStats.totalInvited}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Registered</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#10b981' }}>{registrationStats.registered}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Pending</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#f59e0b' }}>{registrationStats.pending}</td>
                </tr>
                <tr className="member-table__row">
                  <td className="member-table__cell">Registration Rate</td>
                  <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', fontSize: '18px', color: '#8b5cf6' }}>{registrationStats.registrationRate}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: Pending Invitations */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Pending Invitations ({pendingInvitations.length})</h2>
          {permissions.accessLevel === 'admin' && (
            <button
              onClick={() => onNavigate?.('bulk-invitations')}
              className="btn btn--primary"
            >
              Bulk Invite Members
            </button>
          )}
        </div>
        <div className="card">
          <div className="table-container">
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell">Email</th>
                  <th className="member-table__header-cell">Invited By</th>
                  <th className="member-table__header-cell">Sent</th>
                  <th className="member-table__header-cell">Expires In</th>
                  <th className="member-table__header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="member-table__cell" style={{ textAlign: 'center' }}>
                      No pending invitations
                    </td>
                  </tr>
                ) : (
                  pendingInvitations.map((inv) => {
                    const daysUntilExpiry = Math.floor(
                      (new Date(inv.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isExpiringSoon = daysUntilExpiry <= 7;

                    return (
                      <tr key={inv.id} className="member-table__row">
                        <td className="member-table__cell">{inv.email}</td>
                        <td className="member-table__cell member-table__cell--small-gray">
                          {inv.invited_by_member?.full_name || 'Unknown'}
                        </td>
                        <td className="member-table__cell member-table__cell--small-gray">
                          {new Date(inv.invited_at).toLocaleDateString()}
                        </td>
                        <td className="member-table__cell member-table__cell--small-gray" style={{
                          color: isExpiringSoon ? '#dc2626' : 'inherit'
                        }}>
                          {isExpiringSoon && '⚠️ '}
                          {daysUntilExpiry} days
                        </td>
                        <td className="member-table__cell">
                          <div className="member-actions">
                            <button
                              onClick={() => resendInvitation(inv.id, inv.email)}
                              disabled={resending === inv.id}
                              className="btn btn-secondary member-actions__btn"
                            >
                              {resending === inv.id ? 'Resending...' : 'Resend'}
                            </button>
                            <button
                              onClick={() => copyInvitationLink(inv.token)}
                              className="btn btn-secondary member-actions__btn"
                            >
                              Copy Link
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: Weekly Runners Report */}
      <section style={{ marginBottom: '32px' }}>
        <h2 className="card-title">Weekly Runners Report</h2>

        {/* Week navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button
            className="btn btn--secondary"
            onClick={() => navigateWeek('prev')}
            disabled={weeklyRunnersLoading}
          >
            ← Prev Week
          </button>
          <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--gray-700)' }}>
            {formatWeekRange(selectedWeekStart)}
          </span>
          <button
            className="btn btn--secondary"
            onClick={() => navigateWeek('next')}
            disabled={weeklyRunnersLoading}
          >
            Next Week →
          </button>
        </div>

        {weeklyRunnersLoading ? (
          <div className="card">
            <div className="card-content" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
              Loading runners data...
            </div>
          </div>
        ) : (
          <>
            {/* Summary stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div className="card">
                <div className="card-content" style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)' }}>
                    {weeklyRunnersData?.totalRunners ?? '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>Total Runners</div>
                </div>
              </div>
              <div className="card">
                <div className="card-content" style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)' }}>
                    {weeklyRunnersData?.averagePerRun ?? '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>Avg per Run</div>
                </div>
              </div>
              <div className="card">
                <div className="card-content" style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)' }}>
                    {weeklyRunnersData?.runs.length ?? '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>Runs This Week</div>
                </div>
              </div>
            </div>

            {/* Per-run breakdown table */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="table-container">
                <table className="member-table">
                  <thead className="member-table__header">
                    <tr>
                      <th className="member-table__header-cell">Date</th>
                      <th className="member-table__header-cell">Run</th>
                      <th className="member-table__header-cell" style={{ textAlign: 'right' }}>Runners</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!weeklyRunnersData || weeklyRunnersData.runs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="member-table__cell" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
                          No completed runs with attendance recorded for this week
                        </td>
                      </tr>
                    ) : (
                      weeklyRunnersData.runs.map(run => (
                        <tr key={run.runId} className="member-table__row">
                          <td className="member-table__cell member-table__cell--small-gray">
                            {formatDate(run.runDate)}
                          </td>
                          <td className="member-table__cell">{run.runTitle}</td>
                          <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600', color: 'var(--red-primary)' }}>
                            {run.runnerCount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6-month trend */}
            <h3 className="card-title" style={{ marginBottom: '12px' }}>6-Month Trend</h3>
            {weeklyTrend.length === 0 ? (
              <div className="card">
                <div className="card-content" style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-500)' }}>
                  No historical data available yet
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-content">
                  {/* CSS bar chart — no external library */}
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: `${weeklyTrend.length * 44}px`, paddingBottom: '8px' }}>
                      {(() => {
                        const maxTotal = Math.max(...weeklyTrend.map(w => w.totalRunners), 1);
                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', marginBottom: '8px' }}>
                              {weeklyTrend.map(week => (
                                <div
                                  key={week.weekStart}
                                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}
                                  title={`${week.weekLabel}: ${week.totalRunners} runners across ${week.runCount} run${week.runCount !== 1 ? 's' : ''}`}
                                >
                                  <span style={{ fontSize: '10px', color: 'var(--gray-600)', fontWeight: '600' }}>
                                    {week.totalRunners > 0 ? week.totalRunners : ''}
                                  </span>
                                  <div
                                    style={{
                                      width: '100%',
                                      background: week.weekStart === selectedWeekStart
                                        ? 'var(--red-primary)'
                                        : 'var(--gray-300)',
                                      borderRadius: '3px 3px 0 0',
                                      height: `${Math.max((week.totalRunners / maxTotal) * 100, week.totalRunners > 0 ? 4 : 0)}%`,
                                      transition: 'background 0.2s',
                                      minHeight: week.totalRunners > 0 ? '4px' : '0',
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            {/* X-axis labels — every 4 weeks to avoid crowding */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {weeklyTrend.map((week, i) => (
                                <div key={week.weekStart} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--gray-500)', overflow: 'hidden' }}>
                                  {i % 4 === 0 ? week.weekLabel : ''}
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Trend table — most recent first */}
                  <div className="table-container" style={{ marginTop: '16px' }}>
                    <table className="member-table">
                      <thead className="member-table__header">
                        <tr>
                          <th className="member-table__header-cell">Week of</th>
                          <th className="member-table__header-cell" style={{ textAlign: 'right' }}>Runs</th>
                          <th className="member-table__header-cell" style={{ textAlign: 'right' }}>Total Runners</th>
                          <th className="member-table__header-cell" style={{ textAlign: 'right' }}>Avg per Run</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...weeklyTrend].reverse().map(week => (
                          <tr
                            key={week.weekStart}
                            className="member-table__row"
                            style={week.weekStart === selectedWeekStart ? { background: '#fef2f2' } : {}}
                          >
                            <td className="member-table__cell member-table__cell--small-gray">
                              {week.weekLabel}
                              {week.weekStart === selectedWeekStart && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--red-primary)', fontWeight: '600' }}>← selected</span>
                              )}
                            </td>
                            <td className="member-table__cell" style={{ textAlign: 'right' }}>{week.runCount}</td>
                            <td className="member-table__cell" style={{ textAlign: 'right', fontWeight: '600' }}>{week.totalRunners}</td>
                            <td className="member-table__cell" style={{ textAlign: 'right', color: 'var(--gray-600)' }}>{week.averagePerRun}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button onClick={fetchAllData} className="btn btn-primary">
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default AdminReports;
