// src/utils/csrfProtection.ts
// CSRF Token Management Utilities

// NOTE FOR PHASE 2:
// Multi-tab scenario: Supabase auth uses localStorage (shared across tabs)
// but CSRF tokens use sessionStorage (tab-specific).
// If user opens Tab 2, they'll be authenticated but have no CSRF token.
// Phase 2 solution: Regenerate CSRF token on session restore/page load
// if authenticated user has no token in sessionStorage.

import { supabase } from '../services/supabase';
import { logDiagnosticEvent } from './securityDiagnostics';

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
      // Fire-and-forget: this function is synchronous and must stay that way
      logDiagnosticEvent('csrf_token_missing', {}).catch(() => {});
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
 * @param token - The CSRF token from the client request
 * @param userId - The user ID making the request
 * @returns Object with isValid boolean and optional error message
 */
export const validateCsrfToken = async (
  token: string | null,
  userId: string
): Promise<{ isValid: boolean; error?: string }> => {
  // Step 1: Check if token exists
  if (!token) {
    console.warn('⚠️ CSRF validation failed: No token provided');
    return {
      isValid: false,
      error: 'Security token is required. Please refresh and try again.'
    };
  }

  // Step 2: Basic format check (should be a UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    console.warn('⚠️ CSRF validation failed: Invalid token format');
    return {
      isValid: false,
      error: 'Invalid security token format. Please log in again.'
    };
  }

  try {
    // Step 3: Query database for matching token
    const { data, error } = await supabase
      .from('active_sessions')
      .select('csrf_token, user_id, expires_at')
      .eq('user_id', userId)
      .eq('csrf_token', token)
      .maybeSingle();

    if (error) {
      console.error('❌ CSRF validation database error:', error);
      await logDiagnosticEvent('csrf_validation_failed', {
        user_id: userId,
        reason: 'db_error',
        error: error.message
      });
      return {
        isValid: false,
        error: 'Security verification failed. Please try again.'
      };
    }

    // Step 4: Check if token exists in database
    if (!data) {
      console.warn('⚠️ CSRF validation failed: Token not found in database');

      // Snapshot the user's session rows before the caller logs them out and
      // cleanupSession deletes the evidence. Isolated so a failure here still
      // lets the main event be written.
      let sessions: Array<Record<string, unknown>> | null = null;
      let sessionsQueryError: string | null = null;
      try {
        const { data: sessionRows, error: sessionsError } = await supabase
          .from('active_sessions')
          .select('created_at, session_token, csrf_token, expires_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (sessionsError) {
          sessionsQueryError = sessionsError.message;
        } else {
          sessions = (sessionRows ?? []).map(row => ({
            created_at: row.created_at,
            token_suffix: row.session_token?.slice(-6) ?? null,
            csrf_prefix: row.csrf_token?.slice(0, 8) ?? null,
            expires_at: row.expires_at
          }));
        }
      } catch (snapshotError) {
        sessionsQueryError = String(snapshotError);
      }

      await logDiagnosticEvent('csrf_validation_failed', {
        user_id: userId,
        reason: 'not_found',
        local_token_prefix: token.slice(0, 8),
        sessions,
        sessions_query_error: sessionsQueryError
      });

      return {
        isValid: false,
        error: 'Security token not found. Please log in again.'
      };
    }

    // Step 5: Check if session has expired
    if (data.expires_at) {
      const expirationDate = new Date(data.expires_at);
      const now = new Date();

      if (expirationDate < now) {
        console.warn('⚠️ CSRF validation failed: Session expired');
        await logDiagnosticEvent('csrf_validation_failed', {
          user_id: userId,
          reason: 'expired',
          expires_at: data.expires_at
        });
        return {
          isValid: false,
          error: 'Your session has expired. Please log in again.'
        };
      }
    }

    // All validations passed
    console.log('✅ CSRF token validated successfully for user:', userId);
    return { isValid: true };

  } catch (error) {
    console.error('❌ CSRF validation error:', error);
    return {
      isValid: false,
      error: 'Security verification error. Please try again.'
    };
  }
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
    // .select('id') so we can tell an update that matched no row (the silent
    // failure this investigation is chasing) from one that worked
    const { data, error } = await supabase
      .from('active_sessions')
      .update({ csrf_token: csrfToken })
      .eq('user_id', userId)
      .eq('session_token', sessionToken.slice(-20))
      .select('id');

    if (error) {
      await logDiagnosticEvent('csrf_store_failed', {
        user_id: userId,
        error: error.message,
        code: error.code
      });
      console.error('❌ Failed to store CSRF token in database:', error);
      throw new Error('Failed to store security token in database');
    }

    if (!data || data.length === 0) {
      await logDiagnosticEvent('csrf_store_no_row', {
        user_id: userId,
        session_token_suffix: sessionToken.slice(-6)
      });
      console.warn('⚠️ CSRF token update matched no active_sessions row');
      // Deliberately not throwing - existing behaviour is to carry on
    }

    console.log('✅ CSRF token stored in database for session:', sessionToken.substring(0, 10) + '...');
  } catch (error) {
    console.error('❌ Error storing CSRF token in database:', error);
    throw error;
  }
};

/**
 * Handle CSRF validation errors with user-friendly messaging
 * @param error - Error message from validation
 * @param showToast - Whether to show a toast notification (default: true)
 */
export const handleCsrfError = (error: string, showToast: boolean = true): void => {
  console.error('🔒 CSRF validation failed:', error);

  if (showToast) {
    // TODO: Integrate with toast notification system in Phase 3+
    console.log('📢 User should see error:', error);
  }
};

/**
 * Check if error is CSRF-related
 * @param error - Error object or message
 * @returns true if error is CSRF-related
 */
export const isCsrfError = (error: unknown): boolean => {
  if (typeof error === 'string') {
    return error.toLowerCase().includes('csrf') ||
           error.toLowerCase().includes('security token');
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: string }).message.toLowerCase();
    return msg.includes('csrf') || msg.includes('security token');
  }

  return false;
};

/**
 * Clear CSRF token from database (on logout)
 */
export const clearCsrfTokenFromDatabase = async (userId: string): Promise<void> => {
  try {
    // NOTE: the user_id-only filter is the suspected cause of tokens being
    // wiped by a logout elsewhere. Left as-is deliberately - fixing it is a
    // separate work package. .select('id') tells us how many rows it hit.
    const { data, error } = await supabase
      .from('active_sessions')
      .update({ csrf_token: null })
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('❌ Failed to clear CSRF token from database:', error);
      // Don't throw - logout should proceed even if this fails
    } else {
      await logDiagnosticEvent('csrf_cleared', {
        user_id: userId,
        rows_cleared: data?.length ?? 0
      });
      console.log('🧹 CSRF token cleared from database for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error clearing CSRF token from database:', error);
    // Don't throw - logout should proceed even if this fails
  }
};
