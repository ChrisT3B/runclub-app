import React, { useEffect, useState } from 'react';
// @ts-ignore - vite-plugin-pwa virtual module
import { useRegisterSW } from 'virtual:pwa-register/react';

export const UpdatePrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('✅ Service Worker registered:', r);
    },
    onRegisterError(error: any) {
      console.error('❌ Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log('🔄 Update available, showing prompt');
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    console.log('🔄 User clicked update, reloading app...');
    await updateServiceWorker(true);
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  const handleDismiss = () => {
    console.log('❌ User dismissed update prompt');
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '400px',
        width: 'calc(100% - 40px)',
      }}
    >
      <div
        className="card"
        style={{
          backgroundColor: 'var(--red-primary)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Update Available
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              opacity: 0.95,
            }}
          >
            A new version of Run Alcester is available. Reload to get the latest features and fixes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDismiss}
            className="btn btn--secondary"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            className="btn btn--primary"
            style={{
              backgroundColor: 'white',
              color: 'var(--red-primary)',
              border: 'none',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Reload Now
          </button>
        </div>
      </div>
    </div>
  );
};
