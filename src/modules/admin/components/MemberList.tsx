import React, { useState, useEffect } from 'react';
import { AdminService, Member } from '../services/adminService';
import { MemberEditModal } from './MemberEditModal';

export const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAccessLevel, setFilterAccessLevel] = useState('all');
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAllMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check DBS expiry status
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

  // Filter members based on search, status, and access level
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || member.membership_status === filterStatus;
    const matchesAccessLevel = filterAccessLevel === 'all' || member.access_level === filterAccessLevel;
    return matchesSearch && matchesStatus && matchesAccessLevel;
  });

  // Count members by access level for filter labels
  const accessLevelCounts = {
    all: members.length,
    member: members.filter(m => m.access_level === 'member').length,
    lirf: members.filter(m => m.access_level === 'lirf').length,
    admin: members.filter(m => m.access_level === 'admin').length
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading members...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Members</h1>
        <p className="page-description">Manage club members and their access levels</p>
      </div>

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

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Search Members</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Filter by Access Level</label>
              <select
                className="form-input"
                value={filterAccessLevel}
                onChange={(e) => setFilterAccessLevel(e.target.value)}
              >
                <option value="all">All Access Levels ({accessLevelCounts.all})</option>
                <option value="member">Members ({accessLevelCounts.member})</option>
                <option value="lirf">LIRFs ({accessLevelCounts.lirf})</option>
                <option value="admin">Admins ({accessLevelCounts.admin})</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Filter by Status</label>
              <select
                className="form-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {filteredMembers.length} Member{filteredMembers.length !== 1 ? 's' : ''}
            {filterAccessLevel !== 'all' && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--gray-500)', marginLeft: '8px' }}>
                ({filterAccessLevel}s)
              </span>
            )}
          </h3>
        </div>
        <div className="card-content">
          {filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
              No members found matching your criteria
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Access Level</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>DBS Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const dbsStatus = getDBSStatus(member.dbs_expiry_date);
                    const isLIRFOrAdmin = member.access_level === 'lirf' || member.access_level === 'admin';
                    
                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                              onClick={() => setEditingMember(member)}
                            >
                              📝 Edit
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                              onClick={() => {
                                // TODO: View member details
                                console.log('View details:', member.id);
                              }}
                            >
                              👁️ View
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500' }}>{member.full_name || 'No name'}</div>
                          {member.phone && (
                            <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                              {member.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--gray-600)' }}>
                          {member.email}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: member.membership_status === 'active' ? '#dcfce7' : 
                                       member.membership_status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: member.membership_status === 'active' ? '#166534' : 
                                  member.membership_status === 'pending' ? '#92400e' : '#dc2626'
                          }}>
                            {member.membership_status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: member.access_level === 'admin' ? 'var(--red-light)' :
                                       member.access_level === 'lirf' ? '#e0e7ff' : '#f3f4f6',
                            color: member.access_level === 'admin' ? 'var(--red-primary)' :
                                  member.access_level === 'lirf' ? '#4338ca' : '#6b7280'
                          }}>
                            {member.access_level}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {isLIRFOrAdmin ? (
                            dbsStatus ? (
                              <div>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  background: dbsStatus.background,
                                  color: dbsStatus.color
                                }}>
                                  {dbsStatus.text}
                                </span>
                                {member.dbs_expiry_date && (
                                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '2px' }}>
                                    Expires: {new Date(member.dbs_expiry_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                background: '#fef3c7',
                                color: '#92400e'
                              }}>
                                Not Set
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                              N/A
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: 'var(--gray-500)' }}>
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <MemberEditModal
          member={editingMember}
          isOpen={true}
          onClose={() => setEditingMember(null)}
          onSave={(updatedMember) => {
            setMembers(prev => prev.map(m => 
              m.id === updatedMember.id ? updatedMember : m
            ));
            setEditingMember(null);
          }}
        />
      )}
    </div>
  );
};

export default MemberList;