import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { C25kRegistrationForm } from './C25kRegistrationForm';
import { C25kRegistrationService } from '../../../services/c25kRegistrationService';
import { C25kRegistrationFormData } from '../../../types/c25k';

interface C25kExistingMemberRegistrationProps {
  onNavigate?: (page: string) => void;
}

export const C25kExistingMemberRegistration: React.FC<C25kExistingMemberRegistrationProps> = ({
  onNavigate
}) => {
  const { state } = useAuth();
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRegistration = async () => {
      if (!state.member?.id) return;
      const registered = await C25kRegistrationService.isAlreadyRegistered(state.member.id);
      setAlreadyRegistered(registered);
      setChecking(false);
    };
    checkRegistration();
  }, [state.member?.id]);

  if (checking) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-600)' }}>
        Checking registration status...
      </div>
    );
  }

  if (alreadyRegistered) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          background: '#dbeafe',
          color: '#1e40af',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px'
        }}>
          ✓
        </div>
        <h2 style={{ color: '#1e40af', marginBottom: '16px' }}>Already Registered</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '24px', lineHeight: '1.6' }}>
          You're already registered for the C25k 2026 programme!
          Your registration is being processed by the admin team.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate?.('dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          background: '#dcfce7',
          color: '#16a34a',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px',
          border: '3px solid #16a34a'
        }}>
          ✓
        </div>
        <h2 style={{ color: '#166534', marginBottom: '16px' }}>C25k Registration Complete!</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '16px', lineHeight: '1.6' }}>
          Thank you for registering for Couch to 5K 2026 with Run Alcester!
        </p>
        <div style={{
          background: '#fef3c7',
          padding: '16px',
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#92400e',
          lineHeight: '1.6'
        }}>
          <strong>What happens next?</strong>
          <br />
          An admin will review your registration and confirm your payment.
          You'll be able to see and book onto C25k runs once confirmed.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate?.('dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleSubmit = async (formData: C25kRegistrationFormData) => {
    if (!state.member?.id) throw new Error('Not logged in');

    const result = await C25kRegistrationService.registerExistingMember(
      state.member.id,
      formData
    );

    if (result.success) {
      setShowSuccess(true);
    } else {
      throw new Error(result.error || 'Registration failed');
    }
  };

  return (
    <div>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px' }}>
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="btn btn--secondary"
          style={{ marginBottom: '16px' }}
        >
          ← Back to Dashboard
        </button>
      </div>
      <C25kRegistrationForm
        isExistingMember
        existingMemberData={{
          full_name: state.member?.full_name || '',
          email: state.member?.email || '',
          phone: state.member?.phone || '',
          emergency_contact_name: state.member?.emergency_contact_name || '',
          emergency_contact_phone: state.member?.emergency_contact_phone || '',
          ea_urn: state.member?.ea_urn
        }}
        onSubmit={handleSubmit}
        onCancel={() => onNavigate?.('dashboard')}
      />
    </div>
  );
};
