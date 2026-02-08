// src/utils/csrfProtection.ts
// CSRF Token Management Utilities

// NOTE FOR PHASE 2:
// Multi-tab scenario: Supabase auth uses localStorage (shared across tabs)
// but CSRF tokens use sessionStorage (tab-specific).
// If user opens Tab 2, they'll be authenticated but have no CSRF token.
// Phase 2 solution: Regenerate CSRF token on session restore/page load
// if authenticated user has no token in sessionStorage.

import { supabase } from '../services/supabase';

/**
 * Generate a cryptographically secure CSRF token
 * Uses crypto.randomUUID() for strong randomness
 */
export const generateCsrfToken = (): string => {
  const token = crypto.randomUUID();
  console.log('🔐 Generated CSRF token:', token.substring(0, 8) + '...');
  return token;
};

/**
 * Store CSRF token in sessionStorage
 * sessionStorage is used (not localStorage) because:
 * - Automatically cleared when browser tab closes
 * - Not accessible to other tabs
 * - More secure than localStorage
 */
export const storeCsrfToken = (token: string): void => {
  try {
    sessionStorage.setItem('csrf_token', token);
    console.log('✅ CSRF token stored in sessionStorage');
  } catch (error) {
    console.error('❌ Failed to store CSRF token:', error);
    throw new Error('Failed to store security token');
  }
};

/**
 * Retrieve CSRF token from sessionStorage
 */
export const getCsrfToken = (): string | null => {
  try {
    const token = sessionStorage.getItem('csrf_token');
    if (!token) {
      console.warn('⚠️ No CSRF token found in sessionStorage');
    }
    return token;
  } catch (error) {
    console.error('❌ Failed to retrieve CSRF token:', error);
    return null;
  }
};

/**
 * Clear CSRF token from sessionStorage (on logout)
 */
export const clearCsrfToken = (): void => {
  try {
    sessionStorage.removeItem('csrf_token');
    console.log('🧹 CSRF token cleared from sessionStorage');
  } catch (error) {
    console.error('❌ Failed to clear CSRF token:', error);
  }
};

/**
 * Validate CSRF token against database
 * This will be implemented in Phase 2
 * For now, just a placeholder that returns true
 */
export const validateCsrfToken = async (
  token: string | null,
  _userId: string
): Promise<{ isValid: boolean; error?: string }> => {
  // PHASE 1: Not implemented yet - always return true
  // PHASE 2: Will add actual validation
  console.log('ℹ️ CSRF validation not yet implemented (Phase 2)');

  if (!token) {
    return { isValid: false, error: 'CSRF token is required' };
  }

  // Placeholder - will be implemented in Phase 2
  return { isValid: true };
};

/**
 * Store CSRF token in database for a specific session
 * @param userId - User ID
 * @param csrfToken - CSRF token to store
 * @param sessionToken - Supabase session access_token to identify specific session
 */
export const storeCsrfTokenInDatabase = async (
  userId: string,
  csrfToken: string,
  sessionToken: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .update({ csrf_token: csrfToken })
      .eq('user_id', userId)
      .eq('session_token', sessionToken.slice(-20));

    if (error) {
      console.error('❌ Failed to store CSRF token in database:', error);
      throw new Error('Failed to store security token in database');
    }

    console.log('✅ CSRF token stored in database for session:', sessionToken.substring(0, 10) + '...');
  } catch (error) {
    console.error('❌ Error storing CSRF token in database:', error);
    throw error;
  }
};

/**
 * Clear CSRF token from database (on logout)
 */
export const clearCsrfTokenFromDatabase = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .update({ csrf_token: null })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to clear CSRF token from database:', error);
      // Don't throw - logout should proceed even if this fails
    } else {
      console.log('🧹 CSRF token cleared from database for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error clearing CSRF token from database:', error);
    // Don't throw - logout should proceed even if this fails
  }
};
