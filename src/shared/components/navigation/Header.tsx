import React from 'react';

interface HeaderProps {
  title?: string;
  showUserMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "RunClub Manager", 
  showUserMenu = true 
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  // Mock user for now - replace with real auth later
  const mockUser = {
    email: "user@runclub.com",
    user_metadata: { full_name: "John Runner" }
  };

  const handleSignOut = async () => {
    console.log('Sign out clicked - integrate with auth later');
    setIsUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen]);

  return (
    <header className="header">
      <div className="header-content">
        {/* Left side - Title/Brand */}
        <div className="header-left">
          <h1 className="header-title">{title}</h1>
        </div>

        {/* Right side - User menu */}
        {showUserMenu && (
          <div className="header-right">
            <div className="user-menu-container">
              <button
                onClick={toggleUserMenu}
                className="user-menu-trigger"
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {mockUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="user-email">{mockUser.email}</span>
                <svg 
                  className={`chevron ${isUserMenuOpen ? 'rotated' : ''}`}
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-info">
                      <div className="user-name">
                        {mockUser.user_metadata?.full_name || 'User'}
                      </div>
                      <div className="user-email-small">{mockUser.email}</div>
                    </div>
                  </div>
                  
                  <div className="user-dropdown-divider"></div>
                  
                  <div className="user-dropdown-menu">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        console.log('Navigate to profile');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Profile Settings
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        console.log('Navigate to preferences');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                      </svg>
                      Preferences
                    </button>
                  </div>
                  
                  <div className="user-dropdown-divider"></div>
                  
                  <button 
                    onClick={handleSignOut}
                    className="dropdown-item logout-item"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16,17 21,12 16,7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;