import React, { useState, useEffect } from 'react';
import { ScheduledRunsService } from '../services/scheduledRunsService';
import { useAuth } from '../../auth/context/AuthContext';

interface CreateScheduledRunFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ScheduledRunData {
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance: string;
  max_participants: number;
  description: string;
  is_recurring: boolean;
  weekly_recurrences: number;
  lirfs_required: number;
  assigned_lirf_1: string;
  assigned_lirf_2: string;
  assigned_lirf_3: string;
}

export const CreateScheduledRunForm: React.FC<CreateScheduledRunFormProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const { state } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lirfs, setLirfs] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<ScheduledRunData>({
    run_title: '',
    run_date: '',
    run_time: '19:00', // Default 7pm
    meeting_point: '',
    approximate_distance: '',
    max_participants: 20,
    description: '',
    is_recurring: false,
    weekly_recurrences: 1,
    lirfs_required: 1,
    assigned_lirf_1: '',
    assigned_lirf_2: '',
    assigned_lirf_3: ''
  });

  // Load available LIRFs
  useEffect(() => {
    loadLirfs();
  }, []);

  const loadLirfs = async () => {
    try {
      const availableLirfs = await ScheduledRunsService.getAvailableLirfs();
      setLirfs(availableLirfs);
    } catch (error) {
      console.error('Failed to load LIRFs:', error);
      setLirfs([]); // Fallback to empty array
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
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

  const calculateEndDate = (startDate: string, recurrences: number): string => {
    if (!startDate || recurrences <= 1) return startDate;
    
    const [year, month, day] = startDate.split('-').map(Number);
    const weeksToAdd = (recurrences - 1) * 7;
    const endDate = new Date(year, month - 1, day + weeksToAdd);
    return endDate.toISOString().split('T')[0];
  };

  // Generate individual runs for weekly recurrence
  const generateWeeklyRuns = (baseData: ScheduledRunData) => {
    const runs = [];
    if (!state.user?.id) {
       throw new Error('User must be logged in to create runs');
    }
    
    if (!baseData.is_recurring) {
      // Single run
      return [{
        ...baseData,
        end_date: baseData.run_date,
        created_by: state.user?.id
      }];
    }

    // Parse date properly to avoid timezone issues
    const [year, month, day] = baseData.run_date.split('-').map(Number);
    
    for (let week = 0; week < baseData.weekly_recurrences; week++) {
      // Create new date for each week
      const runDate = new Date(year, month - 1, day + (week * 7));
      const formattedDate = runDate.toISOString().split('T')[0];
      
      runs.push({
        ...baseData,
        run_date: formattedDate,
        end_date: formattedDate,
        created_by: state.user?.id
      });
    }
    
    return runs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const runsToCreate = generateWeeklyRuns(formData);
      
      // Show confirmation for recurring runs
      if (formData.is_recurring && runsToCreate.length > 1) {
        const confirmed = window.confirm(`This will create ${runsToCreate.length} individual run entries (one per week). Continue?`);
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      //console.log('Creating scheduled runs:', runsToCreate);
      
      // Create each run individually
      for (const runData of runsToCreate) {
        await ScheduledRunsService.createScheduledRun(runData);
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create scheduled run(s)');
    } finally {
      setLoading(false);
    }
  };

  // Only admins can create recurring runs
//  const canCreateRecurring = state.member?.access_level === 'admin';
const { permissions } = useAuth();

// Then use permissions instead of state.member checks:
const canCreateRecurring = permissions.accessLevel === 'admin';

  // Preview runs for recurring
  const previewRuns = () => {
    if (!formData.is_recurring || !formData.run_date) return [];
    return generateWeeklyRuns(formData);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Create New Scheduled Run</h3>
        <p className="card-description">Set up a new running session for club members</p>
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
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-input"
                rows={3}
                placeholder="Run description, route info, what to bring..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Recurrence Settings (Admin Only) */}
          {canCreateRecurring && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
                🔄 Recurrence Settings
              </h4>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleInputChange}
                  />
                  <span className="form-label" style={{ margin: 0 }}>Make this a recurring weekly run</span>
                </label>
              </div>

              {formData.is_recurring && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="weekly_recurrences">Number of Weeks</label>
                    <select
                      id="weekly_recurrences"
                      name="weekly_recurrences"
                      value={formData.weekly_recurrences}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      <option value={2}>2 weeks</option>
                      <option value={3}>3 weeks</option>
                      <option value={4}>4 weeks</option>
                      <option value={6}>6 weeks</option>
                      <option value={8}>8 weeks</option>
                      <option value={12}>12 weeks</option>
                    </select>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      Will run for {formData.weekly_recurrences} weeks, ending on {calculateEndDate(formData.run_date, formData.weekly_recurrences)}
                    </div>
                  </div>

                  {/* Preview of runs to be created */}
                  {formData.run_date && (
                    <div style={{ 
                      background: '#f9fafb', 
                      padding: '16px', 
                      borderRadius: '6px', 
                      border: '1px solid #e5e7eb',
                      marginTop: '16px'
                    }}>
                      <h5 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>
                        Preview ({previewRuns().length} runs will be created)
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {previewRuns().slice(0, 5).map((run, index) => (
                          <div key={index} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            padding: '8px', 
                            background: 'white', 
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}>
                            <strong>{run.run_title}</strong>
                            <span>{new Date(run.run_date + 'T00:00:00').toLocaleDateString()} at {run.run_time}</span>
                          </div>
                        ))}
                        {previewRuns().length > 5 && (
                          <div style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                            ... and {previewRuns().length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

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
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
              {loading ? 'Creating...' : `Create ${formData.is_recurring ? `${previewRuns().length} ` : ''}Run${formData.is_recurring && previewRuns().length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateScheduledRunForm;