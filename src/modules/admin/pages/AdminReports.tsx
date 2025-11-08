import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { PageHeader } from '@/shared/components/ui/PageHeader';

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
}

interface LirfLookAhead {
  date: string;
  runName: string;
  lirfAssigned: boolean;
  lirfName: string;
  runId: string;
}

interface PendingInvitation {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  expires_at: string;
  token: string;
}

export const AdminReports: React.FC = () => {
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
  });
  const [lirfLookAhead, setLirfLookAhead] = useState<LirfLookAhead[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [resending, setResending] = useState<string | null>(null);

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
        .in('status', ['pending', 'accepted']);

      if (error) throw error;

      const totalInvited = invitationStats?.length || 0;
      const registered = invitationStats?.filter((i) => i.status === 'accepted').length || 0;
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
      // Total users
      const { count: totalUsers, error: totalUsersError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      if (totalUsersError) {
        console.error('Error fetching total users:', totalUsersError);
        throw totalUsersError;
      }

      console.log('Total users count:', totalUsers);

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

      setUserMetrics({
        totalUsers: totalUsers || 0,
        activeUsers,
        bookingsThisMonth: bookingsThisMonth || 0,
        attendanceThisMonth: attendanceThisMonth || 0,
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
          assigned_lirf_3
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
        // Check if any LIRF is assigned
        const hasLirf = run.assigned_lirf_1 || run.assigned_lirf_2 || run.assigned_lirf_3;

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
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    setResending(invitationId);
    try {
      const invitation = pendingInvitations.find((inv) => inv.id === invitationId);
      if (!invitation) return;

      // Generate new token
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Update invitation with new token and reset expiry
      const { error: updateError } = await supabase
        .from('pending_invitations')
        .update({
          token: newToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      const registrationLink = `${window.location.origin}/register?token=${newToken}`;
      alert(`Invitation resent to ${invitation.email}\n\nNew registration link:\n${registrationLink}\n\n(Email functionality to be implemented)`);

      await fetchPendingInvitations();
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
                  lirfLookAhead.map((run) => (
                    <tr
                      key={run.runId}
                      className="member-table__row"
                      style={{ backgroundColor: run.lirfAssigned ? '#dcfce7' : '#fee2e2' }}
                    >
                      <td className="member-table__cell">{formatDate(run.date)}</td>
                      <td className="member-table__cell member-name">{run.runName}</td>
                      <td className="member-table__cell">
                        {run.lirfAssigned ? (
                          <span className="status-badge status-badge--active">Yes</span>
                        ) : (
                          <span className="status-badge status-badge--inactive">No</span>
                        )}
                      </td>
                      <td className="member-table__cell">{run.lirfName}</td>
                    </tr>
                  ))
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
        <h2 className="card-title">Pending Invitations</h2>
        <div className="card">
          <div className="table-container">
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell">Name</th>
                  <th className="member-table__header-cell">Email</th>
                  <th className="member-table__header-cell">Sent</th>
                  <th className="member-table__header-cell">Expires</th>
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
                  pendingInvitations.map((inv) => (
                    <tr key={inv.id} className="member-table__row">
                      <td className="member-table__cell member-name">{inv.full_name}</td>
                      <td className="member-table__cell">{inv.email}</td>
                      <td className="member-table__cell member-table__cell--small-gray">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="member-table__cell member-table__cell--small-gray">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      <td className="member-table__cell">
                        <div className="member-actions">
                          <button
                            onClick={() => resendInvitation(inv.id)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
