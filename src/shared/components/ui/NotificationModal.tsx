import React from 'react';
import { Notification } from '../../../modules/communications/services/NotificationService';

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
  onDismiss?: () => void;
  onMarkAsRead?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  onClose,
  onDismiss,
  onMarkAsRead
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return '🚨';
    if (type === 'run_specific') return '🏃‍♂️';
    if (type === 'general') return '📢';
    return '📬';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { background: '#fef2f2', borderColor: '#dc2626', color: '#dc2626' };
      case 'high':
        return { background: '#fef3c7', borderColor: '#f59e0b', color: '#f59e0b' };
      default:
        return { background: '#f9fafb', borderColor: '#e5e7eb', color: '#6b7280' };
    }
  };

  const priorityStyle = getPriorityColor(notification.priority);
  const isUnread = !notification.read_at;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <span style={{ fontSize: '24px' }}>
              {getNotificationIcon(notification.type, notification.priority)}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--gray-900)'
                }}>
                  {notification.title}
                </h2>
                {isUnread && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--red-primary)'
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  background: notification.type === 'run_specific' ? '#dcfce7' : '#e0f2fe',
                  color: notification.type === 'run_specific' ? '#166534' : '#0369a1',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {notification.type === 'run_specific' ? 'Run Specific' : notification.type}
                </span>
                <span style={{
                  background: priorityStyle.background,
                  color: priorityStyle.color,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'uppercase'
                }}>
                  {notification.priority}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-400)',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--gray-600)';
              e.currentTarget.style.background = 'var(--gray-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--gray-400)';
              e.currentTarget.style.background = 'none';
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <div style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'var(--gray-700)',
            marginBottom: '24px',
            whiteSpace: 'pre-wrap'
          }}>
            {notification.message}
          </div>

          {/* Run Information */}
          {notification.run_title && (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-900)' }}>
                🏃‍♂️ Related Run
              </h4>
              <div style={{ color: 'var(--gray-700)' }}>
                <strong>{notification.run_title}</strong>
              </div>
              {notification.run_date && notification.run_time && (
                <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '4px' }}>
                  📅 {new Date(notification.run_date + 'T12:00:00').toLocaleDateString('en-GB')} at {notification.run_time}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div style={{
            fontSize: '14px',
            color: 'var(--gray-500)',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <strong>Sent:</strong> {formatDate(notification.sent_at)}
              </div>
              {notification.sender_name && (
                <div>
                  <strong>From:</strong> {notification.sender_name}
                </div>
              )}
              {notification.expires_at && (
                <div>
                  <strong>Expires:</strong> {formatDate(notification.expires_at)}
                </div>
              )}
              {notification.read_at && (
                <div>
                  <strong>Read:</strong> {formatDate(notification.read_at)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            {isUnread && onMarkAsRead && (
              <button
                onClick={onMarkAsRead}
                className="btn btn-secondary"
                style={{ fontSize: '14px' }}
              >
                Mark as Read
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="btn btn-secondary"
                style={{ fontSize: '14px' }}
              >
                Dismiss
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ fontSize: '14px' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};