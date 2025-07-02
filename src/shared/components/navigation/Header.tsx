import React from 'react';

interface HeaderProps {
  title?: string;
  showUserMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "RunClub Manager", 
  showUserMenu = true 
}) => {
  console.log('Simple header working!');

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
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