import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  actionText?: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  title = 'Error',
  message,
  onClose,
  actionText = 'OK'
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            animation: 'modalSlideIn 0.3s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              ⚠️
            </div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--red-primary)',
              fontFamily: 'var(--font-heading)'
            }}>
              {title}
            </h3>
          </div>

          {/* Message */}
          <div style={{
            marginBottom: '24px',
            color: 'var(--gray-700)',
            lineHeight: '1.5',
            fontFamily: 'var(--font-body)'
          }}>
            {message}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {actionText}
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