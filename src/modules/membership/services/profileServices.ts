import { supabase } from '../../../services/supabase';

export interface ProfileUpdateData {
  fullName: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
}

export class ProfileService {
  /**
   * Update user profile in the database
   */
  static async updateProfile(userId: string, profileData: ProfileUpdateData) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({
          full_name: profileData.fullName,
          email: profileData.email,
          phone: profileData.phone || null,
          emergency_contact_name: profileData.emergencyContact || null,
          emergency_contact_phone: profileData.emergencyPhone || null,
          health_conditions: profileData.medicalInfo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
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
        .eq('id', userId)
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