import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
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
}

interface AttendanceRecord {
  id?: string;
  run_id: string;
  member_id: string;
  marked_present: boolean;
  marked_at?: string;
  marked_by: string;
  notes?: string;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadRunData();
  }, [runId]);

  const loadRunData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load bookings for this run
      const runBookings = await BookingService.getRunBookings(runId);
      const activeBookings = runBookings.filter(b => !b.cancelled_at);

      // Get member details for each booking
      const bookingsWithMembers: BookingWithMember[] = await Promise.all(
        activeBookings.map(async (booking) => {
          try {
            const member = await getMemberDetails(booking.member_id);
            return {
              ...booking,
              member
            };
          } catch (error) {
            console.error('Error loading member details:', error);
            return {
              ...booking,
              member: undefined
            };
          }
        })
      );

      setBookings(bookingsWithMembers);

      // Load existing attendance records
      await loadAttendanceRecords();

    } catch (err: any) {
      console.error('Failed to load run data:', err);
      setError(err.message || 'Failed to load run data');
    } finally {
      setLoading(false);
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

  const loadAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('run_attendance')
        .select('*')
        .eq('run_id', runId);
      
      if (error) throw error;
      setAttendance(data || []);
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
        notes: notes || null
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
      await loadAttendanceRecords();

    } catch (err: any) {
      console.error('Failed to mark attendance:', err);
      setError(err.message || 'Failed to mark attendance');
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

  const presentCount = attendance.filter(a => a.marked_present).length;
  const totalCount = bookings.length;

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
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Total Booked</div>
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

      {/* Member List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Booked Members</h3>
        </div>
        <div className="card-content">
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No Members Booked</h3>
              <p style={{ margin: '0' }}>No one has booked this run yet.</p>
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
                      <div style={{ fontWeight: '600', color: 'var(--gray-900)', marginBottom: '4px' }}>
                        {booking.member?.full_name || 'Unknown Member'}
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