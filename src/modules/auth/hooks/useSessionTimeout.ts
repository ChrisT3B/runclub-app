// src/modules/auth/hooks/useSessionTimeout.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

interface SessionTimeoutState {
  timeRemaining: number;
  showWarning: boolean;
  isExpired: boolean;
}

export const useSessionTimeout = () => {
  const { logout, state } = useAuth();
  const [sessionState, setSessionState] = useState<SessionTimeoutState>({
    timeRemaining: SESSION_TIMEOUT,
    showWarning: false,
    isExpired: false,
  });

  const lastActivityRef = useRef<number>(Date.now());
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // 🔒 SECURITY: Generate device fingerprint
  const generateDeviceFingerprint = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = btoa([
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.language,
      canvas.toDataURL()
    ].join('|')).substring(0, 32);
    
    return fingerprint;
  }, []);

  // Update last activity
  const updateActivity = useCallback(() => {
    if (!state.isAuthenticated) return;
    
    lastActivityRef.current = Date.now();
    localStorage.setItem('last_activity', lastActivityRef.current.toString());
    
    setSessionState(prev => ({
      ...prev,
      timeRemaining: SESSION_TIMEOUT,
      showWarning: false,
      isExpired: false,
    }));

    // Clear existing timeouts
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (warningTimeoutIdRef.current) clearTimeout(warningTimeoutIdRef.current);

    // Set new warning timeout
    warningTimeoutIdRef.current = setTimeout(() => {
      setSessionState(prev => ({
        ...prev,
        showWarning: true,
        timeRemaining: WARNING_TIME,
      }));
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set new logout timeout
    timeoutIdRef.current = setTimeout(() => {
      console.log('⏰ Session expired due to inactivity');
      setSessionState(prev => ({
        ...prev,
        isExpired: true,
        timeRemaining: 0,
      }));
      logout();
    }, SESSION_TIMEOUT);
  }, [state.isAuthenticated, logout]);

  // Extend session
  const extendSession = useCallback(() => {
    console.log('🔄 Session extended by user');
    updateActivity();
  }, [updateActivity]);

  // 🚨 SECURITY: Check for device fingerprint mismatch (session hijacking)
  const checkDeviceSecurity = useCallback(() => {
    if (!state.isAuthenticated) return;

    const currentFingerprint = generateDeviceFingerprint();
    const storedFingerprint = localStorage.getItem('session_fingerprint');

    if (!storedFingerprint) {
      // First time - store fingerprint
      console.log('🔒 Storing initial device fingerprint');
      localStorage.setItem('session_fingerprint', currentFingerprint);
      localStorage.setItem('session_start_time', Date.now().toString());
    } else if (storedFingerprint !== currentFingerprint) {
      // 🚨 DEVICE FINGERPRINT MISMATCH - SESSION HIJACKING DETECTED!
      console.error('🚨 SECURITY ALERT: Device fingerprint mismatch detected!');
      console.error('Original device:', storedFingerprint);
      console.error('Current device:', currentFingerprint);
      
      // Log security event
      const securityEvent = {
        type: 'DEVICE_FINGERPRINT_MISMATCH',
        timestamp: new Date().toISOString(),
        user_id: state.user?.id,
        original_fingerprint: storedFingerprint,
        current_fingerprint: currentFingerprint,
        user_agent: navigator.userAgent,
        risk_level: 'HIGH',
        action: 'FORCE_LOGOUT'
      };
      
      console.error('Security Event:', securityEvent);
      
      // 🔒 IMMEDIATELY CLEAR ALL SESSION DATA - NO USER CHOICE
      localStorage.removeItem('session_fingerprint');
      localStorage.removeItem('session_start_time');
      localStorage.removeItem('last_activity');
      localStorage.removeItem('sb-jykajtxjkadswqedsote-auth-token');
      
      // Force page redirect to prevent any continued access
      window.location.href = '/';
      
      // Also call logout as backup
      logout();
      
      return; // Exit early after security action
    }
    
    // If we get here, device fingerprint is valid
    console.log('✅ Device fingerprint verified');
  }, [state.isAuthenticated, generateDeviceFingerprint, logout, state.user?.id]);

  // Initialize session security
  useEffect(() => {
    if (!state.isAuthenticated) {
      // Clear session data when not authenticated
      localStorage.removeItem('session_fingerprint');
      localStorage.removeItem('session_start_time');
      localStorage.removeItem('last_activity');
      return;
    }

    // Initialize activity tracking
    updateActivity();
    
    // 🔒 CRITICAL: Check device security immediately
    checkDeviceSecurity();

    // Set up activity listeners
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      updateActivity();
    };

    activities.forEach(activity => {
      document.addEventListener(activity, activityHandler, { passive: true });
    });

    // 🔒 Set up periodic security checks every 30 seconds
    const securityCheckInterval = setInterval(() => {
      checkDeviceSecurity();
    }, CHECK_INTERVAL);

    return () => {
      // Cleanup
      activities.forEach(activity => {
        document.removeEventListener(activity, activityHandler);
      });
      
      clearInterval(securityCheckInterval);
      
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (warningTimeoutIdRef.current) clearTimeout(warningTimeoutIdRef.current);
    };
  }, [state.isAuthenticated, updateActivity, checkDeviceSecurity]);

  return {
    ...sessionState,
    extendSession,
  };
};