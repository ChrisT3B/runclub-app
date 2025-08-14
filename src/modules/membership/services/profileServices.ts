import { supabase } from '../../../services/supabase';
import { SQLSecurityValidator, SecureQueryBuilder } from '../../../utils/sqlSecurityValidator';
import { InputSanitizer } from '../../../utils/inputSanitizer'; // ADD THIS


// Test UUID validation
console.log(SQLSecurityValidator.validateUUID('valid-uuid-here'));
console.log(SQLSecurityValidator.validateUUID('malicious-input'));

export interface ProfileUpdateData {
  fullName: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  email_notifications_enabled?: boolean; // ADD THIS LINE
}

export class ProfileService {
  /**
   * Update user profile in the database
   */
// REPLACE your existing updateProfile function with this:
static async updateProfile(userId: string, profileData: ProfileUpdateData) {
  try {
    // ADD: Security validation
    const cleanUserId = SecureQueryBuilder.validateUserQuery(userId);
    const sanitizedData = InputSanitizer.sanitizeFormData(profileData);
    
    // ADD: Email validation
    const emailValidation = SQLSecurityValidator.validateEmailForDB(sanitizedData.email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.error);
    }

    // ADD: SQL injection check for text fields
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

    // KEEP your existing Supabase query, just update the data references:
    const { data, error } = await supabase
      .from('members')
      .update({
        full_name: sanitizedData.fullName,                    // CHANGE: was profileData.fullName
        email: emailValidation.clean,                         // CHANGE: was profileData.email
        phone: sanitizedData.phone || null,                   // CHANGE: was profileData.phone
        emergency_contact_phone: sanitizedData.emergencyPhone || null,      // CHANGE: was profileData.emergencyPhone
        health_conditions: sanitizedData.medicalInfo || null,               // CHANGE: was profileData.medicalInfo
        email_notifications_enabled: sanitizedData.email_notifications_enabled, // CHANGE: was profileData.email_notifications_enabled
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanUserId)  // CHANGE: was userId
      .select()
      .single();

    // KEEP your existing error handling
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