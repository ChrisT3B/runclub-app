// src/modules/membership/components/ProfileEditForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { ProfileService, useInvalidateProfile } from '../services/profileServices';
import { authQueryKeys } from '../../auth/hooks/useAuthQueries';
import { useQueryClient } from '@tanstack/react-query';

interface ProfileEditFormProps {
  onCancel: () => void;
  onSave: () => void;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ onCancel, onSave }) => {
  const { state, logout } = useAuth();
  const queryClient = useQueryClient();
  const invalidateProfile = useInvalidateProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    fullName: state.member?.full_name || '',
    email: state.user?.email || '', // Email comes from auth user
    phone: state.member?.phone || '',
    emergencyContact: state.member?.emergency_contact_name || '',
    emergencyPhone: state.member?.emergency_contact_phone || '', 
    medicalInfo: state.member?.health_conditions || '',
    emailNotifications: state.member?.email_notifications_enabled !== false // Default to true if undefined
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!state.user?.id) {
        throw new Error('User not found');
      }

      // Check if email changed and update auth if needed
      if (formData.email !== state.user.email) {
        await ProfileService.updateEmail(formData.email);
      }

      // Update profile in database (including email notification preference)
      await ProfileService.updateProfile(state.user.id, {
        ...formData,
        email_notifications_enabled: formData.emailNotifications
      });
      
      // Invalidate both profile cache and auth context cache to refresh all data
      invalidateProfile(state.user.id);
      
      // Also invalidate the auth context user profile query
      if (state.user.id) {
        queryClient.invalidateQueries({ 
          queryKey: authQueryKeys.userProfile(state.user.id) 
        });
      }
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onSave();
      }, 1500);
      
    } catch (err: any) {
      console.error('Profile update failed:', err);

      // ========== CSRF ERROR HANDLING ==========
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('CSRF_TOKEN_MISSING') ||
          errorMessage.includes('CSRF_VALIDATION_FAILED')) {
        console.log('🔒 CSRF validation failed - logging out user');
        setError('Your session has expired. Please log in again.');
        await logout();
        return;
      }
      // ========== END: CSRF ERROR HANDLING ==========

      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Edit Profile</h3>
        <p className="card-description">Update your personal information and communication preferences</p>
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
        
        {success && (
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            color: '#166534', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '20px' 
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
              Personal Information
            </h4>
            
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g. 07123 456789"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
              Emergency Contact
            </h4>
            
            <div className="form-group">
              <label className="form-label" htmlFor="emergencyContact">Emergency Contact Name</label>
              <input
                type="text"
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Full name of emergency contact"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emergencyPhone">Emergency Contact Phone</label>
              <input
                type="tel"
                id="emergencyPhone"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g. 07123 456789"
              />
            </div>
          </div>

          {/* Medical Information */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
              Medical Information
            </h4>
            
            <div className="form-group">
              <label className="form-label" htmlFor="medicalInfo">
                Health Conditions / Allergies / Medical Notes
              </label>
              <textarea
                id="medicalInfo"
                name="medicalInfo"
                value={formData.medicalInfo}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Any medical conditions, allergies, or other health information we should know about..."
                rows={4}
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
              <small style={{ color: 'var(--gray-600)', fontSize: '12px' }}>
                This information is kept confidential and is only used for safety purposes during runs.
              </small>
            </div>
          </div>

          {/* Communication Preferences */}
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
              Communication Preferences
            </h4>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={formData.emailNotifications}
                  onChange={handleInputChange}
                  style={{ marginRight: '4px' }}
                />
                <span className="form-label" style={{ marginBottom: '0' }}>
                  📧 Receive email notifications about runs and club updates
                </span>
              </label>
              <small style={{ color: 'var(--gray-600)', fontSize: '12px', marginLeft: '24px' }}>
                You can change this setting at any time. Important safety notifications will always be sent.
              </small>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            paddingTop: '20px', 
            borderTop: '1px solid var(--gray-200)' 
          }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};