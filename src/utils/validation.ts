// src/utils/validation.ts
import { z } from 'zod';

// Password validation: 8+ chars, 1 capital, 1 number, 1 special char
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

// Phone validation (optional)
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits')
  .optional()
  .or(z.literal(''));

// Name validation
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-\']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Login form schema
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Registration form schema
export const registerFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  fullName: nameSchema,
  phone: phoneSchema,
  emergencyContactName: nameSchema.optional().or(z.literal('')),
  emergencyContactPhone: phoneSchema,
  healthConditions: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Forgot password form schema
export const forgotPasswordFormSchema = z.object({
  email: emailSchema,
});

// Reset password form schema
export const resetPasswordFormSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Validation utility functions
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const result = passwordSchema.safeParse(password);
  
  if (result.success) {
    return { isValid: true, errors: [] };
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => err.message)
  };
};

export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Complexity
  if (password.length >= 16) score += 1;
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['#dc2626', '#dc2626', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
  
  const index = Math.min(score, 5);
  
  return {
    score,
    label: labels[index],
    color: colors[index]
  };
};  
// Form error handling
export const formatFormErrors = (errors: any): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  if (errors?.flatten) {
    const flattened = errors.flatten();
    Object.keys(flattened.fieldErrors).forEach(key => {
      formattedErrors[key] = flattened.fieldErrors[key][0];
    });
  }
  
  return formattedErrors;
};

// Supabase error handling
export const formatSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  // Common Supabase auth errors
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Signup disabled': 'Registration is currently disabled.',
    'Invalid email': 'Please enter a valid email address.',
    'Email rate limit exceeded': 'Too many email attempts. Please wait before trying again.',
    'Token has expired or is invalid': 'This link has expired. Please request a new one.',
    'User not found': 'No account found with this email address.',
  };
  
  // Check for exact matches first
  if (errorMessages[error.message]) {
    return errorMessages[error.message];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.message?.includes(key)) {
      return value;
    }
  }
  
  // Return original message if no match found
  return error.message || 'An unexpected error occurred';
};

// Development helper for testing
export const createTestUser = () => ({
  email: `test+${Date.now()}@example.com`,
  password: 'Test123!@#',
  fullName: 'Test User',
  phone: '1234567890',
  emergencyContactName: 'Emergency Contact',
  emergencyContactPhone: '0987654321',
  healthConditions: 'None disclosed',
});
