// src/modules/auth/components/SessionSecurityWrapper.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useSessionRestore } from '../hooks/useSessionRestore';
import { SessionWarningModal } from '../../../shared/components/ui/SessionWarningModal';

interface SessionSecurityWrapperProps {
  children: React.ReactNode;
}

export const SessionSecurityWrapper: React.FC<SessionSecurityWrapperProps> = ({ children }) => {
  const { state, logout } = useAuth();
  const { timeRemaining, showWarning, extendSession } = useSessionTimeout();
  useSessionRestore();

  // Handle logout (convert Promise to void function)
  const handleLogout = () => {
    logout('warning_modal').catch(console.error);
  };

  // Only apply session security to authenticated users
  if (!state.isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <SessionWarningModal
        isOpen={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </>
  );
};