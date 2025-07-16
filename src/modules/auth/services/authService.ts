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

    // IMPORTANT: Get the member profile data
    const memberData = await this.getMemberProfile(data.user.email!)
    console.log('=== Login getMemberProfile returned ===', memberData); // DEBUG
    
    const finalUser = {
      ...data.user,
      access_level: memberData.access_level,
      full_name: memberData.full_name,
      membership_status: memberData.membership_status,
      phone: memberData.phone,
      emergency_contact_name: memberData.emergency_contact_name,
      emergency_contact_phone: memberData.emergency_contact_phone,
      health_conditions: memberData.health_conditions,
      joined_at: memberData.joined_at
    };
    
    console.log('=== Login final user ===', finalUser); // DEBUG
    
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
      // First, register the user with Supabase Auth
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
      // Note: This will work because new users get a temporary session during signup
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
          membership_status: 'pending', // Will be activated when email confirmed
          joined_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error('Failed to create member profile:', profileError)
        // Don't throw here - user auth was successful, profile creation can be retried
      }

      // Check if email confirmation is required
      if (!data.session) {
        // Email confirmation required
        throw new Error('Registration successful! Please check your email for a confirmation link.')
      }

      // If we get here, user was confirmed immediately
      return {
        ...data.user,
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
    console.log('=== AuthService.getCurrentUser() called ===');
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        throw new Error(error.message)
      }

      if (!user) {
        console.log('No user found'); // DEBUG
        return null
      }
      console.log('Auth user:', user); // DEBUG
      console.log('Getting member profile for:', user.email); // DEBUG
      
      // Get member profile with RLS protection
      const memberData = await this.getMemberProfile(user.email!)
      console.log('Member data returned:', memberData); // DEBUG
      const finalUser = {
      ...user,
      ...memberData
      };
    
      console.log('Final user object:', finalUser); // DEBUG
      return {
        ...user,
        ...memberData
      }
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
      console.log('Getting member profile for:', email); // DEBUG
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .single()
      console.log('Query result - data:', data, 'error:', error); // DEBUG

      if (error) {
         console.log('Error code:', error.code, 'Error message:', error.message); // DEBUG
        // If RLS blocks this, user might not have a profile yet
        if (error.code === 'PGRST116') {
          console.warn('No member profile found for:', email)
          return {
            full_name: 'Unknown User',
            access_level: 'member',
            membership_status: 'pending'
          }
        }
        
        if (error.code === 'PGRST301') {
          console.warn('RLS blocked member profile access for:', email)
          return {
            full_name: 'Unknown User',
            access_level: 'member',
            membership_status: 'pending'
          }
        }
        
        throw new Error(error.message)
      }
      console.log('Loaded member data:', data); // DEBUG
      return {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        access_level: data.access_level,
        membership_status: data.membership_status,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        health_conditions: data.health_conditions,
        joined_at: data.joined_at
      }
    } catch (error) {
      console.error('AuthService.getMemberProfile error:', error)
      console.log('Returning default member data due to error'); // DEBUG
      // Return default data if profile fetch fails
      return {
        full_name: 'Unknown User',
        access_level: 'member',
        membership_status: 'pending'
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