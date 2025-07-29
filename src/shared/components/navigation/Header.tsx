// Option 1: True Center with Equal Width Sides
import React from 'react';
import { AppLogo } from '../ui/AppLogo';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  canGoBack?: boolean;  
  onGoBack?: () => void; 
}

export const Header: React.FC<HeaderProps> = ({
  title = "Run Alcester",
  onMenuClick,
  canGoBack,
  onGoBack,
}) => {
  return (
    <header className="header">
      <div className="header-content" style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Left side - flex to handle variable buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'flex-start'
        }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>
            ☰
          </button>
          
          {canGoBack && (
            <button 
              onClick={onGoBack}
              style={{
                background: 'none',
                border: '1px solid var(--gray-300)',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--gray-600)',
                lineHeight: 1,
                minWidth: '50px'
              }}
              aria-label="Go back"
            >
              ← Back
            </button>
          )}
        </div>
        
        {/* Center - Logo + Title (always centered) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          justifyContent: 'center',
          whiteSpace: 'nowrap'
        }}>
          <AppLogo 
            size="small" 
            style={{ 
              width: '40px', 
              height: '40px', 
              objectFit: 'contain' 
            }} 
          />
          <h1 className="header-title" style={{ margin: 0, fontSize: '18px' }}>
            {title}
          </h1>
        </div>
        
        {/* Right side - matches left side width */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              background: 'none',
              border: '1px solid var(--gray-300)',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--gray-600)',
              lineHeight: 1,
              minWidth: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--red-light)';
              e.currentTarget.style.borderColor = 'var(--red-primary)';
              e.currentTarget.style.color = 'var(--red-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--gray-300)';
              e.currentTarget.style.color = 'var(--gray-600)';
            }}
            title="Sign Out"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

// Option 2: Compact Center with Better Visual Balance
export const HeaderOption2: React.FC<HeaderProps> = ({
  title = "Run Alcester",  // Shorter title
  onMenuClick,
  canGoBack,
  onGoBack,
}) => {
  return (
    <header className="header">
      <div className="header-content" style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Left controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
          <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
          {canGoBack && (
            <button onClick={onGoBack} style={{
              background: 'none', border: '1px solid var(--gray-300)', borderRadius: '4px',
              padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: 'var(--gray-600)',
              lineHeight: 1, minWidth: '50px'
            }}>← Back</button>
          )}
        </div>
        
        {/* True center logo */}
        <div style={{ 
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px'
        }}>
          <AppLogo size="small" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{title}</h1>
        </div>
        
        {/* Right controls - match left width */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: '120px' }}>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{
              background: 'none', border: '1px solid var(--gray-300)', borderRadius: '4px',
              padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: 'var(--gray-600)',
              minWidth: '60px', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};