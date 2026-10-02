// src/modules/auth/hooks/useSessionRestore.ts
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureCsrfSession } from '../services/authService';

/**
 * Runs ensureCsrfSession() once per logged-in user per page load, and again
 * whenever the app returns to the foreground (an installed app resumed from
 * the background does not reload). An expired login is logged out here with
 * a notice for the login screen, instead of failing mid-booking.
 */
export const useSessionRestore = (): void => {
  const { state, logout } = useAuth();
  const userId = state.user?.id;

  // logout changes identity on every AuthProvider render - keep it out of deps
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const checkedUserRef = useRef<string | null>(null);
  const checkRunningRef = useRef(false);
  const expiryHandledRef = useRef(false);

  const runCheck = async () => {
    if (checkRunningRef.current || expiryHandledRef.current) return;
    checkRunningRef.current = true;

    try {
      const result = await ensureCsrfSession();
      if (result === 'expired' && !expiryHandledRef.current) {
        expiryHandledRef.current = true;
        sessionStorage.setItem('auth_notice', 'session_expired');
        logoutRef.current('session_expired_8h').catch(console.error);
      }
    } finally {
      checkRunningRef.current = false;
    }
  };

  // Once per logged-in user per page load
  useEffect(() => {
    if (!state.isAuthenticated || !userId) {
      checkedUserRef.current = null;
      expiryHandledRef.current = false;
      return;
    }
    if (checkedUserRef.current === userId) return;

    checkedUserRef.current = userId;
    runCheck();
  }, [state.isAuthenticated, userId]);

  // Again whenever the app comes back to the foreground
  useEffect(() => {
    if (!state.isAuthenticated || !userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isAuthenticated, userId]);
};
