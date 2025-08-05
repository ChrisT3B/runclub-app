import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { NotificationService, Notification } from '../services/NotificationService';
import { CreateNotificationForm } from './CreateNotificationForm';
import { renderTextWithLinks } from '../../../utils/linkHelper';

interface CommunicationsDashboardProps {
  onNavigate?: (page: string) => void;
}

export const CommunicationsDashboard: React.FC<CommunicationsDashboardProps> = ({ onNavigate }) => {
  const { permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'create' | 'history'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Always load user's personal notifications first (with proper read/dismissed filtering)
      const userNotifications = await NotificationService.getUserNotifications(50);
      setNotifications(userNotifications);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationCreated = () => {
    setActiveTab('notifications');
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      await NotificationService.dismissNotification(notificationId);
      // Remove from local state since it's dismissed
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: { bg: '#f3f4f6', color: '#6b7280' },
      normal: { bg: '#e0f2fe', color: '#0369a1' },
      high: { bg: '#fef3c7', color: '#f59e0b' },
      urgent: { bg: '#fef2f2', color: '#dc2626' }
    };
    
    const style = colors[priority as keyof typeof colors] || colors.normal;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '500',
        textTransform: 'uppercase'
      }}>
        {priority}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      run_specific: { bg: '#dcfce7', color: '#166534', text: 'Run Specific' },
      general: { bg: '#e0f2fe', color: '#0369a1', text: 'General' },
      urgent: { bg: '#fef2f2', color: '#dc2626', text: 'Urgent' }
    };
    
    const style = colors[type as keyof typeof colors] || colors.general;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {style.text}
      </span>
    );
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onNavigate?.('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-600)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--gray-900)';
              e.currentTarget.style.background = 'var(--gray-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--gray-600)';
              e.currentTarget.style.background = 'none';
            }}
            title="Back to Dashboard"
          >
            ← 
          </button>
          <div>
            <h1 className="page-title">📬 Communications</h1>
            <p className="page-description">
              {permissions.canManageRuns || permissions.canManageMembers 
                ? 'Send notifications and view communication history'
                : 'View your notifications and club announcements'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: '1px solid var(--gray-200)',
        paddingBottom: '16px'
      }}>
        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: activeTab === 'notifications' ? 'var(--red-primary)' : 'transparent',
            color: activeTab === 'notifications' ? 'white' : 'var(--gray-700)',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📬 Notifications
          {unreadCount > 0 && (
            <span style={{
              background: activeTab === 'notifications' ? 'rgba(255,255,255,0.3)' : 'var(--red-primary)',
              color: activeTab === 'notifications' ? 'white' : 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {(permissions.canManageRuns || permissions.canManageMembers) && (
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'create' ? 'var(--red-primary)' : 'transparent',
              color: activeTab === 'create' ? 'white' : 'var(--gray-700)',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ✏️ Create Notification
          </button>
        )}

        {(permissions.canManageMembers) && (
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'history' ? 'var(--red-primary)' : 'transparent',
              color: activeTab === 'history' ? 'white' : 'var(--gray-700)',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📊 History & Analytics
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Personal Notifications</h3>
            {notifications.length > 0 && (
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                {unreadCount > 0 ? `${unreadCount} unread of ${notifications.length}` : `${notifications.length} total`}
              </div>
            )}
          </div>
          <div className="card-content">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                Loading notifications...
              </div>
            ) : error ? (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#dc2626', 
                padding: '12px', 
                borderRadius: '6px'
              }}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-500)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
                <h3 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>No Notifications</h3>
                <p style={{ marginBottom: '20px' }}>
                  You don't have any notifications at the moment.
                </p>
                {(permissions.canManageRuns || permissions.canManageMembers) && (
                  <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                    Use the "Create Notification" tab to send messages to club members.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notifications.map((notification) => {
                  const isUnread = !notification.read_at;
                  
                  return (
                    <div 
                      key={notification.id}
                      style={{ 
                        padding: '20px',
                        background: isUnread ? '#fef9e7' : 'white',
                        borderRadius: '8px',
                        border: `1px solid ${isUnread ? '#fcd34d' : 'var(--gray-200)'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <span style={{ fontSize: '20px' }}>
                            {getNotificationIcon(notification.type, notification.priority)}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h4 style={{ 
                                margin: 0, 
                                fontWeight: isUnread ? '600' : '500',
                                color: 'var(--gray-900)',
                                fontSize: '16px'
                              }}>
                                {notification.title}
                              </h4>
                              {isUnread && (
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: 'var(--red-primary)'
                                }} />
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              {getTypeBadge(notification.type)}
                              {getPriorityBadge(notification.priority)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isUnread && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              style={{
                                background: 'var(--red-primary)',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => handleDismissNotification(notification.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--gray-400)',
                              cursor: 'pointer',
                              fontSize: '16px',
                              padding: '4px'
                            }}
                            title="Dismiss notification"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ 
                        color: 'var(--gray-700)', 
                        lineHeight: '1.5',
                        marginBottom: '12px',
                        fontSize: '14px',
                        whiteSpace: 'pre-wrap', // Preserve line breaks and formatting
                        wordWrap: 'break-word',  // Handle long words gracefully
                        maxHeight: '100px',      // Limit height in list view
                        overflow: 'hidden',      // Hide overflow
                        textOverflow: 'ellipsis' // Show ellipsis if text is cut off
                      }}>
                        {renderTextWithLinks(notification.message)}
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        gap: '16px', 
                        fontSize: '12px', 
                        color: 'var(--gray-500)',
                        flexWrap: 'wrap'
                      }}>
                        <span>📅 {formatDate(notification.sent_at)}</span>
                        {notification.sender_name && (
                          <span>👤 Sent by {notification.sender_name}</span>
                        )}
                        {notification.run_title && (
                          <span>🏃‍♂️ {notification.run_title}</span>
                        )}
                        {notification.expires_at && (
                          <span>⏰ Expires {formatDate(notification.expires_at)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <CreateNotificationForm 
          onSuccess={handleNotificationCreated}
          onCancel={() => setActiveTab('notifications')}
        />
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Communication Analytics</h3>
            <p className="card-description">Overview of notification engagement and statistics</p>
          </div>
          <div className="card-content">
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-500)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <h3 style={{ marginBottom: '8px', color: 'var(--gray-900)' }}>Analytics Coming Soon</h3>
              <p style={{ marginBottom: '20px' }}>
                Detailed analytics including read rates, engagement metrics, and communication trends will be available here.
              </p>
              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px',
                padding: '16px',
                marginTop: '20px',
                textAlign: 'left'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--gray-700)' }}>Planned Features:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--gray-600)' }}>
                  <li>Notification delivery and read rates</li>
                  <li>Most engaged run communications</li>
                  <li>Member response patterns</li>
                  <li>Optimal timing for announcements</li>
                  <li>Export communication reports</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};