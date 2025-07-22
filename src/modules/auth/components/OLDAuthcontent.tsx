import React, { useState, useEffect } from 'react';
import { AuthLayout } from '../../../shared/layouts/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { supabase } from '../../../services/supabase';

export const AuthContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'confirming' | 'confirmed'>('login');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    // Check URL parameters for different auth flows
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const token = urlParams.get('token');

    if (type === 'recovery') {
      setCurrentView('reset');
    } else if (type === 'signup' && token) {
      // Handle email confirmation
      handleEmailConfirmation(token);
    }
  }, []);

  const handleEmailConfirmation = async (token: string) => {
    setCurrentView('confirming');
    
    try {
      // Verify the email confirmation token
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        console.error('Confirmation error:', error);
        setConfirmationMessage('Failed to confirm your email. Please try again or contact support.');
        setCurrentView('confirmed');
        return;
      }

      // Email confirmed successfully
      // Update member status from 'pending' to 'member'
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: updateError } = await supabase
          .from('members')
          .update({ membership_status: 'active' })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating member status:', updateError);
        }
      }

      setConfirmationMessage('Email confirmed successfully! You can now log in to your account.');
      setCurrentView('confirmed');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setCurrentView('login');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 3000);

    } catch (error) {
      console.error('Unexpected confirmation error:', error);
      setConfirmationMessage('An unexpected error occurred. Please try again.');
      setCurrentView('confirmed');
    }
  };

  // Confirmation loading view
  if (currentView === 'confirming') {
    return (
      <AuthLayout>
        <div style={{ 
          maxWidth: '400px', 
          margin: '0 auto', 
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ color: 'var(--red-primary)', marginBottom: '0.5rem' }}>
            Confirming your email...
          </h2>
          <p style={{ color: 'var(--gray-600)' }}>
            Please wait while we verify your account.
          </p>
        </div>
      </AuthLayout>
    );
  }

  // Confirmation result view
  if (currentView === 'confirmed') {
    const isSuccess = confirmationMessage.includes('successfully');
    
    return (
      <AuthLayout>
        <div style={{ 
          maxWidth: '400px', 
          margin: '0 auto', 
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            {isSuccess ? '✅' : '❌'}
          </div>
          <h2 style={{ 
            color: isSuccess ? 'var(--green-600, #059669)' : 'var(--red-600, #dc2626)', 
            marginBottom: '0.5rem' 
          }}>
            {isSuccess ? 'Email Confirmed!' : 'Confirmation Failed'}
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            {confirmationMessage}
          </p>
          
          {isSuccess ? (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '1rem' }}>
                Redirecting you to login in 3 seconds...
              </p>
              <button 
                onClick={() => setCurrentView('login')}
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
              >
                Go to Login Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setCurrentView('login')}
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
              >
                Go to Login
              </button>
              <button 
                onClick={() => setCurrentView('register')}
                className="btn btn-secondary"
                style={{ padding: '12px 24px' }}
              >
                Register Again
              </button>
            </div>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {currentView === 'login' && (
        <LoginForm 
          onSuccess={() => console.log('Login successful!')}
          onForgotPassword={() => setCurrentView('forgot')}
          onRegister={() => setCurrentView('register')}
        />
      )}
      
      {currentView === 'register' && (
        <RegisterForm 
          onSuccess={() => console.log('Registration successful!')}
          onLogin={() => setCurrentView('login')}
        />
      )}
      
      {currentView === 'forgot' && (
        <ForgotPasswordForm 
          onBack={() => setCurrentView('login')}
        />
      )}
      
      {currentView === 'reset' && (
        <PasswordResetForm 
          onSuccess={() => {
            alert('Password updated successfully! Please log in with your new password.');
            setCurrentView('login');
          }}
          onBack={() => setCurrentView('forgot')}
        />
      )}
    </AuthLayout>
  );
};