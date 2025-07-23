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
    // Check URL parameters for different auth flows
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const token = urlParams.get('token');

    console.log('AuthContent loaded with params:', { type, token: token ? 'present' : 'none' });

    if (type === 'recovery') {
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
            setCurrentView('login');
          }}
          onBack={() => setCurrentView('forgot')}
        />
      )}
    </AuthLayout>
  );
};