import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { BookingService } from '../../admin/services/bookingService';
import { supabase } from '../../../services/supabase';

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_conditions?: string;
}

interface BookingWithMember {
  id: string;
  run_id: string;
  member_id: string;
  booked_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  attended?: boolean;
  attendance_marked_by?: string;
  attendance_marked_at?: string;
  member?: Member;
  is_manual_addition?: boolean; // For manually added runners
}

interface AttendanceRecord {
  id?: string;
  run_id: string;
  member_id: string;
  marked_present: boolean;
  marked_at?: string;
  marked_by: string;
  notes?: string;
  is_manual_addition?: boolean;
}

interface ManualRunner {
  full_name: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  health_conditions: string;
}

interface RunAttendanceProps {
  runId: string;
  runTitle: string;
  onBack: () => void;
}

export const RunAttendance: React.FC<RunAttendanceProps> = ({ runId, runTitle, onBack }) => {
  const { state } = useAuth();
  const [bookings, setBookings] = useState<BookingWithMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Add Runner Modal State
  const [showAddRunner, setShowAddRunner] = useState(false);
  const [addRunnerType, setAddRunnerType] = useState<'member' | 'manual'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [manualRunner, setManualRunner] = useState<ManualRunner>({
    full_name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    health_conditions: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRunData();
    loadAllMembers();
  }, [runId]);

        const loadRunData = async () => {
          try {
            setLoading(true);
            setError('');

            // Reset states in proper order
            setBookings([]);
            setAttendance([]);

            // Load bookings for this run
            const runBookings = await BookingService.getRunBookings(runId);
            const activeBookings = runBookings.filter(b => !b.cancelled_at);

            // Get member details for bookings
            const bookingsWithMembers: BookingWithMember[] = await Promise.all(
              activeBookings.map(async (booking) => {
                try {
                  const member = await getMemberDetails(booking.member_id);
                  return {
                    ...booking,
                    member: member || {
                      id: booking.member_id,
                      full_name: 'Unknown Member',
                      email: '',
                      phone: ''
                    }
                  };
                } catch (error) {
                  console.error('Error processing member booking:', error);
                  return {
                    ...booking,
                    member: {
                      id: booking.member_id,
                      full_name: 'Unknown Member',
                      email: '',
                      phone: ''
                    }
                  };
                }
              })
            );

            // Set bookings first
            setBookings(bookingsWithMembers);

            // Then load attendance records and sync
            await loadAttendanceRecordsSync(bookingsWithMembers);

          } catch (error) {
            console.error('Error loading run data:', error);
            setError('Failed to load run data');
          } finally {
            setLoading(false);
          }
        };


  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, email, phone, emergency_contact_name, emergency_contact_phone, health_conditions')
        .eq('membership_status', 'active')
        .order('full_name');
      
      if (error) throw error;
      setAllMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const getMemberDetails = async (memberId: string): Promise<Member | undefined> => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching member details:', error);
      return undefined;
    }
  };

  const loadAttendanceRecordsSync = async (currentBookings: BookingWithMember[]) => {
  try {
    const { data, error } = await supabase
      .from('run_attendance')
      .select('*')
      .eq('run_id', runId);
    
    if (error) throw error;
    
    const attendanceRecords = data || [];
    setAttendance(attendanceRecords);

    // Add manually added runners that aren't in current bookings
    const manualAttendees = attendanceRecords.filter(record => 
      record.is_manual_addition && 
      !currentBookings.find(booking => booking.member_id === record.member_id)
    );

    if (manualAttendees.length > 0) {
      // Get member details for manual attendees
      const manualBookings: BookingWithMember[] = await Promise.all(
        manualAttendees.map(async (record) => {
          const member = await getMemberDetails(record.member_id);
          return {
            id: `manual-${record.member_id}`,
            run_id: runId,
            member_id: record.member_id,
            booked_at: record.marked_at || new Date().toISOString(),
            member,
            is_manual_addition: true
          };
        })
      );

      // Update bookings with manual additions
      setBookings(prev => [...prev, ...manualBookings]);
    }

  } catch (error) {
    console.error('Error loading attendance records:', error);
  }
};

  const markAttendance = async (memberId: string, present: boolean, notes?: string) => {
    if (!state.user?.id) return;

    try {
      setSaving(memberId);
      setError('');

      // Check if attendance record already exists
      const existingRecord = attendance.find(a => a.member_id === memberId);

      const attendanceData = {
        run_id: runId,
        member_id: memberId,
        marked_present: present,
        marked_at: new Date().toISOString(),
        marked_by: state.user.id,
        notes: notes || null,
        is_manual_addition: existingRecord?.is_manual_addition || false
      };

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('run_attendance')
          .update(attendanceData)
          .eq('id', existingRecord.id);
        
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('run_attendance')
          .insert([attendanceData]);
        
        if (error) throw error;
      }

      // Reload attendance records
      await loadRunData();

    } catch (err: any) {
      console.error('Failed to mark attendance:', err);
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(null);
    }
  };

  const addExistingMember = async () => {
    if (!selectedMemberId || !state.user?.id) return;

    try {
      setSaving('adding-member');
      setError('');

      // Check if member is already in attendance
      const isAlreadyAdded = bookings.find(b => b.member_id === selectedMemberId);
      if (isAlreadyAdded) {
        setError('This member is already added to the run');
        return;
      }

      // Add attendance record as manual addition
      const attendanceData = {
        run_id: runId,
        member_id: selectedMemberId,
        marked_present: true,
        marked_at: new Date().toISOString(),
        marked_by: state.user.id,
        is_manual_addition: true
      };

      const { error } = await supabase
        .from('run_attendance')
        .insert([attendanceData]);
      
      if (error) throw error;

      // Reload data
      await loadRunData();
      
      // Reset form
      setSelectedMemberId('');
      setShowAddRunner(false);

    } catch (err: any) {
      console.error('Failed to add member:', err);
      setError(err.message || 'Failed to add member');
    } finally {
      setSaving(null);
    }
  };

  const addManualRunner = async () => {
    if (!manualRunner.full_name || !state.user?.id) return;

    try {
      setSaving('adding-manual');
      setError('');

      // Create a temporary member record for the manual runner
      const tempMember = {
        full_name: manualRunner.full_name,
        email: `temp-${Date.now()}@runalcester.temp`, // Temporary email
        phone: manualRunner.phone || null,
        emergency_contact_name: manualRunner.emergency_contact_name || null,
        emergency_contact_phone: manualRunner.emergency_contact_phone || null,
        health_conditions: manualRunner.health_conditions || null,
        membership_status: 'guest',
        is_temp_runner: true,
        date_joined: new Date().toISOString().split('T')[0] // Add required field
      };

      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert([tempMember])
        .select()
        .single();

      if (memberError) {
        console.error('Member creation error:', memberError);
        throw memberError;
      }

      // Add attendance record
      const attendanceData = {
        run_id: runId,
        member_id: newMember.id,
        marked_present: true,
        marked_at: new Date().toISOString(),
        marked_by: state.user.id,
        is_manual_addition: true
      };

      const { error: attendanceError } = await supabase
        .from('run_attendance')
        .insert([attendanceData]);
      
      if (attendanceError) {
        console.error('Attendance creation error:', attendanceError);
        throw attendanceError;
      }

      // Reload data
      await loadRunData();
      
      // Reset form
      setManualRunner({
        full_name: '',
        phone: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        health_conditions: ''
      });
      setShowAddRunner(false);

    } catch (err: any) {
      console.error('Failed to add manual runner:', err);
      setError(err.message || 'Failed to add runner');
    } finally {
      setSaving(null);
    }
  };

  const getAttendanceStatus = (memberId: string) => {
    const record = attendance.find(a => a.member_id === memberId);
    return record;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter members for search
  const filteredMembers = allMembers.filter(member => 
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !bookings.find(booking => booking.member_id === member.id)
  );

    const getUnifiedAttendanceData = () => {
      return bookings.map(booking => {
        const attendanceRecord = attendance.find(a => a.member_id === booking.member_id);
        return {
          booking,
          attendanceRecord,
          isPresent: attendanceRecord?.marked_present || false,
          isMarked: attendanceRecord !== undefined
        };
      });
    };
    const unifiedData = getUnifiedAttendanceData();
    const presentCount = unifiedData.filter(item => item.isPresent).length;
    const totalCount = unifiedData.length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading attendance data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <button 
            onClick={onBack}
            className="btn btn-secondary"
            style={{ fontSize: '14px' }}
          >
            ← Back to Lead Your Run
          </button>
          <h1 className="page-title">📝 Manage Attendance</h1>
        </div>
        <p className="page-description">
          Mark attendance for: <strong>{runTitle}</strong>
        </p>
      </div>

      {/* Summary Stats */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-primary)', marginBottom: '4px' }}>
                {presentCount}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Present</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--gray-500)', marginBottom: '4px' }}>
                {totalCount - presentCount}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Absent/Unknown</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--gray-700)', marginBottom: '4px' }}>
                {totalCount}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Total Runners</div>
            </div>
          </div>
        </div>
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

      {/* Add Runner Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowAddRunner(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ➕ Add Runner to Attendance
        </button>
      </div>

      {/* Member List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Runners ({bookings.length})</h3>
        </div>
        <div className="card-content">
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No Runners Yet</h3>
              <p style={{ margin: '0' }}>Add runners to start taking attendance.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.map((booking) => {
                const attendanceRecord = getAttendanceStatus(booking.member_id);
                const isPresent = attendanceRecord?.marked_present;
                const isMarked = attendanceRecord !== undefined;
                
                return (
                  <div 
                    key={booking.id}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px',
                      background: isPresent ? '#f0fdf4' : isMarked ? '#fef2f2' : 'var(--gray-50)',
                      borderRadius: '8px',
                      border: `1px solid ${isPresent ? '#bbf7d0' : isMarked ? '#fecaca' : 'var(--gray-200)'}`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: 'var(--gray-900)', 
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {booking.member?.full_name || 'Unknown Member'}
                        {booking.is_manual_addition && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            Added by LIRF
                          </span>
                        )}
                      </div>
                      {booking.member?.phone && (
                        <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                          📱 {booking.member.phone}
                        </div>
                      )}
                      {isMarked && attendanceRecord.marked_at && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                          Marked at {formatTime(attendanceRecord.marked_at)}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', minWidth: '180px' }}>
                      {/* Emergency Info Button */}
                      {booking.member && isPresent && (
                        <button
                          onClick={() => setSelectedMember(booking.member!)}
                          className="btn btn-secondary"
                          style={{ 
                            fontSize: '12px',
                            padding: '6px 12px',
                            background: '#fff7ed',
                            borderColor: '#fed7aa',
                            color: '#ea580c',
                            width: '100%'
                          }}
                        >
                          🚨 Emergency Info
                        </button>
                      )}

                      {/* Attendance Buttons */}
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button
                          onClick={() => markAttendance(booking.member_id, true)}
                          disabled={saving === booking.member_id}
                          className="btn btn-success"
                          style={{ 
                            fontSize: '14px',
                            background: isPresent ? '#16a34a' : '#22c55e',
                            borderColor: isPresent ? '#16a34a' : '#22c55e',
                            opacity: isPresent ? 1 : 0.8,
                            flex: 1
                          }}
                        >
                          {saving === booking.member_id ? '⏳' : '✅'} Present
                        </button>

                        <button
                          onClick={() => markAttendance(booking.member_id, false)}
                          disabled={saving === booking.member_id}
                          className="btn btn-secondary"
                          style={{ 
                            fontSize: '14px',
                            background: isMarked && !isPresent ? '#dc2626' : '#ef4444',
                            borderColor: isMarked && !isPresent ? '#dc2626' : '#ef4444',
                            color: 'white',
                            opacity: isMarked && !isPresent ? 1 : 0.8,
                            flex: 1
                          }}
                        >
                          {saving === booking.member_id ? '⏳' : '❌'} Absent
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Runner Modal */}
      {showAddRunner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>➕ Add Runner to Attendance</h3>
              <button
                onClick={() => setShowAddRunner(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '20px', 
                  cursor: 'pointer',
                  color: 'var(--gray-500)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Runner Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setAddRunnerType('member')}
                  className={`btn ${addRunnerType === 'member' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  👥 Existing Member
                </button>
                <button
                  onClick={() => setAddRunnerType('manual')}
                  className={`btn ${addRunnerType === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  📝 New Runner
                </button>
              </div>
            </div>

            {addRunnerType === 'member' ? (
              /* Existing Member Form */
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Search Members:
                  </label>
                  <input
                    type="text"
                    placeholder="Type to search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px', maxHeight: '200px', overflow: 'auto' }}>
                  {filteredMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                      {searchTerm ? 'No members found' : 'Start typing to search for members'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredMembers.slice(0, 10).map(member => (
                        <div
                          key={member.id}
                          onClick={() => setSelectedMemberId(member.id)}
                          style={{
                            padding: '12px',
                            border: `2px solid ${selectedMemberId === member.id ? 'var(--red-primary)' : 'var(--gray-200)'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: selectedMemberId === member.id ? '#fef2f2' : 'white'
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            {member.full_name}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                            {member.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowAddRunner(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addExistingMember}
                    disabled={!selectedMemberId || saving === 'adding-member'}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {saving === 'adding-member' ? '⏳ Adding...' : 'Add Member'}
                  </button>
                </div>
              </div>
            ) : (
              /* Manual Runner Form */
              <div>
                <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={manualRunner.full_name}
                      onChange={(e) => setManualRunner(prev => ({ ...prev, full_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={manualRunner.phone}
                      onChange={(e) => setManualRunner(prev => ({ ...prev, phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={manualRunner.emergency_contact_name}
                      onChange={(e) => setManualRunner(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={manualRunner.emergency_contact_phone}
                      onChange={(e) => setManualRunner(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                      Health Conditions / Medical Notes
                    </label>
                    <textarea
                      value={manualRunner.health_conditions}
                      onChange={(e) => setManualRunner(prev => ({ ...prev, health_conditions: e.target.value }))}
                      placeholder="Any medical conditions, allergies, or other health information..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '6px',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowAddRunner(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addManualRunner}
                    disabled={!manualRunner.full_name || saving === 'adding-manual'}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {saving === 'adding-manual' ? '⏳ Adding...' : 'Add Runner'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Contact Modal */}
      {selectedMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--red-primary)' }}>
                🚨 Emergency Information
              </h3>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '20px', 
                  cursor: 'pointer',
                  color: 'var(--gray-500)'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--gray-900)' }}>
                {selectedMember.full_name}
              </h4>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                📧 {selectedMember.email}
              </div>
              {selectedMember.phone && (
                <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                  📱 <a 
                    href={`tel:${selectedMember.phone}`}
                    style={{ 
                      color: 'var(--red-primary)', 
                      textDecoration: 'none',
                      fontWeight: '600'
                    }}
                  >
                    {selectedMember.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#fef2f2', borderRadius: '6px' }}>
              <h5 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>Emergency Contact</h5>
              {selectedMember.emergency_contact_name ? (
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {selectedMember.emergency_contact_name}
                  </div>
                  {selectedMember.emergency_contact_phone && (
                    <div>
                      <a 
                        href={`tel:${selectedMember.emergency_contact_phone}`}
                        style={{ 
                          color: '#dc2626', 
                          textDecoration: 'none',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}
                      >
                        📞 {selectedMember.emergency_contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#7f1d1d', fontStyle: 'italic' }}>
                  No emergency contact on file
                </div>
              )}
            </div>

            {/* Medical Information */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#fff7ed', borderRadius: '6px' }}>
              <h5 style={{ margin: '0 0 12px 0', color: '#ea580c' }}>Medical Information</h5>
              {selectedMember.health_conditions ? (
                <div style={{ color: '#7c2d12' }}>
                  {selectedMember.health_conditions}
                </div>
              ) : (
                <div style={{ color: '#9a3412', fontStyle: 'italic' }}>
                  No medical conditions recorded
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};