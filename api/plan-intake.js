// api/plan-intake.js
// Plan intake: invitations (admin) and the athlete form submission.
// Every action needs a Supabase access token. The athlete's email always comes from
// the verified login, never from the request. Answers are passed to the Apps Script
// and are never stored in Supabase or logged.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const MAX_BODY_BYTES = 50 * 1024;
const INVITE_DAYS = 14;
const SCRIPT_TIMEOUT_MS = 22000; // below the 30s maxDuration in vercel.json

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Value contract: Docs/PlanSheet-Template-FieldKeys.md and the template Lists tab
// Keep in step with src/modules/plan-intake/types
// ---------------------------------------------------------------------------

const DISTANCES = ['1 mile', '3k', '5k', '5 miles', '8k', '10k', '15k', '10 miles', 'Half marathon', '30k', 'Marathon', 'Other'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COMMIT_TYPES = ['Shift work', 'Contact or team sport', 'Physical job', 'Desk or office work', 'Other'];
const COMMIT_TIMES = ['Morning', 'Evening', 'All day'];
const COMMIT_FREQS = ['Weekly', 'Fortnightly', 'Variable'];
const ROUTINE_OPTIONS = ['Rest', 'Run', 'Cross-train', 'Run and cross-train'];
const UNITS = ['km', 'mile'];

const SHORT_TEXT = 200;
const LONG_TEXT = 2000;

const text = (max) => ({ kind: 'text', max });
const oneOf = (options) => ({ kind: 'enum', options });
const number = (min, max, integer = false) => ({ kind: 'number', min, max, integer });

const FIELDS = {
  full_name: text(100),
  age: number(10, 100, true),
  sex: text(30),
  units: oneOf(UNITS),

  goal_distance: oneOf(DISTANCES),
  goal_race_name: text(100),
  goal_race_date: { kind: 'date' },
  goal_target_time: { kind: 'time' },
  goal_secondary: { kind: 'time' },

  weekly_volume: number(0, 500),
  runs_per_week: number(0, 14, true),
  longest_recent_run: number(0, 200),
  time_at_volume: text(SHORT_TEXT),
  years_running: number(0, 90),
  previous_structure: text(50),
  previous_races: text(LONG_TEXT),

  days_available: { kind: 'days' },
  long_run_day: oneOf(DAYS),
  time_weekday: number(1, 600, true),
  time_weekend: number(1, 600, true),
  fixed_rest_days: { kind: 'days' },
  routine_note: text(LONG_TEXT),

  seasonal_changes: text(LONG_TEXT),
  holidays_travel: text(LONG_TEXT),
  exams_events: text(LONG_TEXT),

  injuries_current: text(LONG_TEXT),
  injuries_past: text(LONG_TEXT),
  injury_clearance: text(SHORT_TEXT),

  cross_training: text(LONG_TEXT),
  terrain: text(SHORT_TEXT),
  treadmill_access: text(50),
  hills_nearby: text(50),
  device: text(100),
  uses_hr: text(50),

  motivation: text(LONG_TEXT),
  best_worst_race: text(LONG_TEXT),
  sleep_nutrition_stress: text(LONG_TEXT),
  anything_else: text(LONG_TEXT),
  disability_details: text(LONG_TEXT),
  work_education_hours: number(0, 100),
  height_cm_under20: number(100, 230),
};

for (const n of [1, 2, 3]) {
  FIELDS[`baseline${n}_distance`] = oneOf(DISTANCES);
  FIELDS[`baseline${n}_date`] = { kind: 'date' };
  FIELDS[`baseline${n}_time`] = { kind: 'time' };
  FIELDS[`baseline${n}_conditions`] = text(SHORT_TEXT);

  FIELDS[`commit${n}_type`] = oneOf(COMMIT_TYPES);
  FIELDS[`commit${n}_day`] = { kind: 'days' };
  FIELDS[`commit${n}_time`] = oneOf(COMMIT_TIMES);
  FIELDS[`commit${n}_freq`] = oneOf(COMMIT_FREQS);
}

for (const n of [1, 2]) {
  FIELDS[`holiday${n}_from`] = { kind: 'date' };
  FIELDS[`holiday${n}_to`] = { kind: 'date' };
  FIELDS[`holiday${n}_note`] = text(SHORT_TEXT);
}

for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
  FIELDS[`routine_${day}`] = { kind: 'routine' };
}

const REQUIRED = [
  'full_name', 'goal_race_name', 'goal_distance', 'goal_race_date', 'units',
  'baseline1_distance', 'baseline1_date', 'baseline1_time', 'days_available',
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const ACTIONS = {
  members: listMembers,
  'create-invite': createInvite,
  status: getStatus,
  submit,
  list,
  revoke,
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'method_not_allowed');
  }

  const declaredLength = Number(req.headers['content-length'] || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return fail(res, 413, 'too_large');
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return fail(res, 400, 'invalid_request');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(res, 400, 'invalid_request');
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return fail(res, 413, 'too_large');
  }

  const action = typeof body.action === 'string' && Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : null;
  if (!action) {
    return fail(res, 400, 'invalid_request');
  }

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const user = await verifiedUser(supabase, req.headers.authorization);
    if (!user) {
      return fail(res, 401, 'unauthorised');
    }

    return await action({ req, res, body, supabase, user });
  } catch (error) {
    // Codes only: never the request body, answers or email addresses
    console.error('plan-intake: unhandled', body.action, error?.code || error?.name || 'error');
    return fail(res, 500, 'server_error');
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Registered members an admin can invite: no guests or temporary runners. */
async function listMembers({ res, supabase, user }) {
  if (!(await isAdmin(supabase, user.id))) return fail(res, 403, 'forbidden');

  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, email, membership_status, is_temp_runner')
    .neq('membership_status', 'guest')
    .order('full_name', { ascending: true });
  if (error) throw error;

  const members = data
    .filter((m) => !m.is_temp_runner && m.email && !m.email.endsWith('@runalcester.temp'))
    .map((m) => ({ id: m.id, full_name: m.full_name, email: m.email.toLowerCase() }));

  return res.status(200).json({ success: true, members });
}

async function createInvite({ res, body, supabase, user }) {
  if (!(await isAdmin(supabase, user.id))) return fail(res, 403, 'forbidden');

  if (typeof body.member_id !== 'string' || !UUID_PATTERN.test(body.member_id)) {
    return fail(res, 400, 'invalid_request');
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, full_name, membership_status, is_temp_runner')
    .eq('id', body.member_id)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member || member.membership_status === 'guest' || member.is_temp_runner) {
    return fail(res, 400, 'not_a_member');
  }

  // The login email, so it matches what status and submit compare against
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(member.id);
  const authUser = authData?.user;
  if (authError || !authUser) return fail(res, 400, 'not_a_member');
  if (!authUser.email_confirmed_at) return fail(res, 400, 'email_not_confirmed');

  const email = normaliseEmail(authUser.email);
  if (!email) return fail(res, 400, 'not_a_member');

  const appUrl = (process.env.VITE_APP_URL || '').replace(/\/+$/, '');
  if (!appUrl) {
    console.error('plan-intake: VITE_APP_URL not set');
    return fail(res, 500, 'server_error');
  }

  const now = new Date();

  // An expired open invitation would block the unique index, so close it first
  const { error: expireError } = await supabase
    .from('plan_intake_invitations')
    .update({ status: 'revoked' })
    .eq('email', email)
    .eq('status', 'invited')
    .lte('expires_at', now.toISOString());
  if (expireError) throw expireError;

  const expiresAt = new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  const { data: invitation, error: insertError } = await supabase
    .from('plan_intake_invitations')
    .insert({ email, status: 'invited', created_by: user.id, expires_at: expiresAt.toISOString() })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') return fail(res, 409, 'already_invited');
    throw insertError;
  }

  try {
    await sendInvitationEmail(email, `${appUrl}/plan-intake`, firstName(member.full_name));
  } catch (mailError) {
    // No email went out, so remove the invitation and let the admin try again
    await supabase.from('plan_intake_invitations').delete().eq('id', invitation.id);
    console.error('plan-intake: invitation email failed', mailError?.code || 'error');
    return fail(res, 502, 'email_failed');
  }

  return res.status(200).json({ success: true });
}

async function getStatus({ res, supabase, user }) {
  const { data, error } = await supabase
    .from('plan_intake_invitations')
    .select('id')
    .eq('email', user.email)
    .eq('status', 'invited')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);
  if (error) throw error;

  return res.status(200).json({ open: data.length > 0 });
}

async function submit({ res, body, supabase, user }) {
  if (body.consent !== true) return fail(res, 400, 'consent_required');

  const answers = validateAnswers(body.answers);
  if (!answers) return fail(res, 400, 'invalid_answers');

  const scriptUrl = process.env.PLAN_INTAKE_SCRIPT_URL;
  const secret = process.env.PLAN_INTAKE_SHARED_SECRET;
  if (!scriptUrl || !secret) {
    console.error('plan-intake: script env not set');
    return fail(res, 500, 'server_error');
  }

  // Atomic claim: only one submission can ever use an invitation
  const submittedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from('plan_intake_invitations')
    .update({ status: 'submitted', used_at: submittedAt })
    .eq('email', user.email)
    .eq('status', 'invited')
    .is('used_at', null)
    .gt('expires_at', submittedAt)
    .select('id');
  if (claimError) throw claimError;

  if (!claimed || claimed.length === 0) {
    return res.status(200).json({ open: false });
  }

  const invitationId = claimed[0].id;
  const payload = {
    secret,
    submissionId: invitationId,
    email: user.email,
    athleteName: answers.full_name,
    goalRace: answers.goal_race_name || answers.goal_distance,
    answers: {
      ...answers,
      email: user.email,
      consent: 'Yes',
      consent_at: submittedAt,
      submission_id: invitationId,
      submitted_at: submittedAt,
    },
  };

  const outcome = await callScript(scriptUrl, payload);

  // Consent is recorded only where the answers may now be held in a sheet
  const update = outcome.status === 'sheet_created'
    ? { status: 'sheet_created', sheet_id: outcome.sheetId, sheet_url: outcome.sheetUrl, consent_at: submittedAt, last_error: null }
    : outcome.status === 'unknown'
      ? { status: 'unknown', consent_at: submittedAt, last_error: outcome.code }
      : { status: 'sheet_failed', last_error: outcome.code };

  const { error: updateError } = await supabase
    .from('plan_intake_invitations')
    .update(update)
    .eq('id', invitationId);
  if (updateError) {
    console.error('plan-intake: outcome not recorded', outcome.status, updateError.code || 'error');
  }

  if (outcome.status === 'sheet_failed') {
    console.error('plan-intake: sheet failed', outcome.code);
    return fail(res, 502, 'submit_failed');
  }
  if (outcome.status === 'unknown') {
    console.error('plan-intake: sheet outcome unknown', outcome.code);
  }

  // sheet_created and unknown: the answers were received
  return res.status(200).json({ success: true });
}

async function list({ res, supabase, user }) {
  if (!(await isAdmin(supabase, user.id))) return fail(res, 403, 'forbidden');

  const { data, error } = await supabase
    .from('plan_intake_invitations')
    .select('id, email, status, created_at, expires_at, sheet_url')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const now = Date.now();
  const invitations = data.map((row) => ({
    ...row,
    expired: row.status === 'invited' && new Date(row.expires_at).getTime() <= now,
  }));

  return res.status(200).json({ success: true, invitations });
}

async function revoke({ res, body, supabase, user }) {
  if (!(await isAdmin(supabase, user.id))) return fail(res, 403, 'forbidden');

  if (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id)) {
    return fail(res, 400, 'invalid_request');
  }

  const { data, error } = await supabase
    .from('plan_intake_invitations')
    .update({ status: 'revoked' })
    .eq('id', body.id)
    .eq('status', 'invited')
    .select('id');
  if (error) throw error;

  if (!data || data.length === 0) return fail(res, 404, 'not_found');
  return res.status(200).json({ success: true });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** The logged-in user, or null. Requires a confirmed email. */
async function verifiedUser(supabase, authorization) {
  const match = /^Bearer\s+(\S+)$/.exec(authorization || '');
  if (!match) return null;

  const { data, error } = await supabase.auth.getUser(match[1]);
  const user = data?.user;
  if (error || !user || !user.email || !user.email_confirmed_at) return null;

  return { id: user.id, email: user.email.trim().toLowerCase() };
}

/** Same rule as the client: members.access_level === 'admin' (useAuthQueries canManageMembers). */
async function isAdmin(supabase, userId) {
  const { data, error } = await supabase
    .from('members')
    .select('access_level')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.access_level === 'admin';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function normaliseEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Clean answers keyed by field, or null if anything is wrong. Empty optional fields are dropped. */
function validateAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const clean = {};
  for (const [key, raw] of Object.entries(input)) {
    const spec = Object.hasOwn(FIELDS, key) ? FIELDS[key] : null;
    if (!spec || typeof raw !== 'string') return null;

    const value = raw.trim();
    if (value === '') continue;

    const checked = checkValue(spec, value);
    if (checked === null) return null;
    clean[key] = checked;
  }

  if (REQUIRED.some((key) => !clean[key])) return null;

  // Goal race ahead, race results behind. One day of slack each way for UK vs UTC.
  const dayMs = 24 * 60 * 60 * 1000;
  const yesterday = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + dayMs).toISOString().slice(0, 10);
  if (clean.goal_race_date <= yesterday) return null;
  for (const n of [1, 2, 3]) {
    if (clean[`baseline${n}_date`] && clean[`baseline${n}_date`] > tomorrow) return null;
  }

  // Baselines and commitments are all-or-nothing rows
  for (const n of [2, 3]) {
    if (!rowComplete(clean, [`baseline${n}_distance`, `baseline${n}_date`, `baseline${n}_time`], [`baseline${n}_conditions`])) return null;
  }
  for (const n of [1, 2, 3]) {
    if (!rowComplete(clean, [`commit${n}_type`, `commit${n}_day`, `commit${n}_time`, `commit${n}_freq`])) return null;
  }
  for (const n of [1, 2]) {
    if (!rowComplete(clean, [`holiday${n}_from`, `holiday${n}_to`], [`holiday${n}_note`])) return null;
    if (clean[`holiday${n}_from`] && clean[`holiday${n}_to`] < clean[`holiday${n}_from`]) return null;
  }

  return clean;
}

/** All of `keys` present, or none of `keys` and none of `extras`. */
function rowComplete(clean, keys, extras = []) {
  const present = keys.filter((key) => clean[key]).length;
  if (present === keys.length) return true;
  return present === 0 && extras.every((key) => !clean[key]);
}

function checkValue(spec, value) {
  switch (spec.kind) {
    case 'text':
      return value.length <= spec.max ? value : null;

    case 'enum':
      return spec.options.includes(value) ? value : null;

    case 'number': {
      if (!/^\d+(\.\d+)?$/.test(value)) return null;
      const n = Number(value);
      if (spec.integer && !Number.isInteger(n)) return null;
      return n >= spec.min && n <= spec.max ? value : null;
    }

    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
    }

    case 'time':
      return /^(\d{1,2}:[0-5]\d:[0-5]\d|\d{1,2}:[0-5]\d)$/.test(value) ? value : null;

    case 'days': {
      const days = value.split(',').map((day) => day.trim());
      if (days.some((day) => !DAYS.includes(day)) || new Set(days).size !== days.length) return null;
      return DAYS.filter((day) => days.includes(day)).join(', ');
    }

    case 'routine': {
      const separator = value.indexOf(' - ');
      const option = separator === -1 ? value : value.slice(0, separator);
      const detail = separator === -1 ? '' : value.slice(separator + 3).trim();
      if (!ROUTINE_OPTIONS.includes(option) || detail.length > 100) return null;
      return detail ? `${option} - ${detail}` : option;
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Outbound calls
// ---------------------------------------------------------------------------

/** sheet_created on success, sheet_failed on a clear refusal, unknown when the outcome can't be known. */
async function callScript(scriptUrl, payload) {
  let response;
  try {
    // text/plain keeps Apps Script from needing a CORS preflight; the secret is in the body
    response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(SCRIPT_TIMEOUT_MS),
    });
  } catch (error) {
    return { status: 'unknown', code: error?.name === 'TimeoutError' ? 'script_timeout' : 'script_network' };
  }

  let result;
  try {
    result = await response.json();
  } catch {
    return { status: 'unknown', code: `script_bad_response_${response.status}` };
  }

  if (result?.success === true && typeof result.sheetId === 'string' && typeof result.sheetUrl === 'string') {
    return { status: 'sheet_created', sheetId: result.sheetId, sheetUrl: result.sheetUrl };
  }
  if (result?.success === false) {
    const reason = ['unauthorised', 'invalid', 'error'].includes(result.message) ? result.message : 'other';
    return { status: 'sheet_failed', code: `script_${reason}` };
  }
  return { status: 'unknown', code: 'script_bad_response' };
}

async function sendInvitationEmail(to, link, name) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const greeting = name ? `Hello ${name},` : 'Hello,';

  const text = [
    greeting,
    '',
    'The Run Alcester coaching team has invited you to fill in a training plan form.',
    'Your answers help us build a running plan for you.',
    '',
    `Open the form here: ${link}`,
    '',
    'Log in to the Run Alcester app as usual and the form will open.',
    '',
    'Questions about health and injuries are optional. Your answers are seen only by the coaching team.',
    '',
    'This invitation expires in 14 days.',
    '',
    'Run Alcester Coaching Team',
  ].join('\n');

  const html = `
    <p>${escapeHtml(greeting)}</p>
    <p>The Run Alcester coaching team has invited you to fill in a training plan form.
    Your answers help us build a running plan for you.</p>
    <p><a href="${link}">Open the training plan form</a></p>
    <p>Log in to the Run Alcester app as usual and the form will open.</p>
    <p>Questions about health and injuries are optional. Your answers are seen only by the coaching team.</p>
    <p>This invitation expires in 14 days.</p>
    <p>Run Alcester Coaching Team</p>
  `;

  await transporter.sendMail({
    // The address must stay the SMTP account; only the display name changes
    from: 'Run Alcester Coaching Team <bookings.runalcester@gmail.com>',
    to,
    subject: 'Your Run Alcester training plan form',
    text,
    html,
    replyTo: 'runalcester@gmail.com',
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstName(fullName) {
  const first = typeof fullName === 'string' ? fullName.trim().split(/\s+/)[0] : '';
  return first ? first.slice(0, 50) : '';
}

function fail(res, status, error) {
  return res.status(status).json({ success: false, error });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
