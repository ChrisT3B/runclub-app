import React from 'react';
import { Member } from '../../admin/services/adminService';

interface MemberProfileModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // Helper function to format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to get DBS status
  const getDBSStatus = (dbsExpiryDate: string | null | undefined) => {
    if (!dbsExpiryDate) return null;
    
    const today = new Date();
    const expiryDate = new Date(dbsExpiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', daysUntilExpiry, color: '#dc2626', background: '#fee2e2', text: 'Expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', daysUntilExpiry, color: '#92400e', background: '#fef3c7', text: `Expires in ${daysUntilExpiry} days` };
    } else {
      return { status: 'valid', daysUntilExpiry, color: '#166534', background: '#dcfce7', text: 'Valid' };
    }
  };

  const dbsStatus = getDBSStatus(member.dbs_expiry_date);
  const isLIRFOrAdmin = member.access_level === 'lirf' || member.access_level === 'admin';

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
        borderRadius: '8px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '24px 24px 0 24px',
          borderBottom: '1px solid var(--gray-200)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '600',
                color: 'var(--gray-900)'
              }}>
                {member.full_name || 'Member Profile'}
              </h2>
              <p style={{ 
                margin: '0 0 16px 0', 
                color: 'var(--gray-600)',
                fontSize: '14px'
              }}>
                View member details and information
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--gray-500)',
                padding: '0',
                marginLeft: '16px'
              }}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '0 24px 24px 24px' }}>
          <div style={{ display: 'grid', gap: '24px' }}>
            
            {/* Personal Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Personal Information</h3>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: 'var(--gray-700)', 
                        marginBottom: '4px' 
                      }}>
                        Full Name
                      </label>
                      <div style={{ 
                        padding: '8px 12px', 
                        backgroundColor: 'var(--gray-50)', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        {member.full_name || 'Not provided'}
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: 'var(--gray-700)', 
                        marginBottom: '4px' 
                      }}>
                        Email
                      </label>
                      <div style={{ 
                        padding: '8px 12px', 
                        backgroundColor: 'var(--gray-50)', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        {member.email}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)', 
                      marginBottom: '4px' 
                    }}>
                      Phone Number
                    </label>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: 'var(--gray-50)', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      {member.phone || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Membership Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Membership Information</h3>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)', 
                      marginBottom: '4px' 
                    }}>
                      Membership Status
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: member.membership_status === 'active' ? '#dcfce7' : 
                                   member.membership_status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: member.membership_status === 'active' ? '#166534' : 
                              member.membership_status === 'pending' ? '#92400e' : '#dc2626'
                      }}>
                        {member.membership_status}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)', 
                      marginBottom: '4px' 
                    }}>
                      Access Level
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: member.access_level === 'admin' ? 'var(--red-light)' :
                                   member.access_level === 'lirf' ? '#e0e7ff' : '#f3f4f6',
                        color: member.access_level === 'admin' ? 'var(--red-primary)' :
                              member.access_level === 'lirf' ? '#4338ca' : '#6b7280'
                      }}>
                        {member.access_level}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)', 
                      marginBottom: '4px' 
                    }}>
                      Member Since
                    </label>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: 'var(--gray-50)', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      {formatDate(member.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DBS Information (for LIRF/Admin only) */}
            {isLIRFOrAdmin && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">DBS Information</h3>
                </div>
                <div className="card-content">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: 'var(--gray-700)', 
                        marginBottom: '4px' 
                      }}>
                        DBS Status
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {dbsStatus ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: dbsStatus.background,
                            color: dbsStatus.color
                          }}>
                            {dbsStatus.text}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#fef3c7',
                            color: '#92400e'
                          }}>
                            Not Set
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: 'var(--gray-700)', 
                        marginBottom: '4px' 
                      }}>
                        DBS Expiry Date
                      </label>
                      <div style={{ 
                        padding: '8px 12px', 
                        backgroundColor: 'var(--gray-50)', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        {formatDate(member.dbs_expiry_date)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Emergency Contact</h3>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)', 
                      marginBottom: '4px' 
                    }}>
                      Contact Name
                    </label>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: 'var(--gray-50)', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      {member.emergency_contact_name || 'Not provided'}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--gray-700)', 
                      marginBottom: '4px' 
                    }}>
                      Contact Phone
                    </label>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: 'var(--gray-50)', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      {member.emergency_contact_phone || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Health Information</h3>
              </div>
              <div className="card-content">
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: 'var(--gray-700)', 
                    marginBottom: '4px' 
                  }}>
                    Health Conditions & Notes
                  </label>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: 'var(--gray-50)', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px',
                    lineHeight: '1.5'
                  }}>
                    {member.health_conditions || 'None disclosed'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Notification Preferences</h3>
              </div>
              <div className="card-content">
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: 'var(--gray-700)', 
                    marginBottom: '4px' 
                  }}>
                    Email Notifications
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: member.email_notifications_enabled ? '#dcfce7' : '#fee2e2',
                      color: member.email_notifications_enabled ? '#166534' : '#dc2626'
                    }}>
                      {member.email_notifications_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfileModal;