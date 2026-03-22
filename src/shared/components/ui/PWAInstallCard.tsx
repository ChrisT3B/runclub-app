// src/shared/components/ui/PWAInstallCard.tsx
import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallCard: React.FC = () => {
  const { isInstalled, isIOS, canPrompt, installing, handleInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem('pwa-install-card-dismissed');
    if (!dismissedAt) return false;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(dismissedAt, 10) < sevenDays) return true;
    localStorage.removeItem('pwa-install-card-dismissed');
    return false;
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-card-dismissed', Date.now().toString());
  };

  // Don't render if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  const getMessage = () => {
    if (isIOS) {
      return 'Add Run Alcester to your home screen for quick access. Tap the Share button (square with arrow) at the bottom of Safari, then select "Add to Home Screen".';
    }
    if (canPrompt) {
      return 'Get quick access to Run Alcester from your home screen. Works offline and loads instantly.';
    }
    // Desktop browser or Android without prompt (e.g. already has install icon in address bar)
    return 'Install Run Alcester as an app for quick access. Look for the install icon in your browser\'s address bar, or use your browser menu.';
  };

  return (
    <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--red-primary)' }}>
      <div className="card-header">
        <h3 className="card-title">Install Run Alcester App</h3>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gray-400)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
          title="Dismiss for 7 days"
        >
          ✕
        </button>
      </div>
      <div className="card-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'var(--red-primary)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '20px',
            flexShrink: 0,
          }}>
            RA
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--gray-700)', fontSize: '14px', lineHeight: '1.5' }}>
              {getMessage()}
            </p>
            {canPrompt && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="btn btn-primary"
                style={{ fontSize: '14px' }}
              >
                {installing ? 'Installing...' : 'Install App'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
