import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../modules/auth/hooks/useAuth';
import { ScheduledRunsService, ScheduledRun } from '../services/scheduledRunsService';
import { CreateScheduledRunForm } from './CreateScheduledRunForm';
import { EditScheduledRunForm } from './EditScheduledRunForm';

export const ManageScheduledRuns: React.FC = () => {
  const { state } = useAuth();
  const [runs, setRuns] = useState<ScheduledRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledRuns();
  }, []);

  const loadScheduledRuns = async () => {
    try {
      setLoading(true);
      const data = await ScheduledRunsService.getScheduledRuns();
      setRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load scheduled runs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadScheduledRuns(); // Refresh the list
  };

  // FIX #1: Added missing 'c' in 'const'
  const handleEditSuccess = () => {
    setShowEditForm(false);
    setEditingRunId(null);
    loadScheduledRuns(); // Refresh the list
  };

  const handleEditRun = (runId: string) => {
    setEditingRunId(runId);
    setShowEditForm(true);
  };

  const handleDeleteRun = async (runId: string, runTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${runTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await ScheduledRunsService.deleteScheduledRun(runId);
      loadScheduledRuns(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete scheduled run');
    }
  };

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

  if (showCreateForm) {
    return (
      <CreateScheduledRunForm 
        onSuccess={handleCreateSuccess}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  if (showEditForm && editingRunId) {
    return (
      <EditScheduledRunForm 
        runId={editingRunId}
        onSuccess={handleEditSuccess}
        onCancel={() => {
          setShowEditForm(false);
          setEditingRunId(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Scheduled Runs</h1>
        <p className="page-description">Create and manage running sessions for club members</p>
      </div>

      {/* Action Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Upcoming Runs ({runs.length})
          </h2>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>🏃‍♂️</span>
          Schedule a Run
        </button>
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

      {loading ? (
        <div className="card">
          <div className="card-content">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div>Loading scheduled runs...</div>
            </div>
          </div>
        </div>
      ) : runs.length === 0 ? (
        <div className="card">
          <div className="card-content">
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏃‍♂️</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No Scheduled Runs</h3>
              <p style={{ margin: '0 0 20px 0' }}>Get started by creating your first scheduled run</p>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary"
              >
                Schedule a Run
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {runs.map((run) => (
            <div key={run.id} className="card">
              <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px', 
                      fontWeight: '600',
                      color: 'var(--red-primary)'
                    }}>
                      {run.run_title}
                    </h3>
                    
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
                          👥 Max: {run.max_participants}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                          👨‍🏫 {run.lirfs_required} LIRF{run.lirfs_required > 1 ? 's' : ''} required
                        </div>
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

                    {run.is_recurring && (
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'var(--red-light)',
                        color: 'var(--red-primary)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        🔄 Recurring ({run.weekly_recurrences} weeks)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    {/* FIX #2: Corrected the Edit button onClick */}
                    <button
                      onClick={() => handleEditRun(run.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      ✏️ Edit
                    </button>
                    
                    <button
                      onClick={() => {
                        // TODO: Implement manage bookings
                        console.log('Manage bookings:', run.id);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      📋 Bookings
                    </button>
                    
                    <button
                      onClick={() => handleDeleteRun(run.id, run.run_title)}
                      className="btn btn-secondary"
                      style={{ 
                        fontSize: '12px', 
                        padding: '6px 12px',
                        background: '#fef2f2',
                        borderColor: '#fecaca',
                        color: '#dc2626'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageScheduledRuns;