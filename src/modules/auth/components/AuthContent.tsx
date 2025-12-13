import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../../shared/layouts/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { SimpleAuthDebug } from '../../../utils/SimpleAuthDebug';

// Determine initial view based on URL parameters
const determineInitialView = (): 'login' | 'register' | 'forgot' | 'reset' | 'debug' => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  // Check for password reset flow first
  const searchType = urlParams.get('type');
  const hashType = hashParams.get('type');
  const type = searchType || hashType;

  const hashToken = hashParams.get('access_token');

  // Check for password recovery
  if (type === 'recovery') {
    console.log('🔄 Initial view: reset (password recovery)');
    return 'reset';
  }

  // Check for email verification
  if ((type === 'signup' || type === 'email') && hashToken) {
    console.log('🔄 Initial view: debug (email verification)');
    return 'debug';
  }

  // Check for invitation token (registration intent)
  const invitationToken = urlParams.get('token');
  const isRegisterPath = window.location.pathname.includes('/register');
  const isRegisterHash = window.location.hash.includes('register');

  if (invitationToken || isRegisterPath || isRegisterHash) {
    console.log('🔗 Invitation detected - showing registration form', {
      hasInvitationToken: !!invitationToken,
      isRegisterPath,
      isRegisterHash,
      token: invitationToken
    });
    return 'register';
  }

  // Default to login
  return 'login';
};

export const AuthContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'debug'>(determineInitialView);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Re-check if URL changes (e.g., user clicks invitation link while already on auth page)
  useEffect(() => {
    const newView = determineInitialView();
    if (newView !== currentView) {
      console.log('🔄 URL changed, updating view to:', newView);
      setCurrentView(newView);
    }
  }, [searchParams]);

  const handleLoginSuccess = () => {
    // Check if there's a stored redirect path
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } else {
      // Default redirect to dashboard/home
      navigate('/');
    }
  };

  // Show debug component for email verification
  if (currentView === 'debug') {
    return <SimpleAuthDebug />;
  }

  return (
    <AuthLayout>
      {currentView === 'login' && (
        <LoginForm 
          onSuccess={handleLoginSuccess}
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
            // Clear URL hash/search params
            window.history.replaceState({}, document.title, window.location.pathname);
            setCurrentView('login');
          }}
          onBack={() => setCurrentView('forgot')}
        />
      )}
    </AuthLayout>
  );
};