import React, { useState } from 'react';
import { AdminService, Member } from '../services/adminService';

interface MemberEditModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMember: Member) => void;
}

export const MemberEditModal: React.FC<MemberEditModalProps> = ({ 
  member, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: member.full_name || '',
    email: member.email || '',
    phone: member.phone || '',
    emergency_contact_name: member.emergency_contact_name || '',
    emergency_contact_phone: member.emergency_contact_phone || '',
    health_conditions: member.health_conditions || '',
    membership_status: member.membership_status || 'pending',
    access_level: member.access_level || 'member'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Update member in database
      await AdminService.updateMemberDetails(member.id, formData);
      
      // Create updated member object
      const updatedMember = { ...member, ...formData };
      onSave(updatedMember);
      onClose();
      
    } catch (err: any) {
      console.error('Member update failed:', err);
      setError(err.message || 'Failed to update member. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Edit Member: {member.full_name}</h3>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--gray-500)'
                }}
              >
                ✕
              </button>
            </div>
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
              {/* Personal Information */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
                  Personal Information
                </h4>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="full_name">Full Name *</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
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
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
                  Emergency Contact
                </h4>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="emergency_contact_name">Emergency Contact Name</label>
                  <input
                    type="text"
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emergency_contact_phone">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Admin Settings */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
                  Admin Settings
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="membership_status">Membership Status</label>
                    <select
                      id="membership_status"
                      name="membership_status"
                      value={formData.membership_status}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="access_level">Access Level</label>
                    <select
                      id="access_level"
                      name="access_level"
                      value={formData.access_level}
                      onChange={handleInputChange}
                      className="form-input"
                    >
                      <option value="member">Member</option>
                      <option value="lirf">LIRF</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)', marginBottom: '16px' }}>
                  Medical Information
                </h4>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="health_conditions">
                    Medical Conditions / Allergies
                  </label>
                  <textarea
                    id="health_conditions"
                    name="health_conditions"
                    value={formData.health_conditions}
                    onChange={handleInputChange}
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberEditModal;