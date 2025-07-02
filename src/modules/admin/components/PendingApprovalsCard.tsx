import React, { useState, useEffect } from 'react';
import { AdminService, Member } from '../../admin/services/adminService';

export const PendingApprovalsCard: React.FC = () => {
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingMembers();
  }, []);

  const loadPendingMembers = async () => {
    try {
      setLoading(true);
      const allMembers = await AdminService.getAllMembers();
      const pending = allMembers.filter(member => member.membership_status === 'pending');
        console.log('All members:', allMembers);
        console.log('Pending members:', pending);
      setPendingMembers(pending);
    } catch (error) {
      console.error('Failed to load pending members:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (memberId: string) => {
    try {
      setProcessing(memberId);
      await AdminService.updateMemberStatus(memberId, 'active');
      // Remove from pending list
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Failed to approve member:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      setProcessing(memberId);
      await AdminService.updateMemberStatus(memberId, 'inactive');
      // Remove from pending list
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Failed to reject member:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pending Approvals</h3>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (pendingMembers.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pending Approvals</h3>
        </div>
        <div className="card-content">
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
            ✅ No pending approvals
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          Pending Approvals 
          <span style={{ 
            background: 'var(--red-primary)', 
            color: 'white', 
            borderRadius: '50%', 
            width: '24px', 
            height: '24px', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '12px', 
            marginLeft: '8px' 
          }}>
            {pendingMembers.length}
          </span>
        </h3>
        <p className="card-description">Review and approve new member registrations</p>
      </div>
      <div className="card-content">
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {pendingMembers.map((member) => (
            <div 
              key={member.id} 
              style={{ 
                padding: '16px', 
                border: '1px solid var(--gray-200)', 
                borderRadius: '6px', 
                marginBottom: '12px',
                background: '#fefbf2'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {member.full_name || 'No name provided'}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                    {member.email}
                  </div>
                  {member.phone && (
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      📞 {member.phone}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Registered: {new Date(member.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleApprove(member.id)}
                    disabled={processing === member.id}
                    className="btn btn-primary"
                    style={{ 
                      fontSize: '12px', 
                      padding: '6px 12px',
                      background: '#16a34a',
                      borderColor: '#16a34a'
                    }}
                  >
                    {processing === member.id ? '...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(member.id)}
                    disabled={processing === member.id}
                    className="btn btn-secondary"
                    style={{ 
                      fontSize: '12px', 
                      padding: '6px 12px',
                      background: '#dc2626',
                      borderColor: '#dc2626',
                      color: 'white'
                    }}
                  >
                    {processing === member.id ? '...' : '✗ Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {pendingMembers.length > 3 && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--gray-200)' 
          }}>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                // TODO: Navigate to full members page
                console.log('Navigate to members page');
              }}
              style={{ 
                color: 'var(--red-primary)', 
                textDecoration: 'none', 
                fontSize: '14px' 
              }}
            >
              View all pending members →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingApprovalsCard;