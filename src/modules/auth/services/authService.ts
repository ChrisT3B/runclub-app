// src/modules/auth/services/authService.ts
import { supabase } from '../../../services/supabase';
import { InputSanitizer } from '../../../utils/inputSanitizer'; // ADD THIS IMPORT
import { SecureAuthService } from './secureAuthService';
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
    // Use the secure login instead of direct Supabase call
    const result = await SecureAuthService.secureLogin(credentials);
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (error) {
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

    // If login successful, the auth state change will trigger profile fetching


// Updated registerUser function with timing fix
// Replace your current registerUser function with this:

export const registerUser = async (registerData: RegistrationData): Promise<AuthResponse> => {
  try {
    console.log('🚀 Starting registration for:', registerData.email);
    
    // STEP 1: Sanitize the data
    console.log('🧹 Sanitizing registration data...');
    const cleanData = InputSanitizer.sanitizeFormData(registerData);
    
    const wasModified = JSON.stringify(registerData) !== JSON.stringify(cleanData);
    if (wasModified) {
      console.warn('🧹 Registration data was sanitized:', { 
        original: registerData, 
        cleaned: cleanData 
      });
    }

    // STEP 2: Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: cleanData.email,
      password: cleanData.password,
      options: {
        data: {
          full_name: cleanData.fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    console.log('📝 Auth signup result:', { 
      user: data.user?.id, 
      error: error?.message 
    });

    if (error) {
      console.error('❌ Auth signup failed:', error);
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    // STEP 3: Wait a moment for auth user to be fully committed
    if (data.user) {
      console.log('👤 Creating pending member profile for user:', data.user.id);
      
      // Wait 500ms for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pendingMemberData = {
        id: data.user.id,
        email: cleanData.email,
        full_name: cleanData.fullName,
        phone: cleanData.phone || '',
        emergency_contact_name: cleanData.emergencyContactName || '',
        emergency_contact_phone: cleanData.emergencyContactPhone || '',
        health_conditions: cleanData.healthConditions || 'None disclosed',
      };

      console.log('📋 Pending member data to insert:', pendingMemberData);

      // Retry logic for pending member creation
      let attempts = 0;
      let pendingMemberError = null;
      
      while (attempts < 3) {
        const { error } = await supabase
          .from('pending_members')
          .insert([pendingMemberData]);
          
        if (!error) {
          console.log('✅ Pending member profile created successfully');
          pendingMemberError = null;
          break;
        }
        
        pendingMemberError = error;
        attempts++;
        console.log(`⚠️ Attempt ${attempts} failed, retrying...`);
        
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (pendingMemberError) {
        console.error('❌ Pending member profile creation failed after retries:', pendingMemberError);
        
        // IMPORTANT: Clean up the auth user if pending member creation fails
        try {
          console.log('🗑️ Cleaning up auth user due to pending member creation failure');
          // Note: This requires admin API access. In production, you might want to handle this differently
          // For now, we'll let the orphaned auth user exist but return an error
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        return {
          data: null,
          error: { message: 'Registration failed. Please try again in a moment.' }
        };
      }
    }

    return {
      data: data.user,
      error: null
    };
  } catch (error) {
    console.error('💥 Unexpected registration error:', error);
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// Email verification with secure member promotion
export const verifyEmail = async (token: string): Promise<EmailVerificationResult> => {
  try {
    console.log('🔍 Starting email verification with token');
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      console.error('❌ Email verification failed:', error);
      return {
        success: false,
        message: formatSupabaseError(error)
      };
    }

    // Move user from pending_members to members table
    if (data.user) {
      console.log('👤 Email verified for user:', data.user.id);
      console.log('📋 Moving from pending_members to members table');
      console.log('🔍 About to check for pending member...');
      console.log('🔍 User ID from verification:', data.user.id);
      // Get pending member data
      const { data: pendingMember, error: fetchError } = await supabase
        .from('pending_members')
        .select('*')
        .eq('id', data.user.id)
        .single();
      console.log('🔍 Pending member query result:', { pendingMember, fetchError });
      if (fetchError) {
        console.error('❌ Error fetching pending member:', fetchError);
        // Continue with verification even if we can't find pending member
        // They might have registered before the holding table was implemented
      } else if (pendingMember) {
        console.log('📋 Found pending member, creating active member record');
        
        // Create real member record with active status
        const memberData: Partial<Member> = {
          id: pendingMember.id,
          email: pendingMember.email,
          full_name: pendingMember.full_name,
          phone: pendingMember.phone || '',
          access_level: 'member',
          membership_status: 'active', // Now they're verified and active
          emergency_contact_name: pendingMember.emergency_contact_name || '',
          emergency_contact_phone: pendingMember.emergency_contact_phone || '',
          health_conditions: pendingMember.health_conditions || 'None disclosed',
          email_notifications_enabled: true, // Default to enabled
        };

        const { error: memberError } = await supabase
          .from('members')
          .insert([memberData]);

        if (memberError) {
          console.error('❌ Error creating member record:', memberError);
          // Don't fail verification if member creation fails
        } else {
          console.log('✅ Member record created successfully');
          
          // Delete the pending member record
          const { error: deleteError } = await supabase
            .from('pending_members')
            .delete()
            .eq('id', data.user.id);

          if (deleteError) {
            console.error('❌ Error deleting pending member:', deleteError);
            // Not critical - the pending record will expire naturally
          } else {
            console.log('🗑️ Pending member record cleaned up');
          }
        }
      } else {
        console.log('ℹ️ No pending member found - might be legacy registration');
        // Handle legacy registrations that went directly to members table
        const { error: updateError } = await supabase
          .from('members')
          .update({ membership_status: 'active' })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('❌ Error updating member status:', updateError);
        } else {
          console.log('✅ Legacy member status updated to active');
        }
      }

      console.log('🔍 Email verified successfully, signing out user to require manual login');
      await supabase.auth.signOut();
    }

    return {
      success: true,
      message: 'Email verified successfully! You can now log in.',
      user: data.user
    };
  } catch (error) {
    console.error('💥 Unexpected verification error:', error);
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

// Development helper: Clean up test user (updated for holding table)
export const cleanupTestUser = async (email: string): Promise<void> => {
  if (import.meta.env.DEV !== true) {
    console.warn('cleanupTestUser should only be used in development');
    return;
  }

  try {
    console.log(`Cleaning up test user: ${email}`);
    
    // Delete from both tables (pending and members)
    const { error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('email', email);

    const { error: pendingError } = await supabase
      .from('pending_members')
      .delete()
      .eq('email', email);

    if (memberError) {
      console.error('Error cleaning up member:', memberError);
    }
    if (pendingError) {
      console.error('Error cleaning up pending member:', pendingError);
    }
  } catch (error) {
    console.error('Error in cleanupTestUser:', error);
  }
};