import { supabase } from '../../../services/supabase'
import type { User, LoginCredentials, RegistrationData } from '../types/index'

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<User> {
    console.log('Login attempt with:', credentials.email)
    
    const { email, password } = credentials

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    console.log('Supabase login response:', { data, error })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Authentication failed')
    }

    // Check email verification
    if (!data.user.email_confirmed_at) {
      throw new Error('Please check your email and click the verification link before signing in.')
    }

    // Try to get member profile from database
    try {
      const memberProfile = await this.getMemberProfile(data.user.id)
      
      return {
        id: data.user.id,
        email: data.user.email!,
        fullName: memberProfile.full_name,
        accessLevel: memberProfile.access_level,
        membershipStatus: memberProfile.membership_status,
        emailVerified: data.user.email_confirmed_at !== null,
      }
    } catch (error) {
      console.error('Could not get member profile:', error)
      
      // If no member profile exists, create one for verified users
      if (data.user.email_confirmed_at) {
        try {
          await this.createMemberProfile(data.user)
          // Try to get the profile again after creation
          const memberProfile = await this.getMemberProfile(data.user.id)
          return {
            id: data.user.id,
            email: data.user.email!,
            fullName: memberProfile.full_name,
            accessLevel: memberProfile.access_level,
            membershipStatus: memberProfile.membership_status,
            emailVerified: true,
          }
        } catch (createError) {
          console.error('Failed to create member profile:', createError)
        }
      }
      
      // Fallback to basic user info
      return {
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name || 'User',
        accessLevel: 'member',
        membershipStatus: 'active',
        emailVerified: data.user.email_confirmed_at !== null,
      }
    }
  }

  /**
   * Register new user and create member profile
   */
  static async register(registrationData: RegistrationData): Promise<User> {
    console.log('🚀 REGISTRATION STARTING with email:', registrationData.email)
    
    const { email, password, fullName } = registrationData

    // Validate input
    if (!email || !password || !fullName) {
      throw new Error('Email, password, and full name are required')
    }

    // Validate password strength
    this.validatePassword(password)

    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          phone: registrationData.phone || null,
          emergency_contact_name: registrationData.emergencyContactName || null,
          emergency_contact_phone: registrationData.emergencyContactPhone || null,
          health_conditions: registrationData.healthConditions || null,
        },
        emailRedirectTo: `${window.location.origin}/login`
      },
    })

    console.log('Supabase registration response:', { data, error })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Registration failed')
    }

    // Check if user needs email verification
    if (!data.user.email_confirmed_at) {
      // Don't create the member profile yet - wait for email confirmation
      throw new Error('Please check your email and click the verification link to complete registration.')
    }

    // If email is already confirmed (shouldn't happen with current setup), create profile
    try {
      await this.createMemberProfileFromRegistration(data.user, registrationData)
    } catch (createError) {
      console.error('❌ Error creating member profile:', createError)
    }

    return {
      id: data.user.id,
      email: data.user.email!,
      fullName: fullName,
      accessLevel: 'member',
      membershipStatus: 'active',
      emailVerified: data.user.email_confirmed_at !== null,
    }
  }

  /**
   * Sign out current user
   */
  static async logout(): Promise<void> {
    console.log('Logout attempt')
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    console.log('🔄 Password reset attempt for:', email)
    
    if (!email) {
      throw new Error('Email is required')
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${window.location.origin}/?type=recovery`,
      }
    )

    console.log('📧 Password reset response:', { data, error })

    if (error) {
      console.error('❌ Password reset error:', error)
      throw new Error(error.message)
    }

    console.log('✅ Password reset email sent successfully')
  }

  /**
   * Get current user session
   */
  static async getCurrentUser(): Promise<User | null> {
    console.log('Getting current user')
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('No current user or error:', error)
      return null
    }

    // Try to get member profile
    try {
      const memberProfile = await this.getMemberProfile(user.id)
      
      return {
        id: user.id,
        email: user.email!,
        fullName: memberProfile.full_name,
        accessLevel: memberProfile.access_level,
        membershipStatus: memberProfile.membership_status,
        emailVerified: user.email_confirmed_at !== null,
      }
    } catch (error) {
      console.error('Could not get member profile:', error)
      
      // If no member profile exists, create one for verified users
      if (user.email_confirmed_at) {
        try {
          await this.createMemberProfile(user)
          // Try to get the profile again after creation
          const memberProfile = await this.getMemberProfile(user.id)
          return {
            id: user.id,
            email: user.email!,
            fullName: memberProfile.full_name,
            accessLevel: memberProfile.access_level,
            membershipStatus: memberProfile.membership_status,
            emailVerified: true,
          }
        } catch (createError) {
          console.error('Failed to create member profile:', createError)
        }
      }
      
      // Fallback to basic user info
      return {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name || 'User',
        accessLevel: 'member',
        membershipStatus: 'active',
        emailVerified: user.email_confirmed_at !== null,
      }
    }
  }

  /**
   * Get member profile from database
   */
  private static async getMemberProfile(userId: string) {
    console.log('🔍 Getting member profile for user ID:', userId)
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single()

    console.log('📊 Member profile query result:', { data, error })

    if (error) {
      console.error('❌ Member profile query error:', error)
      throw new Error('Failed to fetch member profile: ' + error.message)
    }

    if (!data) {
      console.error('❌ No member data returned')
      throw new Error('No member profile found')
    }

    console.log('✅ Member profile found:', data)
    return data
  }

  /**
   * Create member profile for verified user (basic profile)
   */
  private static async createMemberProfile(user: any): Promise<void> {
    console.log('🔄 Creating member profile for verified user:', user.email)
    
    const { error } = await supabase
      .from('members')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'User',
        phone: user.user_metadata?.phone || null,
        emergency_contact_name: user.user_metadata?.emergency_contact_name || null,
        emergency_contact_phone: user.user_metadata?.emergency_contact_phone || null,
        health_conditions: user.user_metadata?.health_conditions || null,
        membership_status: 'active',
        access_level: 'member'
      })
    
    if (error) {
      console.error('❌ Failed to create member profile:', error)
      throw new Error('Failed to create member profile')
    }
    
    console.log('✅ Member profile created successfully')
  }

  /**
   * Create member profile with full registration data
   */
  private static async createMemberProfileFromRegistration(user: any, registrationData: RegistrationData): Promise<void> {
    console.log('🔄 Creating member profile from registration data for:', user.email)
    
    const { error } = await supabase
      .from('members')
      .insert({
        id: user.id,
        email: user.email,
        full_name: registrationData.fullName,
        phone: registrationData.phone || null,
        emergency_contact_name: registrationData.emergencyContactName || null,
        emergency_contact_phone: registrationData.emergencyContactPhone || null,
        health_conditions: registrationData.healthConditions || null,
        membership_status: 'active',
        access_level: 'member'
      })
    
    if (error) {
      console.error('❌ Failed to create member profile from registration:', error)
      throw new Error('Failed to create member profile')
    }
    
    console.log('✅ Member profile created successfully from registration data')
  }

  /**
   * Validate password complexity
   */
  private static validatePassword(password: string): void {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasNonalphas = /\W/.test(password)

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`)
    }

    if (!hasUpperCase) {
      throw new Error('Password must contain at least one uppercase letter')
    }

    if (!hasLowerCase) {
      throw new Error('Password must contain at least one lowercase letter')
    }

    if (!hasNumbers) {
      throw new Error('Password must contain at least one number')
    }

    if (!hasNonalphas) {
      throw new Error('Password must contain at least one special character')
    }
  }
}