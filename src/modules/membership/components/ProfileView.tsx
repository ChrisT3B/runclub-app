import React from 'react';
import { useAuth } from '../../auth/context/AuthContext';

interface ProfileViewProps {
  onEdit: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onEdit }) => {
  const { state } = useAuth();

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Profile Information</h3>
        <button 
          className="btn btn-primary"
          onClick={onEdit}
        >
          Edit Profile
        </button>
      </div>
      <div className="card-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Name:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.member?.full_name || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Email:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.user?.email}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Phone:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.member?.phone || 'Not set'}</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Medical Information:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.member?.health_conditions || 'Not set'}</div>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Emergency Contact:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.member?.emergency_contact_name || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Emergency Phone:</div>
              <div style={{ color: 'var(--gray-900)' }}>{state.member?.emergency_contact_phone || 'Not set'}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Access Level:</div>
              <span style={{ 
                background: 'var(--red-light)', 
                color: 'var(--red-primary)', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '500' 
              }}>
                {state.member?.access_level || 'member'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--gray-500)', marginBottom: '4px' }}>Membership Status:</div>
              <span style={{ 
                background: '#dcfce7', 
                color: '#166534', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: '500' 
              }}>
                {state.member?.membership_status || 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};