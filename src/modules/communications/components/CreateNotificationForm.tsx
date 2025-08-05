import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { NotificationService, CreateNotificationData } from '../services/NotificationService';
import { renderTextWithLinks } from '../../../utils/linkHelper'; // Adjust path as needed

interface CreateNotificationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateNotificationForm: React.FC<CreateNotificationFormProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const { permissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignedRuns, setAssignedRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    canSend: boolean;
    remaining: number;
    total: number;
  }>({ canSend: true, remaining: 500, total: 500 });
  
  const [formData, setFormData] = useState<CreateNotificationData>({
    title: '',
    message: '',
    type: 'run_specific',
    priority: 'normal',
    run_id: '',
    scheduled_for: '',
    expires_at: '',
    send_email: true // NEW: Default to sending emails
  });

  useEffect(() => {
    if (formData.type === 'run_specific') {
      loadAssignedRuns();
    }
    loadEmailStatus();
  }, [formData.type]);

  const loadAssignedRuns = async () => {
    try {
      setLoadingRuns(true);
      const runs = await NotificationService.getAssignedRuns();
      setAssignedRuns(runs);
    } catch (error) {
      console.error('Failed to load assigned runs:', error);
      setAssignedRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  };

  const loadEmailStatus = async () => {
    try {
      const status = await NotificationService.getEmailSendingStatus();
      setEmailStatus(status);
    } catch (error) {
      console.error('Failed to load email status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear run_id when changing type
    if (name === 'type' && value !== 'run_specific') {
      setFormData(prev => ({
        ...prev,
        run_id: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.message.trim()) {
        throw new Error('Message is required');
      }
      if (formData.type === 'run_specific' && !formData.run_id) {
        throw new Error('Please select a run');
      }

      // Create notification
      await NotificationService.createNotification({
        ...formData,
        title: formData.title.trim(),
        message: formData.message.trim(),
        run_id: formData.type === 'run_specific' ? formData.run_id : undefined,
        scheduled_for: formData.scheduled_for || undefined,
        expires_at: formData.expires_at || undefined,
        send_email: formData.send_email
      });
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const getTypeDescription = () => {
    switch (formData.type) {
      case 'run_specific':
        return 'Send to members booked on a specific run you are assigned to lead';
      case 'general':
        return 'Send to all active club members (Admin only)';
      case 'urgent':
        return 'High priority message to all active club members (Admin only)';
      default:
        return '';
    }
  };

  const getRecipientCount = () => {
    if (formData.type === 'run_specific' && formData.run_id) {
      const selectedRun = assignedRuns.find(run => run.id === formData.run_id);
      return selectedRun?.bookings_count || 0;
    }
    return null;
  };

  // Fix the priority display issue
  const currentPriority = formData.priority || 'normal';

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Create New Notification</h3>
        <p className="card-description">Send messages to club members</p>
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
          {/* Notification Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="type">Notification Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="run_specific">Run-Specific Message</option>
              {permissions.accessLevel === 'admin' && (
                <>
                  <option value="general">General Announcement</option>
                  <option value="urgent">Urgent Announcement</option>
                </>
              )}
            </select>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
              {getTypeDescription()}
            </div>
          </div>

          {/* Run Selection (for run-specific notifications) */}
          {formData.type === 'run_specific' && (
            <div className="form-group">
              <label className="form-label" htmlFor="run_id">Select Run</label>
              {loadingRuns ? (
                <div style={{ padding: '12px', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                  Loading your assigned runs...
                </div>
              ) : assignedRuns.length === 0 ? (
                <div style={{ 
                  padding: '12px', 
                  background: '#fef3c7', 
                  border: '1px solid #fcd34d', 
                  borderRadius: '6px',
                  color: '#92400e'
                }}>
                  You don't have any assigned upcoming runs to send notifications for.
                </div>
              ) : (
                <>
                  <select
                    id="run_id"
                    name="run_id"
                    value={formData.run_id}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select a run...</option>
                    {assignedRuns.map(run => (
                      <option key={run.id} value={run.id}>
                        {run.run_title} - {new Date(run.run_date + 'T12:00:00').toLocaleDateString('en-GB')} at {run.run_time}
                      </option>
                    ))}
                  </select>
                  {getRecipientCount() !== null && (
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      Will be sent to {getRecipientCount()} booked member{getRecipientCount() !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Email Notification Option */}
          <div className="form-group">
            <div style={{
              padding: '16px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  id="send_email"
                  name="send_email"
                  checked={formData.send_email || false}
                  onChange={handleInputChange}
                  style={{
                    marginTop: '2px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <label 
                    htmlFor="send_email" 
                    style={{
                      fontWeight: '500',
                      color: 'var(--gray-900)',
                      cursor: 'pointer',
                      display: 'block',
                      marginBottom: '4px'
                    }}
                  >
                    📧 Send Email Notifications
                  </label>
                  <div style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
                    Send email alerts to members who have email notifications enabled.
                    In-app notifications will be sent regardless of this setting.
                  </div>
                </div>
              </div>

              {/* Email Status Info */}
              <div style={{
                padding: '8px 12px',
                background: emailStatus.canSend ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${emailStatus.canSend ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <div style={{ 
                  color: emailStatus.canSend ? '#166534' : '#dc2626',
                  fontWeight: '500',
                  marginBottom: '2px'
                }}>
                  📊 Email Status: {emailStatus.remaining} of {emailStatus.total} emails remaining today
                </div>
                {!emailStatus.canSend && (
                  <div style={{ color: '#dc2626' }}>
                    ⚠️ Daily email limit reached. Only in-app notifications will be sent.
                  </div>
                )}
                {formData.send_email && emailStatus.canSend && (
                  <div style={{ color: '#166534' }}>
                    ✅ Emails will be sent to members with email notifications enabled
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="form-group">
            <label className="form-label" htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={currentPriority}
              onChange={handleInputChange}
              className="form-input"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              {permissions.accessLevel === 'admin' && (
                <option value="urgent">Urgent</option>
              )}
            </select>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g. Weather Update for Tonight's Run"
              maxLength={100}
              required
            />
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
              {formData.title.length}/100 characters
            </div>
          </div>

          {/* Message */}
          <div className="form-group">
            <label className="form-label" htmlFor="message">Message *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              className="form-input"
              rows={4}
              placeholder="Enter your message here..."
              maxLength={1000}
                 style={{ 
                resize: 'vertical',
                whiteSpace: 'pre-wrap',
                minHeight: '120px'
              }}
              required
            />
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
              {formData.message.length}/500 characters
            </div>
          </div>

          {/* Advanced Options */}
          <details style={{ marginBottom: '20px' }}>
            <summary style={{ 
              cursor: 'pointer', 
              fontWeight: '500', 
              color: 'var(--gray-700)',
              marginBottom: '12px'
            }}>
              ⚙️ Advanced Options
            </summary>
            
            <div style={{ paddingLeft: '20px', borderLeft: '3px solid var(--gray-200)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="scheduled_for">Schedule for Later</label>
                <input
                  type="datetime-local"
                  id="scheduled_for"
                  name="scheduled_for"
                  value={formData.scheduled_for}
                  onChange={handleInputChange}
                  className="form-input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                  Leave empty to send immediately
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="expires_at">Expires At</label>
                <input
                  type="datetime-local"
                  id="expires_at"
                  name="expires_at"
                  value={formData.expires_at}
                  onChange={handleInputChange}
                  className="form-input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                  Notification will be automatically hidden after this time
                </div>
              </div>
            </div>
          </details>
          {/* Preview */}
          {formData.title && formData.message && (
            <div style={{ 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: 'var(--gray-700)' }}>Preview:</h5>
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '12px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '8px' 
                }}>
                  <span>{formData.type === 'run_specific' ? '🏃‍♂️' : '📢'}</span>
                  <strong style={{ fontSize: '14px' }}>{formData.title}</strong>
                  {currentPriority !== 'normal' && (
                    <span style={{
                      background: currentPriority === 'urgent' ? '#fef2f2' : '#fef3c7',
                      color: currentPriority === 'urgent' ? '#dc2626' : '#f59e0b',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {currentPriority.toUpperCase()}
                    </span>
                  )}
                  {formData.send_email && (
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      📧 EMAIL
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--gray-600)',
                         whiteSpace: 'pre-wrap',    // NEW: Preserve line breaks and formatting
                  wordBreak: 'break-word'// NEW: Handle long words gracefully
                   }}>   
                  {renderTextWithLinks(formData.message)}
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || (formData.type === 'run_specific' && assignedRuns.length === 0)}
            >
              {loading ? 'Sending...' : `Send ${formData.scheduled_for ? 'Later' : 'Now'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};