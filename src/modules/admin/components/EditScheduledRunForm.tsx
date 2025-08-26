import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ScheduledRunsService } from '../services/scheduledRunsService';
import { EnhancedDescriptionEditor } from './EnhancedDescriptionEditor';

interface EditScheduledRunFormProps {
  runId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ScheduledRunData {
  id: string;
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance: string;
  max_participants: number;
  description: string;
  lirfs_required: number;
  assigned_lirf_1?: string;
  assigned_lirf_2?: string;
  assigned_lirf_3?: string;
}

export const EditScheduledRunForm: React.FC<EditScheduledRunFormProps> = ({ 
  runId,
  onSuccess, 
  onCancel 
}) => {
  const { state, permissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingRun, setLoadingRun] = useState(true);
  const [error, setError] = useState('');
  const [lirfs, setLirfs] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<ScheduledRunData>({
    id: '',
    run_title: '',
    run_date: '',
    run_time: '',
    meeting_point: '',
    approximate_distance: '',
    max_participants: 20,
    description: '',
    lirfs_required: 1,
    assigned_lirf_1: '',
    assigned_lirf_2: '',
    assigned_lirf_3: ''
  });

  // Load the run data and available LIRFs
  useEffect(() => {
    loadRunData();
    loadLirfs();
  }, [runId]);

  const loadRunData = async () => {
    try {
      setLoadingRun(true);
      const runData = await ScheduledRunsService.getScheduledRun(runId);
      
      setFormData({
        id: runData.id,
        run_title: runData.run_title || '',
        run_date: runData.run_date || '',
        run_time: runData.run_time || '',
        meeting_point: runData.meeting_point || '',
        approximate_distance: runData.approximate_distance || '',
        max_participants: runData.max_participants || 20,
        description: runData.description || '',
        lirfs_required: runData.lirfs_required || 1,
        assigned_lirf_1: runData.assigned_lirf_1 || '',
        assigned_lirf_2: runData.assigned_lirf_2 || '',
        assigned_lirf_3: runData.assigned_lirf_3 || ''
      });
    } catch (error) {
      console.error('Failed to load run data:', error);
      setError('Failed to load run data');
    } finally {
      setLoadingRun(false);
    }
  };

  const loadLirfs = async () => {
    try {
      const availableLirfs = await ScheduledRunsService.getAvailableLirfs();
      setLirfs(availableLirfs);
    } catch (error) {
      console.error('Failed to load LIRFs:', error);
      setLirfs([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    // Clean up the form data - remove empty string UUIDs
    const cleanFormData = { ...formData };
    
    // Remove empty LIRF assignments
    if (cleanFormData.assigned_lirf_1 === '') delete cleanFormData.assigned_lirf_1;
    if (cleanFormData.assigned_lirf_2 === '') delete cleanFormData.assigned_lirf_2;
    if (cleanFormData.assigned_lirf_3 === '') delete cleanFormData.assigned_lirf_3;

    const updateData = {
      ...cleanFormData,
      updated_at: new Date().toISOString(),
      ...(state.user?.id && state.user.id.trim() !== '' && { updated_by: state.user.id })
    };

    //console.log('Clean update data:', updateData);
    
    await ScheduledRunsService.updateScheduledRun(runId, updateData);
    
    onSuccess();
  } catch (err: any) {
    setError(err.message || 'Failed to update scheduled run');
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this run? This action cannot be undone.')) {
      return;
    }
    if (!state.user?.id || !permissions.accessLevel) {
      setError('Authentication error. Please log in again.');
      return;
    }
    try {
      setLoading(true);
      
      await ScheduledRunsService.deleteScheduledRun(
        runId,   
        state.user.id, 
        permissions.accessLevel);
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete scheduled run');
      setLoading(false);
    }
  };

  if (loadingRun) {
    return (
      <div className="card">
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading run details...
          </div>
        </div>
      </div>
    );
  }
const handleDescriptionChange = (value: string) => {
  setFormData(prev => ({
    ...prev,
    description: value
  }));
};
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Edit Scheduled Run</h3>
        <p className="card-description">Modify the details of this scheduled run</p>
      </div>
      
      <div className="card-content">
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

        <form onSubmit={handleSubmit}>
          {/* Basic Run Information */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
              🏃‍♂️ Run Details
            </h4>
            
            <div className="form-group">
              <label className="form-label" htmlFor="run_title">Run Title *</label>
              <input
                type="text"
                id="run_title"
                name="run_title"
                value={formData.run_title}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g. Tuesday Evening 5K"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="run_date">Date *</label>
                <input
                  type="date"
                  id="run_date"
                  name="run_date"
                  value={formData.run_date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="run_time">Time *</label>
                <input
                  type="time"
                  id="run_time"
                  name="run_time"
                  value={formData.run_time}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="meeting_point">Meeting Point *</label>
              <input
                type="text"
                id="meeting_point"
                name="meeting_point"
                value={formData.meeting_point}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g. Village Hall Car Park"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="approximate_distance">Distance</label>
                <input
                  type="text"
                  id="approximate_distance"
                  name="approximate_distance"
                  value={formData.approximate_distance}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g. 5K, 3 miles"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="max_participants">Max Participants</label>
                <input
                  type="number"
                  id="max_participants"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  className="form-input"
                  min="1"
                  max="50"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Description</label>
              <EnhancedDescriptionEditor
                id="description"
                name="description"
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="Run description, route info, what to bring..."
                rows={6}
              />
            </div>
          </div>

          {/* LIRF Assignment */}
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
              👥 LIRF Assignment
            </h4>
            
            <div className="form-group">
              <label className="form-label" htmlFor="lirfs_required">LIRFs Required</label>
              <select
                id="lirfs_required"
                name="lirfs_required"
                value={formData.lirfs_required}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value={1}>1 LIRF</option>
                <option value={2}>2 LIRFs</option>
                <option value={3}>3 LIRFs</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="assigned_lirf_1">LIRF 1</label>
                <select
                  id="assigned_lirf_1"
                  name="assigned_lirf_1"
                  value={formData.assigned_lirf_1}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="">Select LIRF...</option>
                  {lirfs.map(lirf => (
                    <option key={lirf.id} value={lirf.id}>{lirf.full_name}</option>
                  ))}
                </select>
              </div>

              {formData.lirfs_required >= 2 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="assigned_lirf_2">LIRF 2</label>
                  <select
                    id="assigned_lirf_2"
                    name="assigned_lirf_2"
                    value={formData.assigned_lirf_2}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="">Select LIRF...</option>
                    {lirfs.map(lirf => (
                      <option key={lirf.id} value={lirf.id}>{lirf.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.lirfs_required >= 3 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="assigned_lirf_3">LIRF 3</label>
                  <select
                    id="assigned_lirf_3"
                    name="assigned_lirf_3"
                    value={formData.assigned_lirf_3}
                    onChange={handleInputChange}
                    className="form-input"
                  >
                    <option value="">Select LIRF...</option>
                    {lirfs.map(lirf => (
                      <option key={lirf.id} value={lirf.id}>{lirf.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={loading}
              style={{ 
                background: '#dc2626', 
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Deleting...' : 'Delete Run'}
            </button>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Run'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditScheduledRunForm;