// api/incident-alert.js
// Emails admins that an incident report was made (WP-IncidentReporting-v1).
// The caller must be logged in and must be the reporter of the incident.
// The email holds no personal detail: only the run name and date, and a
// pointer to the app. Nothing from the report is logged.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Alerts are only sent straight after a report is saved, so a leader cannot
// re-trigger emails for an old report.
const ALERT_WINDOW_MS = 15 * 60 * 1000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'method_not_allowed');
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return fail(res, 400, 'invalid_request');
  }
  const incidentId = body?.incident_id;
  if (typeof incidentId !== 'string' || !UUID_PATTERN.test(incidentId)) {
    return fail(res, 400, 'invalid_request');
  }

  // Preview deployments never send email, so the flow can be tested without
  // SMTP or service-role settings. Production (and anything not marked as
  // preview) sends as normal.
  if (process.env.VERCEL_ENV === 'preview') {
    console.log('incident-alert: preview deployment, email skipped');
    return res.status(200).json({ success: true, skipped: 'preview' });
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const user = await verifiedUser(supabase, req.headers.authorization);
    if (!user) return fail(res, 401, 'unauthorised');

    const { data: incident, error: incidentError } = await supabase
      .from('run_incidents')
      .select('id, reported_by, created_at, run:scheduled_runs!run_incidents_run_id_fkey(run_title, run_date)')
      .eq('id', incidentId)
      .maybeSingle();
    if (incidentError) throw incidentError;

    // Same response for "not found" and "not yours" so ids cannot be probed
    if (!incident || incident.reported_by !== user.id) return fail(res, 404, 'not_found');

    if (Date.now() - new Date(incident.created_at).getTime() > ALERT_WINDOW_MS) {
      return fail(res, 409, 'alert_window_passed');
    }

    const { data: admins, error: adminError } = await supabase
      .from('members')
      .select('email')
      .eq('access_level', 'admin')
      .eq('membership_status', 'active');
    if (adminError) throw adminError;

    const bcc = (admins || [])
      .map((a) => (a.email || '').trim().toLowerCase())
      .filter((email) => email && !email.endsWith('@runalcester.temp'));
    if (bcc.length === 0) {
      console.error('incident-alert: no admin recipients');
      return fail(res, 500, 'no_recipients');
    }

    await sendAlert(bcc, incident.run?.run_title || 'a club run', incident.run?.run_date || null);
    return res.status(200).json({ success: true });
  } catch (error) {
    // Codes only: never report content or email addresses
    console.error('incident-alert: failed', error?.code || error?.name || 'error');
    return fail(res, 500, 'server_error');
  }
}

async function sendAlert(bcc, runTitle, runDate) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const appUrl = (process.env.VITE_APP_URL || 'https://app.runalcester.co.uk').replace(/\/+$/, '');
  const runLine = runDate ? `${runTitle} on ${formatDate(runDate)}` : runTitle;

  const text = [
    'Hello,',
    '',
    `An incident report has been submitted for ${runLine}.`,
    '',
    `Open the Run Alcester app and go to Incident Reports to view it: ${appUrl}`,
    '',
    'For privacy, this email does not include any details of the incident.',
    '',
    'Run Alcester',
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>An incident report has been submitted for <strong>${escapeHtml(runLine)}</strong>.</p>
    <p>Open the <a href="${appUrl}">Run Alcester app</a> and go to Incident Reports to view it.</p>
    <p>For privacy, this email does not include any details of the incident.</p>
    <p>Run Alcester</p>
  `;

  await transporter.sendMail({
    // The address must stay the SMTP account; only the display name changes
    from: 'Run Alcester <bookings.runalcester@gmail.com>',
    to: 'bookings.runalcester@gmail.com',
    bcc,
    subject: `Incident report submitted: ${runLine}`,
    text,
    html,
    replyTo: 'runalcester@gmail.com',
  });
}

// ---------------------------------------------------------------------------
// Auth (same rules as api/plan-intake.js)
// ---------------------------------------------------------------------------

/** The logged-in user, or null. Requires a confirmed email. */
async function verifiedUser(supabase, authorization) {
  const match = /^Bearer\s+(\S+)$/.exec(authorization || '');
  if (!match) return null;

  const { data, error } = await supabase.auth.getUser(match[1]);
  const user = data?.user;
  if (error || !user || !user.email || !user.email_confirmed_at) return null;

  return { id: user.id };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "2026-11-01" -> "1 Nov 2026" */
function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fail(res, status, error) {
  return res.status(status).json({ success: false, error });
}
