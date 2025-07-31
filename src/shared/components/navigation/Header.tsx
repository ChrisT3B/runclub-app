import React from 'react';
import { AppLogo } from '../ui/AppLogo';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Run Alcester Bookings",
  onMenuClick
}) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-grid">
          {/* Left side - hamburger menu */}
          <div className="header-left">
            <button className="header-icon-btn" onClick={onMenuClick}>
              ☰
            </button>
          </div>
          
          {/* Center - Logo + Title */}
          <div className="header-center">
            <AppLogo 
              size="small" 
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'contain' 
              }} 
            />
            <h1 className="header-title">{title}</h1>
          </div>
          
          {/* Right side - logout button */}
          <div className="header-right">
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="header-icon-btn"
              title="Sign Out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};