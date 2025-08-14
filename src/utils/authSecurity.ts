// src/utils/authSecurity.ts
// Authentication Security System for Run Alcester

interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMs: number;
  rateLimitWindowMs: number;
  ipRateLimitAttempts: number;
  ipRateLimitWindowMs: number;
  sessionTimeoutMs: number;
}

/**
 * Authentication Security Manager
 * Handles rate limiting, account lockout, and security monitoring
 */
export class AuthSecurityManager {
  private static config: SecurityConfig = {
    maxLoginAttempts: 5,           // Max attempts per email
    lockoutDurationMs: 15 * 60 * 1000,    // 15 minutes lockout
    rateLimitWindowMs: 15 * 60 * 1000,    // 15 minute window
    ipRateLimitAttempts: 10,       // Max attempts per IP
    ipRateLimitWindowMs: 10 * 60 * 1000,  // 10 minute IP window
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hour session
  };

  // In-memory storage (in production, use Redis or database)
  private static loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private static ipAttempts: Map<string, LoginAttempt[]> = new Map();
  private static accountLockouts: Map<string, number> = new Map();
  private static suspiciousIPs: Set<string> = new Set();

  /**
   * Check if email is currently locked out
   */
  static isAccountLocked(email: string): { locked: boolean; remainingTime?: number } {
    const cleanEmail = email.toLowerCase().trim();
    const lockoutTime = this.accountLockouts.get(cleanEmail);
    
    if (!lockoutTime) {
      return { locked: false };
    }

    const now = Date.now();
    const remainingTime = lockoutTime - now;

    if (remainingTime <= 0) {
      // Lockout expired, remove it
      this.accountLockouts.delete(cleanEmail);
      return { locked: false };
    }

    return { 
      locked: true, 
      remainingTime 
    };
  }

  /**
   * Check rate limiting for email and IP
   */
  static checkRateLimit(email: string, ip?: string): {
    allowed: boolean;
    reason?: string;
    remainingTime?: number;
  } {
    const cleanEmail = email.toLowerCase().trim();
    //const now = Date.now();

    // Check account lockout first
    const lockStatus = this.isAccountLocked(cleanEmail);
    if (lockStatus.locked) {
      return {
        allowed: false,
        reason: 'account_locked',
        remainingTime: lockStatus.remainingTime
      };
    }

    // Check email-based rate limiting
    const emailAttempts = this.getRecentAttempts(cleanEmail, this.config.rateLimitWindowMs);
    const failedEmailAttempts = emailAttempts.filter(attempt => !attempt.success);

    if (failedEmailAttempts.length >= this.config.maxLoginAttempts) {
      // Lock the account
      this.lockAccount(cleanEmail);
      return {
        allowed: false,
        reason: 'too_many_attempts',
        remainingTime: this.config.lockoutDurationMs
      };
    }

    // Check IP-based rate limiting
    if (ip) {
      const ipAttempts = this.getRecentIPAttempts(ip, this.config.ipRateLimitWindowMs);
      if (ipAttempts.length >= this.config.ipRateLimitAttempts) {
        this.markSuspiciousIP(ip);
        return {
          allowed: false,
          reason: 'ip_rate_limit',
          remainingTime: this.config.ipRateLimitWindowMs
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a login attempt
   */
  static recordLoginAttempt(email: string, success: boolean, ip?: string): void {
    const cleanEmail = email.toLowerCase().trim();
    const now = Date.now();
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'server';

    const attempt: LoginAttempt = {
      email: cleanEmail,
      timestamp: now,
      success,
      ip,
      userAgent
    };

    // Record email-based attempt
    const emailAttempts = this.loginAttempts.get(cleanEmail) || [];
    emailAttempts.push(attempt);
    this.loginAttempts.set(cleanEmail, emailAttempts);

    // Record IP-based attempt
    if (ip) {
      const ipAttempts = this.ipAttempts.get(ip) || [];
      ipAttempts.push(attempt);
      this.ipAttempts.set(ip, ipAttempts);
    }

    // Clean old attempts to prevent memory leaks
    this.cleanOldAttempts();

    // Log security events
    this.logSecurityEvent(attempt);
  }

  /**
   * Lock an account
   */
  private static lockAccount(email: string): void {
    const cleanEmail = email.toLowerCase().trim();
    const lockoutTime = Date.now() + this.config.lockoutDurationMs;
    
    this.accountLockouts.set(cleanEmail, lockoutTime);
    
    console.warn('🔒 Account locked due to too many failed attempts:', {
      email: cleanEmail,
      lockoutDuration: this.config.lockoutDurationMs / 1000 / 60,
      lockoutUntil: new Date(lockoutTime).toISOString()
    });
  }

  /**
   * Mark IP as suspicious
   */
  private static markSuspiciousIP(ip: string): void {
    this.suspiciousIPs.add(ip);
    console.warn('🚨 Suspicious IP detected:', {
      ip,
      timestamp: new Date().toISOString(),
      reason: 'too_many_requests'
    });
  }

  /**
   * Get recent attempts for an email
   */
  private static getRecentAttempts(email: string, windowMs: number): LoginAttempt[] {
    const cleanEmail = email.toLowerCase().trim();
    const attempts = this.loginAttempts.get(cleanEmail) || [];
    const cutoff = Date.now() - windowMs;
    
    return attempts.filter(attempt => attempt.timestamp > cutoff);
  }

  /**
   * Get recent attempts for an IP
   */
  private static getRecentIPAttempts(ip: string, windowMs: number): LoginAttempt[] {
    const attempts = this.ipAttempts.get(ip) || [];
    const cutoff = Date.now() - windowMs;
    
    return attempts.filter(attempt => attempt.timestamp > cutoff);
  }

  /**
   * Clean old attempts to prevent memory leaks
   */
  private static cleanOldAttempts(): void {
    const cutoff = Date.now() - (this.config.rateLimitWindowMs * 2);

    // Clean email attempts
    for (const [email, attempts] of this.loginAttempts.entries()) {
      const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoff);
      if (recentAttempts.length === 0) {
        this.loginAttempts.delete(email);
      } else {
        this.loginAttempts.set(email, recentAttempts);
      }
    }

    // Clean IP attempts
    for (const [ip, attempts] of this.ipAttempts.entries()) {
      const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoff);
      if (recentAttempts.length === 0) {
        this.ipAttempts.delete(ip);
      } else {
        this.ipAttempts.set(ip, recentAttempts);
      }
    }
  }

  /**
   * Log security events
   */
  private static logSecurityEvent(attempt: LoginAttempt): void {
    if (!attempt.success) {
      const recentFailures = this.getRecentAttempts(attempt.email, this.config.rateLimitWindowMs)
        .filter(a => !a.success).length;

      if (recentFailures >= 3) {
        console.warn('🚨 Multiple failed login attempts detected:', {
          email: attempt.email,
          failures: recentFailures,
          ip: attempt.ip,
          timestamp: new Date(attempt.timestamp).toISOString()
        });
      }
    } else {
      // Successful login - check if this was after failed attempts
      const recentFailures = this.getRecentAttempts(attempt.email, this.config.rateLimitWindowMs)
        .filter(a => !a.success && a.timestamp < attempt.timestamp).length;

      if (recentFailures > 0) {
        console.log('✅ Successful login after failed attempts:', {
          email: attempt.email,
          previousFailures: recentFailures,
          ip: attempt.ip
        });
      }
    }
  }

  /**
   * Get security status for an email
   */
  static getSecurityStatus(email: string): {
    isLocked: boolean;
    failedAttempts: number;
    remainingTime?: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const cleanEmail = email.toLowerCase().trim();
    const lockStatus = this.isAccountLocked(cleanEmail);
    const recentAttempts = this.getRecentAttempts(cleanEmail, this.config.rateLimitWindowMs);
    const failedAttempts = recentAttempts.filter(a => !a.success).length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (failedAttempts >= 3) riskLevel = 'high';
    else if (failedAttempts >= 1) riskLevel = 'medium';

    return {
      isLocked: lockStatus.locked,
      failedAttempts,
      remainingTime: lockStatus.remainingTime,
      riskLevel
    };
  }

  /**
   * Clear lockout for an email (admin function)
   */
  static clearAccountLockout(email: string): void {
    const cleanEmail = email.toLowerCase().trim();
    this.accountLockouts.delete(cleanEmail);
    console.log('🔓 Account lockout cleared by admin:', cleanEmail);
  }

  /**
   * Get current security metrics
   */
  static getSecurityMetrics(): {
    lockedAccounts: number;
    suspiciousIPs: number;
    totalAttempts: number;
    failedAttempts: number;
  } {
    const now = Date.now();
    let totalAttempts = 0;
    let failedAttempts = 0;

    // Count attempts from last hour
    const oneHour = 60 * 60 * 1000;
    for (const attempts of this.loginAttempts.values()) {
      const recentAttempts = attempts.filter(a => now - a.timestamp < oneHour);
      totalAttempts += recentAttempts.length;
      failedAttempts += recentAttempts.filter(a => !a.success).length;
    }

    return {
      lockedAccounts: this.accountLockouts.size,
      suspiciousIPs: this.suspiciousIPs.size,
      totalAttempts,
      failedAttempts
    };
  }

  /**
   * Validate session timeout
   */
  static isSessionExpired(loginTime: number): boolean {
    return Date.now() - loginTime > this.config.sessionTimeoutMs;
  }

  /**
   * Get client IP (basic implementation)
   */
  static getClientIP(): string | undefined {
    // In a real application, you'd get this from headers
    // For client-side, we can use a fingerprinting approach
    if (typeof window === 'undefined') return undefined;
    
    // Simple client fingerprint (not a real IP, but consistent per device)
    const fingerprint = [
      window.navigator.userAgent,
      window.navigator.language,
      window.screen.width,
      window.screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `fp_${Math.abs(hash).toString(36)}`;
  }
}