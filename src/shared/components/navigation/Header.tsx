import React from 'react';

interface HeaderProps {
  title?: string;
    onMenuClick?: () => void;     // Add this line
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "Run Alcester App", 
  onMenuClick,                  // Add this line
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
          <h1 className="header-title">{title}</h1>
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

export default Header;