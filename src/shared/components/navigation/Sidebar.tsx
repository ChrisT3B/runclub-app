import React, { useState } from 'react'
import { useAuth } from '../../../modules/auth/context/AuthContext'
import { SendInvitationModal } from '../ui/SendInvitationModal'

interface SidebarProps {
  currentPage?: string
  onNavigate?: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { permissions, state } = useAuth()
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false)

  const navigation: { id: string; name: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'runs-hub', name: 'Runs', icon: '🏃‍♂️' },
    { id: 'profile', name: 'My Profile', icon: '👤' },
    { id: 'ea-membership', name: 'Club Membership', icon: '🏅' },
    { id: 'leagues-hub', name: 'Leagues', icon: '🏆' },
  ]

  // C25k: Training Plan for participants/LIRFs/admins, Register for everyone else
  if (state.member?.is_c25k_participant || permissions.canManageRuns) {
    navigation.push({ id: 'c25k-training-plan', name: 'C25K Training Plan', icon: '📋' })
  } else {
    navigation.push({ id: 'c25k-register', name: 'C25K Registration', icon: '🏃' })
  }

  // Add LIRF-specific navigation using permissions
  if (permissions.canManageRuns) {
    navigation.push(
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
      { id: 'c25k-admin', name: 'C25k Admin', icon: '🏃' },
      { id: 'league-admin-hub', name: 'League Admin', icon: '🏆' }
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
              onClick={() => item.id === 'c25k-register' ? (window.location.href = '/c25k') : onNavigate?.(item.id)}
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