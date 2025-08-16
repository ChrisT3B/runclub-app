import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { NotificationService, Notification } from '../services/NotificationService';
import { CreateNotificationForm } from './CreateNotificationForm';
import { renderTextWithLinks } from '../../../utils/linkHelper';

interface CommunicationsDashboardProps {
  onNavigate?: (page: string) => void;
}

export const CommunicationsDashboard: React.FC<CommunicationsDashboardProps> = () => {
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
    return (
      <span className={`priority-badge priority-badge--${priority}`}>
        {priority}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'run_specific': 'run-specific',
      'general': 'general',
      'urgent': 'urgent'
    };
    
    const typeClass = typeMap[type] || 'general';
    const typeText = type === 'run_specific' ? 'Run Specific' : 
                    type === 'general' ? 'General' : 'Urgent';
    
    return (
      <span className={`type-badge type-badge--${typeClass}`}>
        {typeText}
      </span>
    );
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">📬 Communications</h1>
        <p className="page-description">
          {permissions.canManageRuns || permissions.canManageMembers 
            ? 'Send notifications and view communication history'
            : 'View your notifications and club announcements'
          }
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="communications-tabs">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`communications-tab ${
            activeTab === 'notifications' ? 'communications-tab--active' : 'communications-tab--inactive'
          }`}
        >
          📬 Notifications
          {unreadCount > 0 && (
            <span className={`communications-badge ${
              activeTab === 'notifications' ? 'communications-badge--active' : 'communications-badge--inactive'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>

        {(permissions.canManageRuns || permissions.canManageMembers) && (
          <button
            onClick={() => setActiveTab('create')}
            className={`communications-tab ${
              activeTab === 'create' ? 'communications-tab--active' : 'communications-tab--inactive'
            }`}
          >
            ✏️ Create Notification
          </button>
        )}

        {(permissions.canManageRuns || permissions.canManageMembers) && (
          <button
            onClick={() => setActiveTab('history')}
            className={`communications-tab ${
              activeTab === 'history' ? 'communications-tab--active' : 'communications-tab--inactive'
            }`}
          >
            📊 History & Analytics
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="member-list-alert member-list-alert--error">
          {error}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Personal Notifications</h3>
            <div className="notifications-count">
              {notifications.length} total
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="notifications-loading">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">
                <div className="notifications-empty__icon">📬</div>
                <h3 className="notifications-empty__title">No Notifications</h3>
                <p className="notifications-empty__text">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => {
                  const isUnread = !notification.read_at;
                  const priorityClass = `notification-card--${notification.priority}`;
                  
                  return (
                    <div 
                      key={notification.id}
                      className={`notification-card ${priorityClass} ${
                        isUnread ? 'notification-card--unread' : ''
                      }`}
                    >
                      <div className="notification-header">
                        <div className="notification-title-section">
                          <div className="notification-title-row">
                            <span className="notification-icon">
                              {getNotificationIcon(notification.type, notification.priority)}
                            </span>
                            <h4 className={`notification-title ${
                              isUnread ? 'notification-title--unread' : 'notification-title--read'
                            }`}>
                              {notification.title}
                            </h4>
                            {isUnread && (
                              <div className="notification-unread-dot" />
                            )}
                          </div>
                          <div className="notification-badges">
                            {getTypeBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                        </div>
                        <div className="notification-actions">
                          {isUnread && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="notification-btn notification-btn--mark-read"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => handleDismissNotification(notification.id)}
                            className="notification-btn notification-btn--dismiss"
                            title="Dismiss notification"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      
                      <div className="notification-content">
                        {renderTextWithLinks(notification.message)}
                      </div>
                      
                      <div className="notification-meta">
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

      {/* Create Tab */}
      {activeTab === 'create' && (
        <CreateNotificationForm 
          onSuccess={handleNotificationCreated}
          onCancel={() => setActiveTab('notifications')}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Communication Analytics</h3>
            <p className="card-description">Overview of notification engagement and statistics</p>
          </div>
          <div className="card-content">
            <div className="analytics-empty">
              <div className="analytics-empty__icon">📊</div>
              <h3 className="analytics-empty__title">Analytics Coming Soon</h3>
              <p className="analytics-empty__text">
                Detailed analytics including read rates, engagement metrics, and communication trends will be available here.
              </p>
              <div className="analytics-features">
                <h4 className="analytics-features__title">Planned Features:</h4>
                <ul className="analytics-features__list">
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