// src/utils/securityDiagnostics.ts
// Diagnostic event logging for the unexpected-logout investigation
// (WP-SessionLogoutDiagnostics-v1)
//
// Writes context-rich rows to security_events so we can tell WHY a logout
// happened and WHICH step lost the CSRF token. Production suppresses
// console.log, and every logout deletes the active_sessions row, so the
// console and the database are both blind without this.
//
// This helper must never throw and never block a user action.

import { supabase } from '../services/supabase';

/**
 * Work out how long ago this session started, from the localStorage key
 * registerSession sets. Returns null if the key is missing or unparseable.
 */
const getMsSinceLogin = (): number | null => {
  const startTime = localStorage.getItem('session_start_time');
  if (!startTime) return null;

  const parsed = Number(startTime);
  if (!Number.isFinite(parsed)) return null;

  return Date.now() - parsed;
};

/**
 * Detect whether we are running as an installed PWA or in a browser tab.
 * PWA sessions behave differently around sessionStorage, so this matters.
 */
const getDisplayMode = (): string => {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  return isStandalone ? 'standalone' : 'browser';
};

/**
 * Write one diagnostic row to security_events.
 *
 * Fire-and-forget safe: never throws, never rejects. No IP lookup is done
 * (deliberately — ip_address is left unset on these events).
 *
 * @param eventType - security_events.event_type value
 * @param details - event-specific fields; a user_id here overrides the session user
 */
export const logDiagnosticEvent = async (
  eventType: string,
  details: Record<string, unknown> = {}
): Promise<void> => {
  try {
    // RLS requires an authenticated user to insert, so bail out quietly
    // if we have already lost the session.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('security_events')
      .insert({
        event_type: eventType,
        event_details: {
          ...details,
          user_id: details.user_id ?? session.user.id,
          session_suffix: session.access_token.slice(-6),
          ms_since_login: getMsSinceLogin(),
          display_mode: getDisplayMode(),
          visibility: document.visibilityState,
          client_time: new Date().toISOString()
        },
        user_agent: navigator.userAgent,
        severity: 'warning'
      });
  } catch {
    console.warn('Diagnostic log failed:', eventType);
  }
};
