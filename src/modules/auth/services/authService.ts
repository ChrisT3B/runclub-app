// src/modules/auth/services/authService.ts
import { supabase } from '../../../services/supabase'

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  healthConditions?: string;
}

export class AuthService {
  /**
   * Login user
   */
  static async login(credentials: LoginCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('Login failed - no user data received')
      }

      // Get the member profile data
      const memberData = await this.getMemberProfile(data.user.email!)
      
      // Explicitly construct user object (no spread operator issues)
      const finalUser = {
        id: data.user.id,
        aud: data.user.aud,
        role: data.user.role,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
        last_sign_in_at: data.user.last_sign_in_at,
        // Member profile data
        access_level: memberData.access_level,
        full_name: memberData.full_name,
        membership_status: memberData.membership_status,
        phone: memberData.phone,
        emergency_contact_name: memberData.emergency_contact_name,
        emergency_contact_phone: memberData.emergency_contact_phone,
        health_conditions: memberData.health_conditions,
        joined_at: memberData.joined_at
      };
      
      return finalUser;
    } catch (error) {
      console.error('AuthService.login error:', error)
      throw error
    }
  }

  /**
   * Register user
   */
  static async register(registrationData: RegistrationData) {
    try {
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            full_name: registrationData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('Registration failed - no user data received')
      }

      // Create member profile record
      const { error: profileError } = await supabase
        .from('members')
        .insert({
          id: data.user.id,
          email: registrationData.email,
          full_name: registrationData.fullName,
          phone: registrationData.phone || null,
          emergency_contact_name: registrationData.emergencyContactName || null,
          emergency_contact_phone: registrationData.emergencyContactPhone || null,
          health_conditions: registrationData.healthConditions || null,
          access_level: 'member',
          membership_status: 'pending',
          joined_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error('Failed to create member profile:', profileError)
        // Don't throw here - user auth was successful
      }

      // Check if email confirmation is required
      if (!data.session) {
        throw new Error('Registration successful! Please check your email for a confirmation link.')
      }

      // User was confirmed immediately
      return {
        id: data.user.id,
        aud: data.user.aud,
        role: data.user.role,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
        full_name: registrationData.fullName,
        access_level: 'member',
        membership_status: 'active'
      }
    } catch (error) {
      console.error('AuthService.register error:', error)
      throw error
    }
  }

  /**
   * Get current user with member profile
   */
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        throw new Error(error.message)
      }

      if (!user) {
        return null
      }

      // Get member profile data
      const memberData = await this.getMemberProfile(user.email!)
      
      // Explicitly construct final user object
      const finalUser = {
        id: user.id,
        aud: user.aud,
        role: user.role,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
        // Member profile data
        access_level: memberData.access_level,
        full_name: memberData.full_name,
        membership_status: memberData.membership_status,
        phone: memberData.phone,
        emergency_contact_name: memberData.emergency_contact_name,
        emergency_contact_phone: memberData.emergency_contact_phone,
        health_conditions: memberData.health_conditions,
        joined_at: memberData.joined_at
      };

      return finalUser;
    } catch (error) {
      console.error('AuthService.getCurrentUser error:', error)
      return null
    }
  }

  /**
   * Get member profile data with RLS protection
   */
  static async getMemberProfile(email: string) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          // No member profile found
          return {
            id: null,
            full_name: 'Unknown User',
            access_level: 'member',
            membership_status: 'pending',
            phone: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            health_conditions: null,
            joined_at: null
          }
        }
        
        if (error.code === 'PGRST301') {
          // RLS blocked access
          return {
            id: null,
            full_name: 'Unknown User',
            access_level: 'member',
            membership_status: 'pending',
            phone: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            health_conditions: null,
            joined_at: null
          }
        }
        
        throw new Error(error.message)
      }

      // Return member profile data
      return {
        id: data.id,
        full_name: data.full_name || 'Unknown User',
        phone: data.phone,
        access_level: data.access_level || 'member',
        membership_status: data.membership_status || 'pending',
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        health_conditions: data.health_conditions,
        joined_at: data.joined_at
      }
    } catch (error) {
      console.error('AuthService.getMemberProfile error:', error)
      
      // Return safe default data on any error
      return {
        id: null,
        full_name: 'Unknown User',
        access_level: 'member',
        membership_status: 'pending',
        phone: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        health_conditions: null,
        joined_at: null
      }
    }
  }

  /**
   * Logout user
   */
  static async logout() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('AuthService.logout error:', error)
      throw error
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('AuthService.resetPassword error:', error)
      throw error
    }
  }

  /**
   * Update password (after reset)
   */
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('AuthService.updatePassword error:', error)
      throw error
    }
  }

  /**
   * Set up auth state change listener
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}