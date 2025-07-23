import React, { useEffect } from 'react';
import { useAuth } from '../modules/auth/context/AuthContext';
import { AuthContent } from '../modules/auth/components/AuthContent';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectPath 
}) => {
  const { state } = useAuth();

  useEffect(() => {
    // Store the intended destination for after login
    if (redirectPath && !state.isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', redirectPath);
    }
  }, [redirectPath, state.isAuthenticated]);

  // Show loading while checking authentication
  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login with context about what they're trying to access
  if (!state.isAuthenticated) {
    return <AuthContent />;
  }

  // If authenticated, show the protected content
  return <>{children}</>;
};