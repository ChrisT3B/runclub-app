// src/shared/components/ui/PWAInstallButton.tsx
import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstalled, isIOS, isRestrictedBrowser, canPrompt, installing, handleInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'info' | 'warning'>('info');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleInstallClick = async () => {
    if (isRestrictedBrowser) {
      setModalType('warning');
      setModalMessage('The app can\'t be installed from inside Facebook, Instagram, or TikTok. Open app.runalcester.co.uk in Safari or Chrome first, then use the Install App option.');
      setShowModal(true);
      return;
    }

    if (isInstalled) {
      setModalType('success');
      setModalMessage('App is already installed!');
      setShowModal(true);
      return;
    }

    if (isIOS) {
      setModalType('info');
      setModalMessage('To install: Tap the Share button (square with arrow) at the bottom of Safari, then select "Add to Home Screen"');
      setShowModal(true);
      return;
    }

    if (!canPrompt) {
      setModalType('warning');
      setModalMessage('Installation is not currently available. Make sure you\'re using Chrome or Edge on a secure connection.');
      setShowModal(true);
      return;
    }

    const outcome = await handleInstall();

    if (outcome === 'accepted') {
      setModalType('success');
      setModalMessage('App installed successfully! You can now access Run Alcester from your home screen.');
    } else if (outcome === 'dismissed') {
      setModalType('info');
      setModalMessage('Installation cancelled. You can install the app anytime by clicking this button again.');
    } else {
      setModalType('warning');
      setModalMessage('Installation error occurred. Please try again later.');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Install Button */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          onClick={handleInstallClick}
          disabled={installing}
          type="button"
          className="btn"
          style={{
            padding: '14px 20px',
            fontSize: '16px',
            fontWeight: '600',
            gap: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1e293b',
            color: 'white',
            border: '2px solid #1e293b',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>📱</span>
          {installing ? 'Installing...' : 'Install App'}
        </button>
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--gray-500)',
          margin: '6px 0 0 0',
        }}>
          Add to your home screen for quick access
        </p>
      </div>

      {/* Modal using existing booking-modal CSS classes */}
      {showModal && (
        <div
          className="booking-success-modal booking-success-modal--visible"
          onClick={closeModal}
        >
          <div
            className="booking-success-modal__content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="booking-success-modal__animation">
              {modalType === 'success' && (
                <div className="success-checkmark">
                  <div className="checkmark-circle">
                    <div className="checkmark-stem"></div>
                    <div className="checkmark-kick"></div>
                  </div>
                </div>
              )}
              {modalType === 'info' && (
                <div style={{
                  fontSize: '64px',
                  margin: '0 auto',
                  textAlign: 'center'
                }}>
                  ℹ️
                </div>
              )}
              {modalType === 'warning' && (
                <div style={{
                  fontSize: '64px',
                  margin: '0 auto',
                  textAlign: 'center'
                }}>
                  ⚠️
                </div>
              )}
            </div>

            {/* Header */}
            <div className="booking-success-modal__header">
              <h2>
                {modalType === 'success' ? 'Success!' :
                 modalType === 'warning' ? 'Not Available' :
                 'Install Instructions'}
              </h2>
              <p>{modalMessage}</p>
            </div>

            {/* Action Buttons */}
            <div className="booking-success-modal__actions" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {isRestrictedBrowser && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://app.runalcester.co.uk');
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    background: linkCopied ? '#059669' : 'white',
                    color: linkCopied ? 'white' : 'var(--red-primary)',
                    border: `2px solid ${linkCopied ? '#059669' : 'var(--red-primary)'}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {linkCopied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              )}
              <button
                onClick={closeModal}
                className="btn btn--primary"
                style={{ width: '100%', padding: '12px' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
