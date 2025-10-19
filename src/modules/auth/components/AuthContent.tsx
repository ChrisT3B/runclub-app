import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../../shared/layouts/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { PasswordResetForm } from '../components/PasswordResetForm';
import { SimpleAuthDebug } from '../../../utils/SimpleAuthDebug';

export const AuthContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'debug'>('login');
  const navigate = useNavigate();

  useEffect(() => {
    // Check both URL search parameters AND hash parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Parse hash parameters (where Supabase puts recovery info)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Get type from either location
    const searchType = urlParams.get('type');
    const hashType = hashParams.get('type');
    const type = searchType || hashType;
    
    // Get token from either location
    const searchToken = urlParams.get('token');
    const hashToken = hashParams.get('access_token'); // Supabase uses 'access_token' in hash
    const token = searchToken || hashToken;

    console.log('AuthContent loaded with params:', { 
      searchType, 
      hashType, 
      finalType: type,
      token: token ? 'present' : 'none',
      fullHash: window.location.hash,
      fullSearch: window.location.search
    });

    if (type === 'recovery') {
      console.log('🔄 Setting view to reset for password recovery');
      setCurrentView('reset');
    } else if ((type === 'signup' || type === 'email') && token) {
      // Show debug component for email verification
      setCurrentView('debug');
    }
  }, []);

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