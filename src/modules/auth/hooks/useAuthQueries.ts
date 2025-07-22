// src/modules/auth/hooks/useAuthQueries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  loginUser, 
  registerUser, 
  verifyEmail, 
  resendVerificationEmail,
  requestPasswordReset,
  updatePassword,
  logoutUser,
  getCurrentSession,
  getCurrentUser,
  getUserWithProfile
} from '../services/authService';
import { 
  LoginCredentials, 
  RegistrationData, 
  PasswordResetData, 
  UpdatePasswordData 
} from '../types';

// Query keys for cache management
export const authQueryKeys = {
  session: ['auth', 'session'] as const,
  user: ['auth', 'user'] as const,
  userProfile: (userId: string) => ['auth', 'user', userId, 'profile'] as const,
};

// Get current session query
export const useSessionQuery = () => {
  return useQuery({
    queryKey: authQueryKeys.session,
    queryFn: getCurrentSession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Get current user query
export const useUserQuery = () => {
  return useQuery({
    queryKey: authQueryKeys.user,
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    enabled: true,
  });
};

// Get user profile query (with caching)
export const useUserProfileQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: authQueryKeys.userProfile(userId || ''),
    queryFn: () => getUserWithProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

// Login mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUser(credentials),
    onSuccess: (data) => {
      if (data.data) {
        // Invalidate and refetch auth-related queries
        queryClient.invalidateQueries({ queryKey: authQueryKeys.session });
        queryClient.invalidateQueries({ queryKey: authQueryKeys.user });
        queryClient.invalidateQueries({ 
          queryKey: authQueryKeys.userProfile(data.data.id) 
        });
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
    }
  });
};

// Register mutation
export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (registerData: RegistrationData) => registerUser(registerData),
    onSuccess: (data) => {
      if (data.data) {
        // Pre-populate the user cache
        queryClient.setQueryData(authQueryKeys.user, {
          data: data.data,
          error: null
        });
      }
    },
    onError: (error) => {
      console.error('Registration error:', error);
    }
  });
};

// Email verification mutation
export const useVerifyEmailMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (token: string) => verifyEmail(token),
    onSuccess: (data) => {
      if (data.success && data.user) {
        // Update user profile cache to reflect active status
        queryClient.invalidateQueries({ 
          queryKey: authQueryKeys.userProfile(data.user.id) 
        });
        queryClient.invalidateQueries({ queryKey: authQueryKeys.user });
      }
    },
    onError: (error) => {
      console.error('Email verification error:', error);
    }
  });
};

// Resend verification email mutation
export const useResendVerificationMutation = () => {
  return useMutation({
    mutationFn: (email: string) => resendVerificationEmail(email),
    onError: (error) => {
      console.error('Resend verification error:', error);
    }
  });
};

// Password reset request mutation
export const usePasswordResetMutation = () => {
  return useMutation({
    mutationFn: (data: PasswordResetData) => requestPasswordReset(data),
    onError: (error) => {
      console.error('Password reset error:', error);
    }
  });
};

// Update password mutation
export const useUpdatePasswordMutation = () => {
  return useMutation({
    mutationFn: (data: UpdatePasswordData) => updatePassword(data),
    onError: (error) => {
      console.error('Update password error:', error);
    }
  });
};

// Logout mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => logoutUser(),
    onSuccess: () => {
      // Clear all auth-related cache
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.clear(); // Clear entire cache for security
    },
    onError: (error) => {
      console.error('Logout error:', error);
    }
  });
};

// Custom hook for auth state management
export const useAuthState = () => {
  const sessionQuery = useSessionQuery();
  const userQuery = useUserQuery();
  const userProfileQuery = useUserProfileQuery(userQuery.data?.data?.id);
  
  const isLoading = sessionQuery.isLoading || userQuery.isLoading;
  const isAuthenticated = !!(sessionQuery.data?.data && userQuery.data?.data);
  const user = userQuery.data?.data;
  const member = userProfileQuery.data?.data;
  const session = sessionQuery.data?.data;
  
  return {
    isLoading,
    isAuthenticated,
    user,
    member,
    session,
    isInitialized: !isLoading,
    error: sessionQuery.error || userQuery.error || userProfileQuery.error
  };
};

// Permission calculations
export const usePermissions = () => {
  const { member } = useAuthState();
  
  if (!member) {
    return {
      canManageRuns: false,
      canManageMembers: false,
      canViewAllBookings: false,
      canAssignLIRF: false,
      accessLevel: 'member' as const
    };
  }
  
  const accessLevel = member.access_level;
  
  return {
    canManageRuns: ['admin', 'lirf'].includes(accessLevel),
    canManageMembers: accessLevel === 'admin',
    canViewAllBookings: ['admin', 'lirf'].includes(accessLevel),
    canAssignLIRF: ['admin', 'lirf'].includes(accessLevel),
    accessLevel
  };
};