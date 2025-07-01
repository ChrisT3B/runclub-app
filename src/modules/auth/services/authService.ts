import { supabase } from '../../../services/supabase'
import type { User, LoginCredentials, RegistrationData } from '../types'

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
      },
    },
  })

  console.log('Supabase registration response:', { data, error })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Registration failed')
  }

  // Create member profile manually
  console.log('🔄 About to create member profile...')
  try {
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        phone: registrationData.phone || null,
        emergency_contact_name: registrationData.emergencyContactName || null,
        emergency_contact_phone: registrationData.emergencyContactPhone || null,
        health_conditions: registrationData.healthConditions || null,
      })
    
    if (memberError) {
      console.error('❌ Member profile creation failed:', memberError)
      // Don't throw error as user is already created in auth
    } else {
      console.log('✅ Member profile created successfully')
    }
  } catch (error) {
    console.error('❌ Error creating member profile:', error)
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    fullName: fullName,
    accessLevel: 'member',
    membershipStatus: 'pending',
    emailVerified: false,
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