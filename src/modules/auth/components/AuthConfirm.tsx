// src/modules/auth/components/AuthConfirm.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';

export const AuthConfirm: React.FC = () => {
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');

        if (token && type === 'signup') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
          });

          if (error) {
            console.error('Confirmation error:', error);
            setStatus('error');
            setMessage('Failed to confirm your email. Please try again or contact support.');
          } else {
            setStatus('success');
            setMessage('Email confirmed successfully! You can now log in.');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
              window.location.href = '/login?message=email_confirmed';
            }, 3000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link.');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--gray-50, #f9fafb)'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
        margin: '0 1rem'
      }}>
        {status === 'confirming' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
              Confirming your email...
            </h2>
            <p style={{ color: 'var(--gray-600)' }}>
              Please wait while we verify your account.
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: 'var(--green-600, #059669)', marginBottom: '0.5rem' }}>
              Email Confirmed!
            </h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
              {message}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
              Redirecting you to login in 3 seconds...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ color: 'var(--red-600, #dc2626)', marginBottom: '0.5rem' }}>
              Confirmation Failed
            </h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <a 
              href="/login" 
              style={{
                display: 'inline-block',
                background: 'var(--red-primary, #dc2626)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Go to Login
            </a>
          </>
        )}
      </div>
    </div>
  );
};