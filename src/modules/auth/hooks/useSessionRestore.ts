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
  const reloadHandledRef = useRef(false);

  // Read inside async callbacks - a closure's copy can be a render behind
  const isAuthenticatedRef = useRef(state.isAuthenticated);
  isAuthenticatedRef.current = state.isAuthenticated;

  const runCheck = async () => {
    if (checkRunningRef.current || expiryHandledRef.current) return;
    checkRunningRef.current = true;

    try {
      const result = await ensureCsrfSession();

      if (result === 'expired' && !expiryHandledRef.current) {
        expiryHandledRef.current = true;
        sessionStorage.setItem('auth_notice', 'session_expired');
        logoutRef.current('session_expired_8h').catch(console.error);
        return;
      }

      // Another tab ended the session while this one still shows the app.
      // Reloading drops it to the login screen instead of leaving a dead UI
      // that fails every action. After the reload there is no session, so
      // the hook returns early and this cannot loop.
      if (result === 'no_session' && isAuthenticatedRef.current && !reloadHandledRef.current) {
        reloadHandledRef.current = true;
        window.location.reload();
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
      reloadHandledRef.current = false;
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

  // A tab that is already on screen when another tab logs out: localStorage
  // changes fire here, so it reacts without waiting to be focused. The
  // visibilitychange check above covers a tab sitting in the background.
  useEffect(() => {
    if (!state.isAuthenticated || !userId) return;

    const handleStorage = (event: StorageEvent) => {
      const loginTimeCleared = event.key === 'login_at' && event.newValue === null;
      const storageCleared = event.key === null;

      if (loginTimeCleared || storageCleared) {
        runCheck();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [state.isAuthenticated, userId]);
};
