// src/modules/membership/components/ProfileView.tsx
import React from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useProfileQuery } from '../services/profileServices';

interface ProfileViewProps {
  onEdit: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onEdit }) => {
  const { state } = useAuth();
  
  // Fetch profile data using React Query instead of AuthContext
  const { data: member, isLoading, error } = useProfileQuery(state.user?.id);

  const getEmailNotificationStatus = () => {
    const isEnabled = member?.email_notifications_enabled !== false; // Default to true if undefined
    return {
      enabled: isEnabled,
      text: isEnabled ? 'Enabled' : 'Disabled',
      color: isEnabled ? '#166534' : '#dc2626',
      background: isEnabled ? '#dcfce7' : '#fef2f2',
      icon: isEnabled ? '✅' : '❌'
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-content">
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center',
            color: 'var(--gray-600)'
          }}>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card">
        <div className="card-content">
          <div style={{ 
            padding: '20px', 
            textAlign: 'center',
            color: 'var(--red-600)',
            background: '#fef2f2',
            borderRadius: '6px'
          }}>
            Failed to load profile. Please try refreshing the page.
          </div>
        </div>
      </div>
    );
  }

  const emailStatus = getEmailNotificationStatus();

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Profile Information</h3>
        <button 
          className="btn btn-primary"
          onClick={onEdit}
        >
          📝 Edit Profile
        </button>
      </div>
      <div className="card-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          {/* Left Column */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Name:</div>
              <div style={{ color: 'var(--gray-900)' }}>{member?.full_name || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.user?.email}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Phone:</div>
              <div style={{ color: 'var(--gray-900)' }}>{member?.phone || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>📧 Email Notifications:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  background: emailStatus.background, 
                  color: emailStatus.color, 
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '500', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  {emailStatus.icon} {emailStatus.text}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Emergency Contact:</div>
              <div style={{ color: 'var(--gray-900)' }}>{member?.emergency_contact_name || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Emergency Phone:</div>
              <div style={{ color: 'var(--gray-900)' }}>{member?.emergency_contact_phone || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Medical Information:</div>
              <div style={{ 
                color: 'var(--gray-900)', 
                backgroundColor: 'var(--gray-50)', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontSize: '14px',
                minHeight: '36px',
                whiteSpace: 'pre-wrap'
              }}>
                {member?.health_conditions || 'No medical conditions reported'}
              </div>
            </div>
          </div>
        </div>

        {/* Email Notification Info Box */}
        {!emailStatus.enabled && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: '500', color: '#92400e', marginBottom: '4px' }}>
                Email Notifications Disabled
              </div>
              <div style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.4' }}>
                You're currently not receiving email notifications for run updates and club announcements. 
                You'll still get in-app notifications, but might miss important updates when you're not logged in.
              </div>
              <button 
                onClick={onEdit}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Enable Email Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};