import React from 'react';
import { AppLogo } from '../ui/AppLogo';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Run Alcester App",
  onMenuClick,
}) => {
  console.log('Simple header working!');
  
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
          <button onClick={() => {
            console.log('Logout clicked!');
            localStorage.clear();
            window.location.reload();
          }}>
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
};