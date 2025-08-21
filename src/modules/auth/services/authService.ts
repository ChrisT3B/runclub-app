// src/modules/auth/services/authService.ts
// ENHANCED - Your existing code with minimal rate limiting addition

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

// Import your existing security components
import { AuthSecurityManager } from '../../../utils/authSecurity';
import { InputSanitizer } from '../../../utils/inputSanitizer';
import { SQLSecurityValidator } from '../../../utils/sqlSecurityValidator';
import { SecureAuthService } from './secureAuthService';

// =====================================
// 🆕 NEW: MINIMAL DATABASE LOGGING SERVICE
// Only logs to database - doesn't change existing lockout behavior
// =====================================

class LoginAttemptLogger {
  /**
   * Log login attempt to database for admin monitoring
   * This is purely for logging - doesn't affect your existing rate limiting
   */
  static async logAttempt(email: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('login_attempts')
        .insert({
          email: email,
          ip_address: this.getClientFingerprint(),
          user_agent: navigator.userAgent,
          success: success,
          attempt_time: new Date().toISOString(),
          error_message: errorMessage || null
        });

      if (error) {
        console.error('Failed to log login attempt:', error);
      }
    } catch (error) {
      console.error('Error logging login attempt:', error);
    }
  }

  /**
   * Get a browser fingerprint (not real IP, but consistent identifier)
   */
  private static getClientFingerprint(): string {
    return btoa(
      navigator.userAgent + 
      screen.width + 
      screen.height + 
      navigator.language + 
      navigator.platform
    ).substring(0, 32);
  }

  /**
   * Clean up old login attempts (call periodically)
   */
  static async cleanupOldAttempts(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago

      const { error } = await supabase
        .from('login_attempts')
        .delete()
        .lt('attempt_time', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old attempts:', error);
      }
    } catch (error) {
      console.error('Error cleaning up old attempts:', error);
    }
  }
}

// =====================================
// SESSION SECURITY ENHANCEMENT
// =====================================

class SessionSecurityService {
  private static readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

  
  static generateFingerprint(): string {
    const data = `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}|${navigator.platform}|${navigator.cookieEnabled}`;
    return btoa(data).slice(0, 32);
  }

  static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return AuthSecurityManager.getClientIP() || 'unknown';
    }
  }

  static async registerSession(userId: string, sessionToken: string): Promise<void> {
    try {
      const fingerprint = this.generateFingerprint();
      const expiresAt = new Date();
      expiresAt.setTime(Date.now() + this.MAX_SESSION_DURATION_MS);

      const { error } = await supabase
        .from('active_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken.slice(-20),
          fingerprint_hash: fingerprint,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          device_info: `${navigator.platform} - ${screen.width}x${screen.height}`,
          expires_at: expiresAt.toISOString(),
          is_suspicious: false
        });

      if (!error) {
        console.log('🔐 Session registered with security tracking');
        localStorage.setItem('session_fingerprint', fingerprint);
        localStorage.setItem('session_start_time', Date.now().toString());
        localStorage.setItem('last_activity', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to register session:', error);
    }
  }

  static async cleanupSession(userId: string, sessionToken: string): Promise<void> {
    try {
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('session_token', sessionToken.slice(-20));
      
      // Clear local storage
      localStorage.removeItem('session_fingerprint');
      localStorage.removeItem('session_start_time');
      localStorage.removeItem('last_activity');
      
      console.log('🧹 Session cleaned up securely');
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  }

  static async logSecurityEvent(eventType: string, details: any): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_type: eventType,
          event_details: details,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          severity: this.getEventSeverity(eventType)
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private static getEventSeverity(eventType: string): string {
    const criticalEvents = ['session_hijack_detected', 'suspicious_device_change'];
    const warningEvents = ['session_timeout', 'session_extended', 'device_fingerprint_mismatch'];
    
    if (criticalEvents.includes(eventType)) return 'critical';
    if (warningEvents.includes(eventType)) return 'warning';
    return 'info';
  }

  static validateSessionIntegrity(): boolean {
    try {
      const storedFingerprint = localStorage.getItem('session_fingerprint');
      const currentFingerprint = this.generateFingerprint();
      
      if (storedFingerprint && storedFingerprint !== currentFingerprint) {
        console.warn('🚨 Device fingerprint mismatch detected');
        this.logSecurityEvent('device_fingerprint_mismatch', {
          stored: storedFingerprint,
          current: currentFingerprint
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to validate session integrity:', error);
      return false;
    }
  }

  static getSessionTimeRemaining(): number {
    try {
      const lastActivity = parseInt(localStorage.getItem('last_activity') || '0');
      if (!lastActivity) return 0;
      
      const timeSinceActivity = Date.now() - lastActivity;
      return Math.max(0, this.SESSION_TIMEOUT_MS - timeSinceActivity);
    } catch {
      return 0;
    }
  }

  static updateActivity(): void {
    localStorage.setItem('last_activity', Date.now().toString());
  }
}

// =====================================
// ENHANCED AUTH FUNCTIONS
// =====================================

// Smart data fetching: Get user with complete member profile in one call
export const getUserWithProfile = async (userId: string) => {
  try {
    // Use your SQL security validator
    const validatedUserId = SQLSecurityValidator.validateUUID(userId);
    if (!validatedUserId.isValid) {
      throw new Error('Invalid user ID format');
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', validatedUserId.clean)
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

// ENHANCED LOGIN - Uses your existing SecureAuthService + adds minimal database logging
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('🔐 Starting enhanced secure login...');
    
    // 🆕 NEW: Log the login attempt start (for admin monitoring)
    await LoginAttemptLogger.logAttempt(credentials.email, false, 'attempt_started');
    
    // Use your existing SecureAuthService for ALL rate limiting and lockout logic
    // This preserves your tested 15-minute lockout system
    const result = await SecureAuthService.secureLogin(credentials);
    
    // 🆕 NEW: Log the final result (success or failure)
    if (result.error) {
      await LoginAttemptLogger.logAttempt(credentials.email, false, result.error.message);
      console.log('❌ Login failed, logged for admin monitoring');
      return result; // Return unchanged - your existing error messages and lockout logic
    }

    // 🆕 NEW: Log successful login
    if (result.data) {
      await LoginAttemptLogger.logAttempt(credentials.email, true);
      console.log('✅ Successful login logged for admin monitoring');
    }

    // If login successful, add session security tracking
    const { data: { session } } = await supabase.auth.getSession();
    if (session && result.data) {
      // Register session with security tracking
      await SessionSecurityService.registerSession(result.data.id, session.access_token);
      
      // Log successful secure login with session info
      await SessionSecurityService.logSecurityEvent('secure_login_with_session', {
        user_id: result.data.id,
        session_id: session.access_token.slice(-20),
        has_security_info: !!result.securityInfo
      });
    }

    console.log('✅ Enhanced secure login completed');
    return result; // Return unchanged result from your existing SecureAuthService
  } catch (error) {
    console.error('💥 Enhanced login error:', error);
    
    // 🆕 NEW: Log unexpected errors
    try {
      await LoginAttemptLogger.logAttempt(credentials.email, false, 'unexpected_error');
    } catch (logError) {
      console.error('Failed to log unexpected error:', logError);
    }
    
    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// ENHANCED REGISTRATION - Uses your InputSanitizer + maintains your pending member logic
export const registerUser = async (registerData: RegistrationData): Promise<AuthResponse> => {
  try {
    console.log('🚀 Starting enhanced secure registration...');
    
    // Use your InputSanitizer for comprehensive input cleaning
    const sanitizedData = InputSanitizer.sanitizeFormData({
      email: registerData.email,
      fullName: registerData.fullName,
      phone: registerData.phone || '',
      emergencyContactName: registerData.emergencyContactName || '',
      emergencyContactPhone: registerData.emergencyContactPhone || '',
      healthConditions: registerData.healthConditions || ''
    });

    // Validate email using your SQL security validator
    const emailValidation = SQLSecurityValidator.validateEmailForDB(sanitizedData.email);
    if (!emailValidation.isValid) {
      return {
        data: null,
        error: { message: emailValidation.error || 'Invalid email format' }
      };
    }

    console.log('✅ Input sanitization and validation completed');
    
    // Your existing Supabase registration logic (UNCHANGED)
    const { data, error } = await supabase.auth.signUp({
      email: emailValidation.clean,
      password: registerData.password, // Don't sanitize passwords
      options: {
        data: {
          full_name: sanitizedData.fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    console.log('🔐 Auth signup result:', { 
      user: data.user?.id, 
      error: error?.message 
    });

    // Log registration attempt
    await SessionSecurityService.logSecurityEvent('secure_registration_attempt', {
      email: emailValidation.clean,
      success: !error,
      error: error?.message
    });

    if (error) {
      console.error('❌ Auth signup failed:', error);
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    // Your existing pending member logic (UNCHANGED)
    if (data.user) {
      console.log('👤 Creating pending member profile for user:', data.user.id);
      
      const pendingMemberData = {
        id: data.user.id,
        email: emailValidation.clean,
        full_name: sanitizedData.fullName,
        phone: sanitizedData.phone,
        emergency_contact_name: sanitizedData.emergencyContactName,
        emergency_contact_phone: sanitizedData.emergencyContactPhone,
        health_conditions: sanitizedData.healthConditions || 'None disclosed',
      };

      console.log('📋 Pending member data to insert:', pendingMemberData);

      const { error: pendingMemberError } = await supabase
        .from('pending_members')
        .insert([pendingMemberData]);

      if (pendingMemberError) {
        console.error('❌ Pending member profile creation failed:', pendingMemberError);
        console.error('❌ Full error details:', JSON.stringify(pendingMemberError, null, 2));
      } else {
        console.log('✅ Pending member profile created successfully');
      }
    }

    return {
      data: data.user,
      error: null
    };
  } catch (error) {
    console.error('💥 Unexpected registration error:', error);
    
    await SessionSecurityService.logSecurityEvent('registration_error', {
      email: registerData.email,
      error: String(error)
    });

    return {
      data: null,
      error: { message: formatSupabaseError(error) }
    };
  }
};

// SIMPLIFIED LOGOUT - Remove the problematic SessionSecurityService calls
export const logoutUser = async (): Promise<void> => {
  try {
    console.log('🔓 Starting logout...');
    
    // Get session info before logout
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();

    // Cleanup session security tracking
    if (session && user) {
      await SessionSecurityService.cleanupSession(user.id, session.access_token);
      
      // Log secure logout event
      await SessionSecurityService.logSecurityEvent('secure_logout', {
        user_id: user.id,
        reason: 'user_initiated'
      });
    }

    // Your existing logout logic
    await supabase.auth.signOut();
localStorage.removeItem('device_fingerprint');
    localStorage.removeItem('session_fingerprint');
    localStorage.removeItem('last_activity');
    sessionStorage.removeItem('redirectAfterLogin');
    
    console.log('✅ Enhanced secure logout completed with cache clear');
  } catch (error) {
window.location.reload();
  }
};

  


// SESSION SECURITY HELPER FUNCTIONS (NEW)
export const updateSessionActivity = async (): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!session || !user) return;

    // Update database
    await supabase
      .from('active_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('session_token', session.access_token.slice(-20));
    
    // Update local storage
    SessionSecurityService.updateActivity();
  } catch (error) {
    console.error('Failed to update session activity:', error);
  }
};

export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!session || !user) return false;

    // Check session integrity (device fingerprint)
    if (!SessionSecurityService.validateSessionIntegrity()) {
      await SessionSecurityService.logSecurityEvent('session_hijack_detected', {
        user_id: user.id,
        session_id: session.access_token.slice(-20)
      });
      return false;
    }

    // Check database session
    const { data, error } = await supabase
      .from('active_sessions')
      .select('expires_at, is_suspicious')
      .eq('user_id', user.id)
      .eq('session_token', session.access_token.slice(-20))
      .single();

    if (error || !data) return false;

    // Check if session has expired
    if (new Date(data.expires_at) < new Date()) {
      console.log('⏰ Session expired');
      return false;
    }

    // Check if session is marked as suspicious
    if (data.is_suspicious) {
      console.log('🚨 Suspicious session detected');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to validate session:', error);
    return false;
  }
};

export const getSessionTimeRemaining = (): number => {
  return SessionSecurityService.getSessionTimeRemaining();
};

export const checkLoginEligibility = (email: string) => {
  return SecureAuthService.checkLoginEligibility(email);
};

// Admin monitoring: Query login_attempts table directly in Supabase when needed

// =====================================
// YOUR EXISTING FUNCTIONS (UNCHANGED)
// =====================================

// Email verification with secure member promotion (UNCHANGED)
export const verifyEmail = async (token: string): Promise<EmailVerificationResult> => {
  try {
    console.log('🔐 Starting email verification with token');
    
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

      console.log('🔐 Email verified successfully, signing out user to require manual login');
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
    const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
    
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: sanitizedEmail,
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
    const sanitizedEmail = InputSanitizer.sanitizeEmail(data.email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return {
        data: null,
        error: { message: formatSupabaseError(error) }
      };
    }

    return {
      data: { email: sanitizedEmail },
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