import React from 'react'
import { useAuth } from '../../../modules/auth/context/AuthContext'

interface SidebarProps {
  currentPage?: string
  onNavigate?: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { permissions } = useAuth() // ← Use permissions instead of state.member

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
    </div>
  )
}