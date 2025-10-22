// src/shared/components/ui/PWAInstallButton.tsx
import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'info' | 'warning'>('info');

  useEffect(() => {
    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('✅ beforeinstallprompt event fired!');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Detect incognito/private mode
  const isIncognitoMode = async (): Promise<boolean> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        const isIncognito = quota !== undefined && quota < 120000000;
        return isIncognito;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const handleInstallClick = async () => {
    console.log('🔘 Install button clicked');
    
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isInStandaloneMode || isInWebAppiOS) {
      setModalType('success');
      setModalMessage('App is already installed!');
      setShowModal(true);
      return;
    }

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setModalType('info');
      setModalMessage('To install: Tap the Share button (square with arrow) at the bottom of Safari, then select "Add to Home Screen"');
      setShowModal(true);
      return;
    }

    // Check if incognito/private mode
    const incognitoMode = await isIncognitoMode();
    if (incognitoMode) {
      setModalType('warning');
      setModalMessage('PWA installation is not available in incognito/private mode. Please use a regular browser window.');
      setShowModal(true);
      return;
    }

    // Try to trigger install prompt
    if (deferredPrompt) {
      console.log('✅ Triggering install prompt');
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log('Install outcome:', outcome);
        
        if (outcome === 'accepted') {
          setModalType('success');
          setModalMessage('App installed successfully! You can now access Run Alcester from your home screen.');
          setDeferredPrompt(null);
        } else {
          setModalType('info');
          setModalMessage('Installation cancelled. You can install the app anytime by clicking this button again.');
        }
        setShowModal(true);
      } catch (error) {
        console.error('Error during install:', error);
        setModalType('warning');
        setModalMessage('Installation error occurred. Please try again later.');
        setShowModal(true);
      }
    } else {
      console.warn('❌ No deferredPrompt available');
      setModalType('warning');
      setModalMessage('Installation is not currently available. Make sure you\'re using Chrome or Edge on a secure connection.');
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Install Button */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleInstallClick}
          type="button"
          className="btn btn-secondary"
          style={{ 
            width: '100%',
            gap: '8px'
          }}
        >
          <span>📱</span>
          Install App
        </button>
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

            {/* Action Button */}
            <div className="booking-success-modal__actions">
              <button 
                onClick={closeModal}
                className="btn btn--primary"
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