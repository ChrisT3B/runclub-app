import React from 'react'
import { useAuth } from '../../../modules/auth/context/AuthContext'

interface SidebarProps {
  currentPage?: string
  onNavigate?: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { permissions } = useAuth()

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'scheduled-runs', name: 'Scheduled Runs', icon: '🏃‍♂️' },
    { id: 'profile', name: 'My Profile', icon: '👤' },
  ]

  // Add LIRF-specific navigation using permissions
  if (permissions.canManageRuns) {
    navigation.push(
      { id: 'manage-runs', name: 'Manage Scheduled Runs', icon: '📅' },
      { id: 'lead-your-run', name: 'Lead Your Runs', icon: '🎯' }
    )
  }

  // Add admin-specific navigation using permissions
  if (permissions.canManageMembers) {
    navigation.push(
      { id: 'members', name: 'Members', icon: '👥' },
      { id: 'communications', name: 'Communications', icon: '📧' }
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
            </button>
          ))}
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
          Join Our Club
        </a>
        
        <a
          href="https://www.runalcester.co.uk/governance"
          className="nav-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span style={{ marginRight: '12px', fontSize: '16px' }}>📋</span>
          Governance
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
    </div>
  )
}