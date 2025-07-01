import React, { ReactNode, useState } from 'react'
import { Header } from '../components/navigation/Header'
import { Sidebar } from '../components/navigation/Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
  currentPage?: string
  onNavigate?: (page: string) => void
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  currentPage = 'dashboard',
  onNavigate
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="dashboard-layout">
      {/* Desktop Sidebar - Always visible */}
      <div className="sidebar-desktop">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-mobile" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-mobile-header">
              <span className="sidebar-logo">RunClub</span>
              <button 
                className="sidebar-close-btn"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
            </div>
            <Sidebar 
              currentPage={currentPage} 
              onNavigate={(page) => {
                onNavigate?.(page)
                setSidebarOpen(false) // Close sidebar after navigation
              }} 
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {/* Header with Mobile Menu Button */}
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              {/* Mobile menu button */}
              <button 
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
              <h1 className="header-title">RunClub Manager</h1>
            </div>
            <div className="header-right">
              <div className="user-avatar">U</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  )
}