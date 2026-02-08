// src/services/csrfTestService.ts
// Test service for CSRF validation - SAFE, does not modify real data

import { supabase } from './supabase';
import { validateCsrfToken, getCsrfToken } from '../utils/csrfProtection';

/**
 * Test CSRF validation without modifying any real data
 * This is a SAFE test that just validates the token
 *
 * @returns Object with success status and message
 */
export const testCsrfProtection = async (): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message: 'Not authenticated. Please log in.'
      };
    }

    // Get CSRF token from sessionStorage
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
      return {
        success: false,
        message: 'No CSRF token found. Please log in again.'
      };
    }

    // Validate CSRF token
    const validation = await validateCsrfToken(csrfToken, user.id);

    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || 'CSRF validation failed',
        details: { validationResult: validation }
      };
    }

    // Success! CSRF validation passed
    return {
      success: true,
      message: 'CSRF protection is working correctly!',
      details: {
        userId: user.id,
        tokenPresent: true,
        validationPassed: true
      }
    };

  } catch (error) {
    console.error('Error testing CSRF protection:', error);
    return {
      success: false,
      message: 'Error testing CSRF protection',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};
