import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../modules/auth/context/AuthContext'
import { SendInvitationModal } from '../ui/SendInvitationModal'
import { AffiliatedMemberService } from '../../../modules/membership/services/affiliatedMemberService'

interface SidebarProps {
  currentPage?: string
  onNavigate?: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { permissions } = useAuth()
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false)
  const [pendingEACount, setPendingEACount] = useState(0)

  // Load pending EA applications count for admin badge
  // Refresh when page changes to catch updates from EA Applications page
  useEffect(() => {
    if (permissions.canManageMembers) {
      AffiliatedMemberService.getPendingApplicationsCount()
        .then(count => setPendingEACount(count))
        .catch(err => console.error('Failed to load pending EA count:', err))
    }
  }, [permissions.canManageMembers, currentPage])

  const navigation: { id: string; name: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'scheduled-runs', name: 'Scheduled Runs', icon: '🏃‍♂️' },
    { id: 'profile', name: 'My Profile', icon: '👤' },
    { id: 'ea-membership', name: 'Club Membership', icon: '🏅' },
  ]

  // Add LIRF-specific navigation using permissions
  if (permissions.canManageRuns) {
    navigation.push(
      { id: 'manage-runs', name: 'Manage Scheduled Runs', icon: '📅' },
      { id: 'lead-your-run', name: 'Lead Your Runs', icon: '🎯' },
      { id: 'communications', name: 'Communications', icon: '📧' }
    )
  }

  // Add Reports for LIRFs and Admins
  if (permissions.canManageRuns || permissions.canManageMembers) {
    navigation.push({ id: 'admin-reports', name: 'Reports', icon: '📊' })
  }

  // Add admin-only navigation using permissions
  if (permissions.canManageMembers) {
    navigation.push(
      { id: 'members', name: 'Members', icon: '👥' },
      { id: 'ea-applications', name: 'EA Applications', icon: '📋', badge: pendingEACount },
      { id: 'test-lirf-reminder', name: 'Test LIRF Reminder', icon: '🧪' }
    )
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header sidebar-header--desktop-only">
        <div className="sidebar-logo">Run Alcester</div>
      </div>
      
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflowY: 'auto',
        paddingBottom: '16px'
      }}>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <span style={{ marginRight: '12px', fontSize: '16px' }}>{item.icon}</span>
              {item.name}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--red-primary)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Send Invitation Button - visible to Admin and LIRF users */}
          {(permissions.canManageRuns || permissions.canManageMembers) && (
            <button
              onClick={() => setIsInvitationModalOpen(true)}
              className="nav-item"
              style={{
                marginTop: '8px',
                borderTop: '1px solid var(--gray-200)',
                paddingTop: '16px'
              }}
            >
              <span style={{ marginRight: '12px', fontSize: '16px' }}>📧</span>
              Send Invitation
            </button>
          )}
        </nav>

        {/* Club Information Section */}
        <div style={{ 
          borderTop: '1px solid var(--gray-200)',
          marginTop: 'auto',
          paddingTop: '16px'
        }}>
        <div style={{ 
          padding: '0 20px 8px 20px',
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--gray-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Club Information
        </div>
        
        <a
          href="https://www.runalcester.co.uk/joinourclub"
          className="nav-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span style={{ marginRight: '12px', fontSize: '16px' }}>🏃‍♀️</span>
          Full Membership
        </a>
        
        <a
          href="https://www.runalcester.co.uk/governance"
          className="nav-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span style={{ marginRight: '12px', fontSize: '16px' }}>📋</span>
          Club Documents
        </a>
        
        <a
          href="https://www.runalcester.co.uk"
          className="nav-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span style={{ marginRight: '12px', fontSize: '16px' }}>🏠</span>
          Main Website
        </a>
              </div>
      </div>

      {/* Send Invitation Modal */}
      <SendInvitationModal
        isOpen={isInvitationModalOpen}
        onClose={() => setIsInvitationModalOpen(false)}
      />
    </div>
  )
}