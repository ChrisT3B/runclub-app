import React, { useState, useEffect } from 'react';
import { AdminService, Member } from '../services/adminService';
import { MemberEditModal } from './MemberEditModal';
import { MemberProfileModal } from '../../membership/components/MemberProfileModal';

export const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('members-only');
  const [filterAccessLevel, setFilterAccessLevel] = useState('all');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

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
      return { status: 'expired', daysUntilExpiry, cssClass: 'dbs-badge--expired', text: 'Expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', daysUntilExpiry, cssClass: 'dbs-badge--expiring', text: `Expires in ${daysUntilExpiry} days` };
    } else {
      return { status: 'valid', daysUntilExpiry, cssClass: 'dbs-badge--valid', text: 'Valid' };
    }
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-badge--active';
      case 'pending': return 'status-badge--pending';
      case 'inactive': return 'status-badge--inactive';
      case 'guest': return 'status-badge--guest';
      default: return 'status-badge--inactive';
    }
  };

  // Helper function to get access level badge class
  const getAccessBadgeClass = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin': return 'access-badge--admin';
      case 'lirf': return 'access-badge--lirf';
      case 'member': return 'access-badge--member';
      default: return 'access-badge--member';
    }
  };

  // Filter members based on search, status, and access level
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = (() => {
      if (filterStatus === 'members-only') {
        return member.membership_status !== 'guest';
      } else if (filterStatus === 'all') {
        return true;
      } else {
        return member.membership_status === filterStatus;
      }
    })();
    
    const matchesAccessLevel = filterAccessLevel === 'all' || member.access_level === filterAccessLevel;
    return matchesSearch && matchesStatus && matchesAccessLevel;
  });

  // Count members by status for filter labels
  const statusCounts = {
    membersOnly: members.filter(m => m.membership_status !== 'guest').length,
    all: members.length,
    pending: members.filter(m => m.membership_status === 'pending').length,
    active: members.filter(m => m.membership_status === 'active').length,
    inactive: members.filter(m => m.membership_status === 'inactive').length,
    guest: members.filter(m => m.membership_status === 'guest').length
  };

  // Count members by access level for filter labels
  const accessLevelCounts = {
    all: filteredMembers.length,
    member: filteredMembers.filter(m => m.access_level === 'member').length,
    lirf: filteredMembers.filter(m => m.access_level === 'lirf').length,
    admin: filteredMembers.filter(m => m.access_level === 'admin').length
  };

  if (loading) {
    return (
      <div className="member-list-loading">
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
        <div className="member-list-alert member-list-alert--error">
          {error}
        </div>
      )}



      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-content">
          <div className="filter-grid">
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
                <option value="members-only">Club Members Only ({statusCounts.membersOnly})</option>
                <option value="all">All Including Guests ({statusCounts.all})</option>
                <option value="pending">Pending ({statusCounts.pending})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="inactive">Inactive ({statusCounts.inactive})</option>
                <option value="guest">Guests Only ({statusCounts.guest})</option>
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
            {filterStatus === 'members-only' && (
              <span className="card-title__subtitle">(excluding guests)</span>
            )}
            {filterAccessLevel !== 'all' && (
              <span className="card-title__subtitle">({filterAccessLevel}s)</span>
            )}
          </h3>
        </div>
        <div className="card-content">
          {filteredMembers.length === 0 ? (
            <div className="member-list-empty">
              No members found matching your criteria
            </div>
          ) : (
            <div className="table-container">
              <table className="member-table">
                <thead className="member-table__header">
                  <tr>
                    <th className="member-table__header-cell">Actions</th>
                    <th className="member-table__header-cell">Name</th>
                    <th className="member-table__header-cell">Email</th>
                    <th className="member-table__header-cell">Status</th>
                    <th className="member-table__header-cell">Access Level</th>
                    <th className="member-table__header-cell">DBS Status</th>
                    <th className="member-table__header-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const dbsStatus = getDBSStatus(member.dbs_expiry_date);
                    const isLIRFOrAdmin = member.access_level === 'lirf' || member.access_level === 'admin';
                    const isGuest = member.membership_status === 'guest';
                    
                    return (
                      <tr 
                        key={member.id} 
                        className={`member-table__row ${isGuest ? 'member-table__row--guest' : ''}`}
                      >
                        <td className="member-table__cell">
                          <div className="member-actions">
                            <button
                              className="btn btn-secondary member-actions__btn"
                              onClick={() => setEditingMember(member)}
                            >
                              📝 Edit
                            </button>
                            <button
                              className="btn btn-secondary member-actions__btn"
                              onClick={() => setViewingMember(member)}
                            >
                              👁️ View
                            </button>
                          </div>
                        </td>
                        <td className="member-table__cell">
                          <div className="member-name">
                            {member.full_name || 'No name'}
                            {isGuest && (
                              <span className="member-name__guest-label">(Guest)</span>
                            )}
                          </div>
                          {member.phone && (
                            <div className="member-phone">{member.phone}</div>
                          )}
                        </td>
                        <td className="member-table__cell member-table__cell--gray">
                          {member.email}
                        </td>
                        <td className="member-table__cell">
                          <span className={`status-badge ${getStatusBadgeClass(member.membership_status)}`}>
                            {member.membership_status}
                          </span>
                        </td>
                        <td className="member-table__cell">
                          <span className={`access-badge ${getAccessBadgeClass(member.access_level)}`}>
                            {member.access_level}
                          </span>
                        </td>
                        <td className="member-table__cell">
                          {isLIRFOrAdmin ? (
                            dbsStatus ? (
                              <div>
                                <span className={`dbs-badge ${dbsStatus.cssClass}`}>
                                  {dbsStatus.text}
                                </span>
                                {member.dbs_expiry_date && (
                                  <div className="dbs-expiry-date">
                                    Expires: {new Date(member.dbs_expiry_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="dbs-badge dbs-badge--not-set">
                                Not Set
                              </span>
                            )
                          ) : (
                            <span className="member-table__cell--small-gray">N/A</span>
                          )}
                        </td>
                        <td className="member-table__cell member-table__cell--small-gray">
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

      {/* View Profile Modal */}
      {viewingMember && (
        <MemberProfileModal
          member={viewingMember}
          isOpen={true}
          onClose={() => setViewingMember(null)}
        />
      )}
    </div>
  );
};

export default MemberList;