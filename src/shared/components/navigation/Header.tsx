import React from 'react';
import { AppLogo } from '../ui/AppLogo';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Run Alcester Bookings",
  onMenuClick,
}) => {
  //console.log('Simple header working!');
  
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={onMenuClick}
          >
            ☰
          </button>
          
          {/* Logo + Text combination */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}>
            <AppLogo 
              size="small" 
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'contain' 
              }} 
            />
            <h1 className="header-title" style={{ margin: 0 }}>
              {title}
            </h1>
          </div>
        </div>
        
        <div className="header-right">
          <button 
            onClick={() => {
              //console.log('Logout clicked!');
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: '1px solid var(--gray-300)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'var(--gray-700)',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--red-light)';
              e.currentTarget.style.borderColor = 'var(--red-primary)';
              e.currentTarget.style.color = 'var(--red-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--gray-300)';
              e.currentTarget.style.color = 'var(--gray-700)';
            }}
            title="Sign Out"
          >
            {/* Logout icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span className="desktop-only">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};