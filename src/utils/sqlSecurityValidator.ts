// src/utils/sqlSecurityValidator.ts
// SQL Injection Prevention for Run Alcester

import { InputSanitizer } from './inputSanitizer';

/**
 * SQL Security Validator - adds extra protection layers
 */
export class SQLSecurityValidator {
  
  /**
   * Validate UUID format (for IDs)
   * UUIDs are critical parameters that should be strictly validated
   */
  static validateUUID(uuid: string): { isValid: boolean; clean: string; error?: string } {
    if (!uuid) {
      return { isValid: false, clean: '', error: 'ID is required' };
    }

    // Clean the input first
    const clean = uuid.trim();

    // UUID v4 regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(clean)) {
      return { isValid: false, clean: '', error: 'Invalid ID format' };
    }

    return { isValid: true, clean: clean.toLowerCase() };
  }

  /**
   * Validate and sanitize email for database queries
   */
  static validateEmailForDB(email: string): { isValid: boolean; clean: string; error?: string } {
    if (!email) {
      return { isValid: false, clean: '', error: 'Email is required' };
    }

    // First sanitize
    const sanitized = InputSanitizer.sanitizeEmail(email);
    
    // Then validate format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, clean: '', error: 'Invalid email format' };
    }

    // Check for SQL injection patterns in email
    if (this.containsSQLInjection(sanitized)) {
      return { isValid: false, clean: '', error: 'Invalid email content' };
    }

    return { isValid: true, clean: sanitized };
  }

  /**
   * Validate numeric parameters (limits, offsets, etc.)
   */
  static validateNumericParam(value: any, min: number = 0, max: number = 10000): { isValid: boolean; clean: number; error?: string } {
    if (value === null || value === undefined) {
      return { isValid: false, clean: 0, error: 'Numeric value is required' };
    }

    const num = parseInt(String(value), 10);
    
    if (isNaN(num)) {
      return { isValid: false, clean: 0, error: 'Must be a valid number' };
    }

    if (num < min || num > max) {
      return { isValid: false, clean: 0, error: `Must be between ${min} and ${max}` };
    }

    return { isValid: true, clean: num };
  }

  /**
   * Validate date strings for database queries
   */
  static validateDateForDB(dateString: string): { isValid: boolean; clean: string; error?: string } {
    if (!dateString) {
      return { isValid: false, clean: '', error: 'Date is required' };
    }

    // Clean the input
    const clean = dateString.trim();

    // Check for SQL injection patterns
    if (this.containsSQLInjection(clean)) {
      return { isValid: false, clean: '', error: 'Invalid date format' };
    }

    // Validate ISO date format (YYYY-MM-DD or full ISO string)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    
    if (!isoDateRegex.test(clean)) {
      return { isValid: false, clean: '', error: 'Date must be in ISO format (YYYY-MM-DD)' };
    }

    // Validate it's a real date
    const date = new Date(clean);
    if (isNaN(date.getTime())) {
      return { isValid: false, clean: '', error: 'Invalid date' };
    }

    return { isValid: true, clean: clean };
  }

  /**
   * Validate enum values (access_level, membership_status, etc.)
   */
  static validateEnum<T extends string>(
    value: string, 
    allowedValues: T[], 
    fieldName: string = 'value'
  ): { isValid: boolean; clean: T | null; error?: string } {
    if (!value) {
      return { isValid: false, clean: null, error: `${fieldName} is required` };
    }

    const clean = value.trim().toLowerCase() as T;
    
    if (!allowedValues.includes(clean)) {
      return { 
        isValid: false, 
        clean: null, 
        error: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
      };
    }

    return { isValid: true, clean };
  }

  /**
   * Enhanced SQL injection detection
   */
  static containsSQLInjection(input: string): boolean {
    if (!input) return false;
    
    const sqlPatterns = [
      // Basic SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
      /[';](\s)*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)/i,
      
      // Boolean-based injection - FIXED PATTERN
      /\b(OR|AND)\s*['"]*\s*\d+\s*['"]*\s*=\s*['"]*\s*\d+\s*['"]*\b/i,
      /['"]\s*(OR|AND)\s*['"]*\s*\d+\s*['"]*\s*=\s*['"]*\s*\d+\s*['"]/i,
      /'\s*(OR|AND)\s*'/i,  // Catches 'OR' and 'AND' patterns
      
      // Time-based injection
      /\b(SLEEP|DELAY|WAITFOR)\s*\(/i,
      
      // Union-based injection
      /UNION\s+(ALL\s+)?SELECT/i,
      
      // Comment patterns
      /\/\*[\s\S]*?\*\//,
      /--[^\r\n]*/,
      /#[^\r\n]*/,
      
      // Function calls
      /\b(SUBSTRING|CONCAT|CHAR|ASCII|LENGTH|UPPER|LOWER)\s*\(/i,
      
      // Information schema
      /INFORMATION_SCHEMA/i,
      /SYSOBJECTS|SYSCOLUMNS/i,
      
      // Database functions
      /\b(USER|DATABASE|VERSION|@@)\w*/i,
      
      // Hex encoding
      /0x[0-9a-f]+/i,
      
      // Multiple statements
      /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
      
      // Classic injection patterns - ADDED MORE SPECIFIC PATTERNS
      /'\s*OR\s*'.*'=/i,  // Matches ' OR '...'=
      /'\s*OR\s*\d+\s*=\s*\d+/i,  // Matches ' OR 1=1
      /'\s*AND\s*'.*'=/i,  // Matches ' AND '...'=
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate search/filter parameters
   */
  static validateSearchParam(searchTerm: string): { isValid: boolean; clean: string; error?: string } {
    if (!searchTerm) {
      return { isValid: true, clean: '' }; // Empty search is valid
    }

    // Sanitize first
    const sanitized = InputSanitizer.sanitizeText(searchTerm);
    
    // Check for SQL injection
    if (this.containsSQLInjection(sanitized)) {
      return { isValid: false, clean: '', error: 'Invalid search term' };
    }

    // Limit length
    if (sanitized.length > 100) {
      return { isValid: false, clean: '', error: 'Search term too long' };
    }

    return { isValid: true, clean: sanitized };
  }
}

/**
 * Secure Query Builder - adds validation to Supabase queries
 */
export class SecureQueryBuilder {
  
  /**
   * Secure user lookup by ID
   */
  static validateUserQuery(userId: string) {
    const validation = SQLSecurityValidator.validateUUID(userId);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid user ID');
    }
    return validation.clean;
  }

  /**
   * Secure email lookup
   */
  static validateEmailQuery(email: string) {
    const validation = SQLSecurityValidator.validateEmailForDB(email);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid email');
    }
    return validation.clean;
  }

  /**
   * Secure pagination parameters
   */
  static validatePaginationParams(limit?: number, offset?: number) {
    const limitValidation = SQLSecurityValidator.validateNumericParam(limit || 50, 1, 100);
    const offsetValidation = SQLSecurityValidator.validateNumericParam(offset || 0, 0, 10000);
    
    if (!limitValidation.isValid) {
      throw new Error(limitValidation.error || 'Invalid limit');
    }
    if (!offsetValidation.isValid) {
      throw new Error(offsetValidation.error || 'Invalid offset');
    }
    
    return {
      limit: limitValidation.clean,
      offset: offsetValidation.clean
    };
  }

  /**
   * Secure access level validation
   */
  static validateAccessLevel(accessLevel: string) {
    const validation = SQLSecurityValidator.validateEnum(
      accessLevel, 
      ['member', 'lirf', 'admin'], 
      'access level'
    );
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid access level');
    }
    return validation.clean!;
  }

  /**
   * Secure membership status validation
   */
  static validateMembershipStatus(status: string) {
    const validation = SQLSecurityValidator.validateEnum(
      status, 
      ['pending', 'active', 'suspended'], 
      'membership status'
    );
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid membership status');
    }
    return validation.clean!;
  }
}

/**
 * Database operation logger for security monitoring
 */
export class SQLSecurityLogger {
  
  /**
   * Log potentially suspicious database operations
   */
  static logSuspiciousActivity(operation: string, params: any, userId?: string) {
    console.warn('🚨 Suspicious database activity detected:', {
      operation,
      params,
      userId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    });
    
    // In production, send this to your security monitoring system
    // Example: send to external logging service, database audit table, etc.
  }

  /**
   * Log blocked SQL injection attempts
   */
  static logInjectionAttempt(attemptedInput: string, userId?: string) {
    console.error('🚨 SQL injection attempt blocked:', {
      attemptedInput: attemptedInput.substring(0, 100), // Only log first 100 chars
      userId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    });
    
    // In production, immediately alert security team
  }
}