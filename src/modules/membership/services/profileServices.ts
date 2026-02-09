// src/modules/membership/services/profileServices.ts
import { supabase } from '../../../services/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SQLSecurityValidator, SecureQueryBuilder } from '../../../utils/sqlSecurityValidator';
import { InputSanitizer } from '../../../utils/inputSanitizer';
import { validateCsrfToken, getCsrfToken } from '../../../utils/csrfProtection';

export interface ProfileUpdateData {
  fullName: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  email_notifications_enabled?: boolean;
}

// Query keys for profile cache management
export const profileQueryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
};

export class ProfileService {
  /**
   * Update user profile in the database
   */
  static async updateProfile(userId: string, profileData: ProfileUpdateData) {
    try {
      // Security validation
      const cleanUserId = SecureQueryBuilder.validateUserQuery(userId);
      const sanitizedData = InputSanitizer.sanitizeFormData(profileData);
      
      // Email validation
      const emailValidation = SQLSecurityValidator.validateEmailForDB(sanitizedData.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      // SQL injection check for text fields
      const textFields = [
        sanitizedData.fullName,
        sanitizedData.phone,
        sanitizedData.emergencyContact,
        sanitizedData.emergencyPhone,
        sanitizedData.medicalInfo
      ].filter((field): field is string => typeof field === 'string' && field.length > 0);

      for (const field of textFields) {
        if (SQLSecurityValidator.containsSQLInjection(field)) {
          console.error('🚨 SQL injection attempt blocked in profile update:', field);
          throw new Error('Invalid input detected');
        }
      }

      // ========== CSRF VALIDATION ==========
      console.log('🔒 Validating CSRF token for profile update...');
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('❌ CSRF validation failed: No token found');
        throw new Error('CSRF_TOKEN_MISSING');
      }
      const csrfValidation = await validateCsrfToken(csrfToken, cleanUserId);
      if (!csrfValidation.isValid) {
        console.error('❌ CSRF validation failed:', csrfValidation.error);
        throw new Error('CSRF_VALIDATION_FAILED');
      }
      console.log('✅ CSRF token validated - proceeding with profile update');
      // ========== END: CSRF VALIDATION ==========

      // Update profile in database
      const { data, error } = await supabase
        .from('members')
        .update({
          full_name: sanitizedData.fullName,
          email: emailValidation.clean,
          phone: sanitizedData.phone || null,
          emergency_contact_name: sanitizedData.emergencyContact || null,
          emergency_contact_phone: sanitizedData.emergencyPhone || null,
          health_conditions: sanitizedData.medicalInfo || null,
          email_notifications_enabled: sanitizedData.email_notifications_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', cleanUserId)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile from database
   */
  static async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', SecureQueryBuilder.validateUserQuery(userId))
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  }

  /**
   * Update user email in Supabase Auth (if email changed)
   */
  static async updateEmail(newEmail: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        console.error('Email update error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Failed to update email:', error);
      throw error;
    }
  }
}

// React Query hook for profile data
export const useProfileQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: profileQueryKeys.profile(userId || ''),
    queryFn: () => ProfileService.getProfile(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter than auth context for fresh data
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};

// Hook for invalidating profile cache after updates
export const useInvalidateProfile = () => {
  const queryClient = useQueryClient();
  
  return (userId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: profileQueryKeys.profile(userId) 
    });
  };
};