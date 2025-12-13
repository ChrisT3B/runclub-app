import React, { useState } from 'react';
import { InvitationService } from '../../../services/invitationService';
import { useAuth } from '../../../modules/auth/context/AuthContext';

interface SendInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendInvitationModal: React.FC<SendInvitationModalProps> = ({ isOpen, onClose }) => {
  const { state } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await InvitationService.sendInvitation(email, state.user?.id);

    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    if (result.success) {
      setEmail('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    }

    setLoading(false);
  };

  const handleClose = () => {
    setEmail('');
    setMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--gray-900)' }}>
            Send Invitation
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--gray-500)',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '20px' }}>
          Send a registration invitation to a new member's email address.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="invitation-email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '8px'
              }}
            >
              Email Address *
            </label>
            <input
              id="invitation-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="member@example.com"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--gray-300)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: '12px',
                marginBottom: '20px',
                borderRadius: '6px',
                fontSize: '14px',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: message.type === 'success' ? '#166534' : '#dc2626'
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn btn--secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="btn btn--primary"
              style={{ flex: 1 }}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendInvitationModal;
