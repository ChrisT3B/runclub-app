// src/modules/auth/context/AuthContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { 
  useAuthState, 
  usePermissions,
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  usePasswordResetMutation,
  useUpdatePasswordMutation,
  useLogoutMutation,
  authQueryKeys
} from '../hooks/useAuthQueries';
import { 
  LoginCredentials, 
  RegistrationData, 
  UpdatePasswordData,
  AuthContextValue
} from '../types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const authState = useAuthState();
  const permissions = usePermissions();
  
  // Mutations
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const verifyEmailMutation = useVerifyEmailMutation();
  const resendVerificationMutation = useResendVerificationMutation();
  const resetPasswordMutation = usePasswordResetMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();
  const logoutMutation = useLogoutMutation();
  
  // Action wrappers that return the mutation promises
const login = async (credentials: LoginCredentials) => {
  const result = await loginMutation.mutateAsync(credentials);
  
  // Only throw if there's actually an error message
  if (result.error && result.error.message) {
    throw new Error(result.error.message);
  }
  
  return result;
};
  
  const register = async (data: RegistrationData) => {
    return registerMutation.mutateAsync(data);
  };
  
  const logout = async () => {
    return logoutMutation.mutateAsync();
  };
  
  const verifyEmail = async (token: string) => {
    return verifyEmailMutation.mutateAsync(token);
  };
  
  const resendVerification = async (email: string) => {
    return resendVerificationMutation.mutateAsync(email);
  };
  
  const resetPassword = async (email: string) => {
    return resetPasswordMutation.mutateAsync({ email });
  };
  
  const updatePassword = async (data: UpdatePasswordData) => {
    return updatePasswordMutation.mutateAsync(data);
  };
  
  // Listen for auth state changes from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN') {
          // Invalidate queries to refetch user data
          queryClient.invalidateQueries({ queryKey: authQueryKeys.session });
          queryClient.invalidateQueries({ queryKey: authQueryKeys.user });
          
          if (session?.user?.id) {
            queryClient.invalidateQueries({ 
              queryKey: authQueryKeys.userProfile(session.user.id) 
            });
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear all auth-related cache
          queryClient.removeQueries({ queryKey: ['auth'] });
        } else if (event === 'TOKEN_REFRESHED') {
          // Update session cache
          queryClient.setQueryData(authQueryKeys.session, {
            data: session,
            error: null
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);
  
  // Build the context value matching your existing interface
  const value: AuthContextValue = {
    // State - map React Query state to your existing interface
    state: {
      user: authState.user,
      member: authState.member,
      session: authState.session,
      loading: authState.isLoading,
      error: authState.error?.message || 
       loginMutation.data?.error?.message || 
       null,
      isAuthenticated: authState.isAuthenticated,
      isInitialized: authState.isInitialized,
    },
    
    // Actions
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    verifyEmail,
    resendVerification,
    permissions,
    
    // Mutation states (for loading indicators in components)
    loginMutation,
    registerMutation,
    verifyEmailMutation,
    resendVerificationMutation,
    resetPasswordMutation,
    updatePasswordMutation,
    logoutMutation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
  };