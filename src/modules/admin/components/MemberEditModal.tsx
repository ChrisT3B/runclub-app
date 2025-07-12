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
    access_level: member.access_level || 'member',
    dbs_expiry_date: member.dbs_expiry_date || ''
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
      // Validate DBS date for LIRFs and Admins
      if ((formData.access_level === 'lirf' || formData.access_level === 'admin') && 
          formData.dbs_expiry_date && 
          new Date(formData.dbs_expiry_date) < new Date()) {
        setError('Warning: DBS expiry date is in the past. Please verify this is correct.');
      }

      // Clean up form data - remove empty DBS date for non-LIRF members
      const cleanFormData: any = { ...formData };
      if (formData.access_level === 'member' || !formData.dbs_expiry_date) {
        cleanFormData.dbs_expiry_date = undefined;
      }

      // Update member in database
      await AdminService.updateMemberDetails(member.id, cleanFormData);
      
      // Create updated member object
      const updatedMember = { ...member, ...cleanFormData };
      onSave(updatedMember);
      onClose();
      
    } catch (err: any) {
      console.error('Member update failed:', err);
      setError(err.message || 'Failed to update member. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if current access level requires DBS
  const requiresDBS = formData.access_level === 'lirf' || formData.access_level === 'admin';

  // Get DBS status for warning display
  const getDBSWarning = () => {
    if (!requiresDBS || !formData.dbs_expiry_date) return null;
    
    const today = new Date();
    const expiryDate = new Date(formData.dbs_expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { type: 'error', message: `DBS expired ${Math.abs(daysUntilExpiry)} days ago` };
    } else if (daysUntilExpiry <= 30) {
      return { type: 'warning', message: `DBS expires in ${daysUntilExpiry} days` };
    }
    return null;
  };

  const dbsWarning = getDBSWarning();

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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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

                {/* DBS Expiry - Only show for LIRFs and Admins */}
                {requiresDBS && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="dbs_expiry_date">
                      DBS Expiry Date
                      {requiresDBS && <span style={{ color: '#dc2626' }}> *</span>}
                    </label>
                    <input
                      type="date"
                      id="dbs_expiry_date"
                      name="dbs_expiry_date"
                      value={formData.dbs_expiry_date}
                      onChange={handleInputChange}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]} // Minimum date is today
                    />
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      Required for LIRF and Admin access levels
                    </div>
                    
                    {dbsWarning && (
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginTop: '8px',
                        background: dbsWarning.type === 'error' ? '#fee2e2' : '#fef3c7',
                        color: dbsWarning.type === 'error' ? '#dc2626' : '#92400e',
                        border: `1px solid ${dbsWarning.type === 'error' ? '#fecaca' : '#fde68a'}`
                      }}>
                        ⚠️ {dbsWarning.message}
                      </div>
                    )}
                  </div>
                )}
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