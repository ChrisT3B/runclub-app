// src/modules/auth/services/secureAuthService.ts
// Enhanced authentication service with security features

import { supabase } from '../../../services/supabase';
import { AuthSecurityManager } from '../../../utils/authSecurity';
import { SQLSecurityValidator } from '../../../utils/sqlSecurityValidator';
import { InputSanitizer } from '../../../utils/inputSanitizer';
import { 
  LoginCredentials, 
  AuthResponse
} from '../types';
import { formatSupabaseError } from '../../../utils/validation';

/**
 * Secure Login Service with rate limiting and monitoring
 */
export class SecureAuthService {
  
  /**
   * Secure login with comprehensive security checks
   */
  static async secureLogin(credentials: LoginCredentials): Promise<AuthResponse & {
    securityInfo?: {
      attemptsRemaining?: number;
      lockoutTime?: number;
      riskLevel?: string;
    }
  }> {
    try {
      console.log('🔐 Starting secure login for:', credentials.email);

      // STEP 1: Validate and sanitize input
      const emailValidation = SQLSecurityValidator.validateEmailForDB(credentials.email);
      if (!emailValidation.isValid) {
        console.warn('🚨 Invalid email format in login attempt:', credentials.email);
        return {
          data: null,
          error: { message: 'Invalid email format' }
        };
      }

      const cleanEmail = emailValidation.clean;
      const clientIP = AuthSecurityManager.getClientIP();

      // STEP 2: Check rate limiting and account lockouts
      const rateLimitCheck = AuthSecurityManager.checkRateLimit(cleanEmail, clientIP);
      
      if (!rateLimitCheck.allowed) {
        // Record the failed attempt due to rate limiting
        AuthSecurityManager.recordLoginAttempt(cleanEmail, false, clientIP);
        
        let errorMessage = 'Too many login attempts. Please try again later.';
        let remainingTime = 0;

        switch (rateLimitCheck.reason) {
          case 'account_locked':
            remainingTime = Math.ceil((rateLimitCheck.remainingTime || 0) / 1000 / 60);
            errorMessage = `Account temporarily locked. Try again in ${remainingTime} minutes.`;
            break;
          case 'too_many_attempts':
            remainingTime = Math.ceil((rateLimitCheck.remainingTime || 0) / 1000 / 60);
            errorMessage = `Too many failed attempts. Account locked for ${remainingTime} minutes.`;
            break;
          case 'ip_rate_limit':
            remainingTime = Math.ceil((rateLimitCheck.remainingTime || 0) / 1000 / 60);
            errorMessage = `Too many requests from this device. Please wait ${remainingTime} minutes.`;
            break;
        }

        console.warn('🚨 Login blocked by rate limiting:', {
          email: cleanEmail,
          reason: rateLimitCheck.reason,
          ip: clientIP,
          remainingTime
        });

        return {
          data: null,
          error: { message: errorMessage },
          securityInfo: {
            lockoutTime: remainingTime
          }
        };
      }

      // STEP 3: Basic password validation (don't sanitize passwords)
      if (!credentials.password || credentials.password.length < 6) {
        AuthSecurityManager.recordLoginAttempt(cleanEmail, false, clientIP);
        return {
          data: null,
          error: { message: 'Invalid credentials' }
        };
      }

      // STEP 4: Attempt Supabase authentication
      console.log('🔑 Attempting Supabase authentication...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: credentials.password,
      });

      const loginSuccess = !error && !!data.user;

      // STEP 5: Record the login attempt
      AuthSecurityManager.recordLoginAttempt(cleanEmail, !!loginSuccess, clientIP);

      if (error) {
        console.log('❌ Login failed:', error.message);
        
        // Get security status for user feedback
        const securityStatus = AuthSecurityManager.getSecurityStatus(cleanEmail);
        const attemptsRemaining = Math.max(0, 5 - securityStatus.failedAttempts);

        let errorMessage = formatSupabaseError(error);
        
        // Add attempts remaining to error message if getting close to lockout
        if (securityStatus.failedAttempts >= 3 && attemptsRemaining > 0) {
          errorMessage += ` (${attemptsRemaining} attempts remaining)`;
        }

        return {
          data: null,
          error: { message: errorMessage },
          securityInfo: {
            attemptsRemaining,
            riskLevel: securityStatus.riskLevel
          }
        };
      }

      // STEP 6: Successful login
      console.log('✅ Login successful for:', cleanEmail);
      
      // Check if this was after failed attempts (security note)
      const securityStatus = AuthSecurityManager.getSecurityStatus(cleanEmail);
      if (securityStatus.failedAttempts > 0) {
        console.log('📋 Login successful after previous failures:', {
          email: cleanEmail,
          previousFailures: securityStatus.failedAttempts
        });
      }

      return {
        data: data.user,
        error: null,
        securityInfo: {
          riskLevel: 'low'
        }
      };

    } catch (error) {
      console.error('💥 Unexpected login error:', error);
      
      // Record as failed attempt
      const cleanEmail = InputSanitizer.sanitizeEmail(credentials.email);
      const clientIP = AuthSecurityManager.getClientIP();
      AuthSecurityManager.recordLoginAttempt(cleanEmail, false, clientIP);

      return {
        data: null,
        error: { message: 'Login failed. Please try again.' }
      };
    }
  }

  /**
   * Check if user can attempt login (pre-flight check)
   */
  static checkLoginEligibility(email: string): {
    canAttempt: boolean;
    message?: string;
    attemptsRemaining?: number;
    lockoutTime?: number;
  } {
    try {
      const emailValidation = SQLSecurityValidator.validateEmailForDB(email);
      if (!emailValidation.isValid) {
        return {
          canAttempt: false,
          message: 'Invalid email format'
        };
      }

      const cleanEmail = emailValidation.clean;
      const clientIP = AuthSecurityManager.getClientIP();
      const rateLimitCheck = AuthSecurityManager.checkRateLimit(cleanEmail, clientIP);

      if (!rateLimitCheck.allowed) {
        const remainingTime = Math.ceil((rateLimitCheck.remainingTime || 0) / 1000 / 60);
        
        return {
          canAttempt: false,
          message: `Account temporarily locked. Try again in ${remainingTime} minutes.`,
          lockoutTime: remainingTime
        };
      }

      const securityStatus = AuthSecurityManager.getSecurityStatus(cleanEmail);
      const attemptsRemaining = Math.max(0, 5 - securityStatus.failedAttempts);

      return {
        canAttempt: true,
        attemptsRemaining
      };

    } catch (error) {
      return {
        canAttempt: false,
        message: 'Unable to verify login eligibility'
      };
    }
  }

  /**
   * Get security metrics (admin function)
   */
  static getSecurityMetrics() {
    return AuthSecurityManager.getSecurityMetrics();
  }

  /**
   * Clear account lockout (admin function)
   */
  static clearAccountLockout(email: string): void {
    const emailValidation = SQLSecurityValidator.validateEmailForDB(email);
    if (emailValidation.isValid) {
      AuthSecurityManager.clearAccountLockout(emailValidation.clean);
    }
  }

  /**
   * Password strength validation for registration/updates
   */
  static validatePasswordStrength(password: string): {
    isStrong: boolean;
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) suggestions.push('Consider using 12+ characters for better security');

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else suggestions.push('Include numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else suggestions.push('Include special characters');

    // Common patterns check
    const commonPatterns = [
      /password/i,
      /123456/,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /runalcester/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      score -= 2;
      suggestions.push('Avoid common words and patterns');
    }

    // Sequential check
    if (/012|123|234|345|456|567|678|789|890|abc|bcd|cde/i.test(password)) {
      score -= 1;
      suggestions.push('Avoid sequential characters');
    }

    return {
      isStrong: score >= 5,
      score: Math.max(0, score),
      suggestions
    };
  }
}