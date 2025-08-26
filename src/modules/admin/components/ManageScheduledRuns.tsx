// Updated ManageScheduledRuns.tsx with delete restrictions
// Replace src/modules/admin/components/ManageScheduledRuns.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { ScheduledRunsService, ScheduledRun } from '../services/scheduledRunsService';
import { CreateScheduledRunForm } from './CreateScheduledRunForm';
import { EditScheduledRunForm } from './EditScheduledRunForm';

export const ManageScheduledRuns: React.FC = () => {
  const { state, permissions } = useAuth();
  const [runs, setRuns] = useState<ScheduledRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [deletableRuns, setDeletableRuns] = useState<string[]>([]);

  useEffect(() => {
    loadScheduledRuns();
  }, []);

  useEffect(() => {
    // Load deletable runs when user or runs change
    if (state.user && runs.length > 0) {
      loadDeletableRuns();
    }
  }, [state.user, runs, permissions.accessLevel]);

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

  const loadDeletableRuns = async () => {
    if (!state.user?.id || !permissions.accessLevel) return;
    
    try {
      const deletableRunIds = await ScheduledRunsService.getDeletableRuns(
        state.user.id, 
        permissions.accessLevel
      );
      setDeletableRuns(deletableRunIds);
    } catch (err) {
      console.error('Failed to load deletable runs:', err);
      setDeletableRuns([]);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadScheduledRuns();
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setEditingRunId(null);
    loadScheduledRuns();
  };

  const handleEditRun = (runId: string) => {
    setEditingRunId(runId);
    setShowEditForm(true);
  };

  const handleDeleteRun = async (runId: string, runTitle: string) => {
    // Check if run is deletable first
    if (!deletableRuns.includes(runId)) {
      setError('You cannot delete this run. It may have started/completed or you may not have permission.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${runTitle}"? This action cannot be undone.`)) {
      return;
    }

    if (!state.user?.id || !permissions.accessLevel) {
      setError('Authentication error. Please log in again.');
      return;
    }

    try {
      await ScheduledRunsService.deleteScheduledRun(runId, state.user.id, permissions.accessLevel);
      loadScheduledRuns(); // This will also refresh deletable runs
    } catch (err: any) {
      setError(err.message || 'Failed to delete scheduled run');
    }
  };

  // Helper function to determine if delete button should be shown
  const canDeleteRun = (runId: string) => {
    return deletableRuns.includes(runId);
  };

  // Helper function to get delete button tooltip
  const getDeleteTooltip = (run: ScheduledRun) => {
    if (run.run_status === 'in_progress') {
      return 'Cannot delete a run that has started';
    }
    if (run.run_status === 'completed') {
      return 'Cannot delete a completed run';
    }
    if (permissions.accessLevel === 'lirf' && run.created_by !== state.user?.id) {
      return 'You can only delete runs you created';
    }
    if (permissions.accessLevel === 'member') {
      return 'You do not have permission to delete runs';
    }
    return 'Delete this run';
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
      <div className="page-header mobile-center">
        <h1 className="page-title">Manage Scheduled Runs</h1>
        <p className="page-description">Create and manage running sessions for club members</p>
      </div>

      {/* Action Bar with responsive classes */}
      <div className="responsive-header">
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
          <span className="mobile-hide-text">Schedule a Run</span>
          <span className="mobile-show-text">Schedule</span>
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
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
              <h3 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>No Runs Scheduled</h3>
              <p style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
                There are no runs scheduled yet. Create your first one!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {runs.map((run) => (
            <div key={run.id} className="card">
              <div className="card-content" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>
                      {run.run_title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📅 {formatDate(run.run_date)}
                      </span>
                      <span style={{ color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🕐 {formatTime(run.run_time)}
                      </span>
                      <span style={{
                        background: run.run_status === 'scheduled' ? '#f3f4f6' : 
                                   run.run_status === 'in_progress' ? '#fef3c7' :
                                   run.run_status === 'completed' ? '#dcfce7' : '#fee2e2',
                        color: run.run_status === 'scheduled' ? '#6b7280' : 
                               run.run_status === 'in_progress' ? '#92400e' :
                               run.run_status === 'completed' ? '#166534' : '#dc2626',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {run.run_status === 'scheduled' ? 'Scheduled' :
                         run.run_status === 'in_progress' ? 'In Progress' :
                         run.run_status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleEditRun(run.id)}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ✏️ <span className="mobile-hide-text">Edit</span>
                    </button>
                    
                    {canDeleteRun(run.id) ? (
                      <button
                        onClick={() => handleDeleteRun(run.id, run.run_title)}
                        className="btn btn-danger"
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={getDeleteTooltip(run)}
                      >
                        🗑️ <span className="mobile-hide-text">Delete</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: 0.5,
                          cursor: 'not-allowed'
                        }}
                        title={getDeleteTooltip(run)}
                        disabled
                      >
                        🗑️ <span className="mobile-hide-text">Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <strong>Meeting Point:</strong><br />
                    <span style={{ color: 'var(--gray-600)' }}>{run.meeting_point}</span>
                  </div>
                  {run.approximate_distance && (
                    <div>
                      <strong>Distance:</strong><br />
                      <span style={{ color: 'var(--gray-600)' }}>{run.approximate_distance}</span>
                    </div>
                  )}
                  <div>
                    <strong>Max Participants:</strong><br />
                    <span style={{ color: 'var(--gray-600)' }}>{run.max_participants}</span>
                  </div>
                  <div>
                    <strong>LIRFs Required:</strong><br />
                    <span style={{ color: 'var(--gray-600)' }}>{run.lirfs_required}</span>
                  </div>
                </div>

                {run.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Description:</strong><br />
                    <span style={{ color: 'var(--gray-600)' }}>{run.description}</span>
                  </div>
                )}

                <div style={{ fontSize: '14px', color: 'var(--gray-500)', borderTop: '1px solid var(--gray-200)', paddingTop: '12px' }}>
                  Created {new Date(run.created_at).toLocaleDateString('en-GB')}
                  {permissions.accessLevel === 'admin' && (
                    <span> • Created by: {run.created_by_name || run.created_by}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};