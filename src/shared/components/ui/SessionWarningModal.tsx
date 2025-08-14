// src/shared/components/ui/SessionWarningModal.tsx
import React, { useEffect, useState } from 'react';

interface SessionWarningModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
}) => {
  const [countdown, setCountdown] = useState(Math.floor(timeRemaining / 1000));

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          onLogout();
          return 0;
        }
        return newCount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onLogout]);

  useEffect(() => {
    setCountdown(Math.floor(timeRemaining / 1000));
  }, [timeRemaining]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'modalSlideIn 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              ⏰
            </div>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                fontFamily: 'var(--font-heading)',
              }}>
                Session Expiring Soon
              </h3>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: '#6b7280',
                fontFamily: 'var(--font-body)',
              }}>
                Your session will expire automatically for security
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fcd34d',
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#92400e',
              fontFamily: 'var(--font-heading)',
              marginBottom: '4px',
            }}>
              {formatTime(countdown)}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#92400e',
              fontFamily: 'var(--font-body)',
            }}>
              Time remaining
            </div>
          </div>

          {/* Message */}
          <div style={{
            marginBottom: '32px',
            color: '#4b5563',
            lineHeight: '1.5',
            fontFamily: 'var(--font-body)',
          }}>
            <p style={{ margin: '0 0 12px 0' }}>
              You've been inactive for a while. For your security, we'll automatically log you out soon.
            </p>
            <p style={{ margin: 0 }}>
              Would you like to extend your session?
            </p>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: 'row-reverse',
          }}>
            <button
              onClick={onExtend}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                fontFamily: 'var(--font-heading)',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
            >
              Stay Logged In
            </button>
            
            <button
              onClick={onLogout}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                fontFamily: 'var(--font-heading)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};