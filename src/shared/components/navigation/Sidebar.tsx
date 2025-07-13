import React from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'

interface SidebarProps {
  currentPage?: string
  onNavigate?: (page: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { state } = useAuth()
    console.log('Current user:', state.user);
    console.log('Access level:', state.user?.accessLevel);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'scheduled-runs', name: 'Scheduled Runs', icon: '🏃‍♂️' },
    { id: 'profile', name: 'My Profile', icon: '👤' },
  ]

// Add LIRF-specific navigation
if (state.user?.accessLevel === 'lirf' || state.user?.accessLevel === 'admin') {
  navigation.push(
    { id: 'manage-runs', name: 'Manage Scheduled Runs', icon: '📅' },
    { id: 'lead-your-run', name: 'Lead Your Runs', icon: '🎯' }  // ← Add this
  )
}

// Add admin-specific navigation
if (state.user?.accessLevel === 'admin') {
  navigation.push(
    { id: 'members', name: 'Members', icon: '👥' },
      { id: 'communications', name: 'Communications', icon: '📧' }
  )

  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">RunClub</div>
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