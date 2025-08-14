// src/utils/inputSanitizer.ts
// Input sanitization for Run Alcester - works with existing Zod validation

/**
 * Input sanitization utility to prevent XSS and clean user input
 * This works BEFORE your existing Zod validation
 */
export class InputSanitizer {
  
  /**
   * Sanitize email input - removes dangerous characters
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
      .replace(/['"]/g, '') // Remove quotes that could break HTML
      .slice(0, 254); // RFC limit for email length
  }

  /**
   * Sanitize name fields (full name, emergency contact name)
   */
  static sanitizeName(name: string): string {
    if (!name) return '';
    
    return name
      .trim()
      .replace(/<[^>]*>/g, '') // Remove ALL HTML tags like <script>
      .replace(/[<>]/g, '') // Remove any remaining angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/alert\s*\([^)]*\)/gi, '') // Remove alert() calls
      .replace(/eval\s*\([^)]*\)/gi, '') // Remove eval() calls
      .replace(/document\./gi, '') // Remove document references
      .replace(/window\./gi, '') // Remove window references
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .slice(0, 100); // Reasonable name length limit
  }

  /**
   * Sanitize phone numbers - keep only valid phone characters
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    return phone
      .trim()
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/[^\d\s\-\+\(\)]/g, '') // Keep only digits, spaces, hyphens, plus, parentheses
      .slice(0, 20); // Reasonable phone length limit
  }

  /**
   * Sanitize text areas (health conditions, general text)
   */
  static sanitizeTextArea(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/<[^>]*>/g, '') // Remove ALL HTML tags first
      .replace(/[<>]/g, '') // Remove any remaining angle brackets to prevent tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/alert\s*\([^)]*\)/gi, '') // Remove alert() calls
      .replace(/eval\s*\([^)]*\)/gi, '') // Remove eval() calls
      .replace(/document\./gi, '') // Remove document references
      .replace(/window\./gi, '') // Remove window references
      .replace(/data:/gi, '') // Remove data: protocol (can be used for XSS)
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .slice(0, 1000); // Reasonable text area limit
  }

  /**
   * Generic text sanitizer for any string input
   */
  static sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .slice(0, 500); // Default text limit
  }

  /**
   * Sanitize all fields in a form object
   * This preserves your form structure while cleaning the data
   */
  static sanitizeFormData<T extends Record<string, any>>(formData: T): T {
    const sanitized = { ...formData } as any; // Allow modification

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      
      // Only sanitize string values
      if (typeof value !== 'string') {
        return;
      }

      // Apply field-specific sanitization
      switch (key) {
        case 'email':
          sanitized[key] = this.sanitizeEmail(value);
          break;
          
        case 'fullName':
        case 'full_name':
        case 'emergencyContactName':
        case 'emergency_contact_name':
          sanitized[key] = this.sanitizeName(value);
          break;
          
        case 'phone':
        case 'emergencyContactPhone':
        case 'emergency_contact_phone':
          sanitized[key] = this.sanitizePhone(value);
          break;
          
        case 'healthConditions':
        case 'health_conditions':
        case 'cancellation_reason':
          sanitized[key] = this.sanitizeTextArea(value);
          break;
          
        case 'password':
        case 'confirmPassword':
          // DON'T sanitize passwords - they need to be kept exactly as entered
          // Just do basic safety check
          sanitized[key] = value.slice(0, 128); // Reasonable password length limit
          break;
          
        default:
          // Generic text sanitization for other fields
          sanitized[key] = this.sanitizeText(value);
      }
    });

    return sanitized as T;
  }

  /**
   * Check if input contains potentially dangerous patterns
   * Returns true if input looks suspicious
   */
  static containsSuspiciousContent(input: string): boolean {
    if (!input) return false;
    
    const dangerousPatterns = [
      /<script/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /on\w+\s*=/i, // Event handlers like onclick=
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Safe HTML stripper - removes ALL HTML tags
   * Use this for any user input that might contain HTML
   */
  static stripHtml(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&[^;]+;/g, '') // Remove HTML entities
      .trim();
  }
}

/**
 * Validation helper that combines sanitization with your existing validation
 */
export class SafeValidator {
  
  /**
   * Sanitize and validate email
   * Use this in your forms instead of direct email validation
   */
  static sanitizeAndValidateEmail(email: string): { clean: string; isValid: boolean; error?: string } {
    const clean = InputSanitizer.sanitizeEmail(email);
    
    // Basic email validation (you can still use your Zod schema after this)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!clean) {
      return { clean, isValid: false, error: 'Email is required' };
    }
    
    if (!emailRegex.test(clean)) {
      return { clean, isValid: false, error: 'Please enter a valid email address' };
    }
    
    return { clean, isValid: true };
  }

  /**
   * Check for suspicious content before processing
   */
  static checkFormSafety<T extends Record<string, any>>(formData: T): { 
    isSafe: boolean; 
    suspiciousFields: string[] 
  } {
    const suspiciousFields: string[] = [];
    
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'string' && InputSanitizer.containsSuspiciousContent(value)) {
        suspiciousFields.push(key);
      }
    });
    
    return {
      isSafe: suspiciousFields.length === 0,
      suspiciousFields
    };
  }
}