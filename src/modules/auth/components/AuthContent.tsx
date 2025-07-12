import React, { useState, useEffect } from 'react';
import { AuthLayout } from '../../../shared/layouts/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { PasswordResetForm } from '../components/PasswordResetForm';

export const AuthContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  useEffect(() => {
    // Check if this is a password reset link
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    if (type === 'recovery') {
      setCurrentView('reset');
    }
  }, []);

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