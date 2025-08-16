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
      {/* Desktop Sidebar - Always visible on desktop, hidden on mobile */}
      <div className="sidebar-desktop">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>

      {/* Mobile Sidebar Overlay - Only shows when sidebarOpen is true */}
      {sidebarOpen && (
        <div 
          className="sidebar-mobile-overlay" 
          onClick={() => setSidebarOpen(false)}
        >
          <div 
            className="sidebar-mobile" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Remove duplicate header - the Sidebar component already has one */}
            <Sidebar 
              currentPage={currentPage} 
              onNavigate={(page) => {
                onNavigate?.(page)
                setSidebarOpen(false) // Close sidebar after navigation
              }} 
            />
            
            {/* Add close button overlay */}
            <button 
              className="sidebar-mobile-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-content">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        {/* Content Area */}
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  )
}