// src/modules/auth/services/authService.ts
import { supabase } from '../../../services/supabase';
import { 
  LoginCredentials, 
  RegistrationData, 
  AuthResponse, 
  Member,
  EmailVerificationResult,
  PasswordResetData,
  UpdatePasswordData
} from '../types';
import { formatSupabaseError } from '../../../utils/validation';

// Smart data fetching: Get user with complete member profile in one call
export const getUserWithProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    return { data: null, error };
  }
};

// Login with automatic profile fetching
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    // If login successful, the auth state change will trigger profile fetching
    return {
      data: data.user,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// Register user with automatic member profile creation
export const registerUser = async (registerData: RegistrationData): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        data: {
          full_name: registerData.fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    // If user created successfully, create member profile
    if (data.user) {
      const memberData: Partial<Member> = {
        id: data.user.id,
        email: registerData.email,
        full_name: registerData.fullName,
        phone: registerData.phone || '',
        access_level: 'member',
        membership_status: 'pending', // Will be updated to 'active' after email verification
        emergency_contact_name: registerData.emergencyContactName || '',
        emergency_contact_phone: registerData.emergencyContactPhone || '',
        health_conditions: registerData.healthConditions || 'None disclosed',
        joined_at: new Date().toISOString(),
      };

      const { error: memberError } = await supabase
        .from('members')
        .insert([memberData]);

      if (memberError) {
        console.error('Error creating member profile:', memberError);
        // Don't fail the registration if member creation fails
        // The user can still log in and we can create the profile later
      }
    }

    return {
      data: data.user,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// Email verification
export const verifyEmail = async (token: string): Promise<EmailVerificationResult> => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      return {
        success: false,
        message: formatSupabaseError(error)
      };
    }

    // Update member status to active after successful email verification
    if (data.user) {
      const { error: updateError } = await supabase
        .from('members')
        .update({ membership_status: 'active' })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('Error updating member status:', updateError);
        // Don't fail verification if status update fails
      }
    }

    return {
      success: true,
      message: 'Email verified successfully! You can now log in.',
      user: data.user
    };
  } catch (error) {
    return {
      success: false,
      message: formatSupabaseError(error)
    };
  }
};

// Resend verification email
export const resendVerificationEmail = async (email: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      }
    });

    if (error) {
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    return {
      data: data,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// Password reset request
export const requestPasswordReset = async (data: PasswordResetData): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    return {
      data: { email: data.email },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// Update password
export const updatePassword = async (data: UpdatePasswordData): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: data.password
    });

    if (error) {
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    return {
      data: { success: true },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// Logout
export const logoutUser = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

// Get current session
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return { data: null, error };
    }

    return { data: data.session, error: null };
  } catch (error) {
    console.error('Unexpected error getting session:', error);
    return { data: null, error };
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return { data: null, error };
    }

    return { data: data.user, error: null };
  } catch (error) {
    console.error('Unexpected error getting user:', error);
    return { data: null, error };
  }
};

// Development helper: Clean up test user
export const cleanupTestUser = async (email: string): Promise<void> => {
  if (import.meta.env.DEV !== true) {
    console.warn('cleanupTestUser should only be used in development');
    return;
  }

  try {
    // Note: This requires admin privileges
    // In production, you'd use the Admin API
    console.log(`Cleaning up test user: ${email}`);
    
    // Delete from members table first (due to foreign key constraints)
    const { error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('email', email);

    if (memberError) {
      console.error('Error cleaning up member:', memberError);
    }
  } catch (error) {
    console.error('Error in cleanupTestUser:', error);
  }
};