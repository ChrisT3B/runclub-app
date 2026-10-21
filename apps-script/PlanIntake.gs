/**
 * PlanIntake.gs - Run Alcester plan intake: creates one private athlete sheet per submission.
 *
 * This file is a copy of the script deployed in Google. Editing it here changes nothing live.
 *
 * ---------------------------------------------------------------------------
 * DEPLOYMENT (by hand, signed in as runalcester@gmail.com)
 * ---------------------------------------------------------------------------
 * 1. Go to script.google.com and create a NEW standalone project (not the EA sync project).
 *    Name it "Plan Intake". Paste this whole file into Code.gs.
 * 2. Project Settings (gear icon):
 *    - Time zone: (GMT+00:00) London
 *    - Script Properties, add all four:
 *        TEMPLATE_ID    ID of the template Google Sheet (from its URL, between /d/ and /edit)
 *        FOLDER_ID      ID of the Drive folder for athlete sheets (from its URL, after /folders/)
 *        SHARED_SECRET  A long random string. Use the same value for PLAN_INTAKE_SHARED_SECRET in Vercel.
 *        NOTIFY_EMAIL   runalcester@gmail.com
 * 3. Run the function `authorise` once from the editor and accept the permissions
 *    (Drive, Sheets, send email). It also creates the "PlanIntake Log" sheet in the folder.
 * 4. Deploy > New deployment > type "Web app":
 *        Execute as:     Me (runalcester@gmail.com)
 *        Who has access: Anyone
 *    Copy the web app URL (ends in /exec). Set it as PLAN_INTAKE_SCRIPT_URL in Vercel.
 * 5. After any later code change: Deploy > Manage deployments > edit > Version: New version.
 *    This keeps the same URL. A "New deployment" would create a new URL.
 *
 * The folder must stay private. A copied sheet inherits the folder's sharing, and this
 * script never calls a sharing method.
 *
 * ---------------------------------------------------------------------------
 * CONTRACT
 * ---------------------------------------------------------------------------
 * Request: POST, body is JSON sent as text/plain:
 *   { secret, submissionId, email, athleteName, goalRace, answers: { field_key: value, ... } }
 * Response (always HTTP 200, check `success`):
 *   { success: true, sheetId, sheetUrl }
 *   { success: false, message: 'unauthorised' | 'invalid' | 'error' }
 *
 * Answers are never logged. The Log sheet holds only time, submission ID, a result code
 * and, for skipped fields, the key names.
 */

var ATHLETE_TAB = 'Athlete';
var KEY_COLUMN = 3;     // column C: hidden field keys
var ANSWER_COLUMN = 2;  // column B: answers, formatted as plain text
var LOG_SHEET_NAME = 'PlanIntake Log';
var DESCRIPTION_PREFIX = 'plan_intake_submission:';

var MAX_ANSWERS = 200;
var MAX_VALUE_LENGTH = 5000;
var MAX_TITLE_PART = 60;

var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var KEY_PATTERN = /^[a-z0-9_]{1,64}$/;

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var payload;

  try {
    payload = JSON.parse(e && e.postData && e.postData.contents);
  } catch (err) {
    return respond_({ success: false, message: 'unauthorised' });
  }

  // Secret first. Nothing else happens without it, not even logging.
  var expected = props.getProperty('SHARED_SECRET');
  if (!payload || !expected || !secretsMatch_(payload.secret, expected)) {
    return respond_({ success: false, message: 'unauthorised' });
  }

  var submissionId = payload.submissionId;
  if (!isValidPayload_(payload)) {
    log_(typeof submissionId === 'string' && UUID_PATTERN.test(submissionId) ? submissionId : '', 'invalid', '');
    return respond_({ success: false, message: 'invalid' });
  }

  // One submission at a time, so a retry cannot race the first call into a second copy
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    log_(submissionId, 'lock_timeout', '');
    return respond_({ success: false, message: 'error' });
  }

  try {
    var folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));

    var existing = findExisting_(folder, submissionId);
    if (existing) {
      log_(submissionId, 'existing', '');
      return respond_({ success: true, sheetId: existing.getId(), sheetUrl: existing.getUrl() });
    }

    var title = buildTitle_(payload.athleteName, payload.goalRace, submissionId);
    var copy = DriveApp.getFileById(props.getProperty('TEMPLATE_ID')).makeCopy(title, folder);
    copy.setDescription(DESCRIPTION_PREFIX + submissionId);

    var skipped = writeAnswers_(copy.getId(), payload.answers);
    log_(submissionId, skipped.length ? 'created_with_skips' : 'created', skipped.join(','));

    try {
      sendNotification_(props.getProperty('NOTIFY_EMAIL'), payload.athleteName, payload.goalRace, copy.getUrl());
    } catch (mailErr) {
      // The sheet exists, so the submission still succeeded
      log_(submissionId, 'notify_failed', '');
    }

    return respond_({ success: true, sheetId: copy.getId(), sheetUrl: copy.getUrl() });
  } catch (err) {
    log_(submissionId, 'error', '');
    return respond_({ success: false, message: 'error' });
  } finally {
    lock.releaseLock();
  }
}

/** Run once from the editor to grant permissions and create the Log sheet. */
function authorise() {
  var props = PropertiesService.getScriptProperties();
  ['TEMPLATE_ID', 'FOLDER_ID', 'SHARED_SECRET', 'NOTIFY_EMAIL'].forEach(function (name) {
    if (!props.getProperty(name)) throw new Error('Missing Script Property: ' + name);
  });
  DriveApp.getFileById(props.getProperty('TEMPLATE_ID')).getName();
  getLogSheet_();
  Logger.log('Authorised. Email quota remaining today: ' + MailApp.getRemainingDailyQuota());
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function secretsMatch_(given, expected) {
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function isValidPayload_(p) {
  if (typeof p.submissionId !== 'string' || !UUID_PATTERN.test(p.submissionId)) return false;
  if (typeof p.email !== 'string' || p.email.length > 254) return false;
  if (!isNonEmptyString_(p.athleteName) || !isNonEmptyString_(p.goalRace)) return false;
  if (!p.answers || typeof p.answers !== 'object' || Array.isArray(p.answers)) return false;

  var keys = Object.keys(p.answers);
  if (keys.length === 0 || keys.length > MAX_ANSWERS) return false;
  for (var i = 0; i < keys.length; i++) {
    var value = p.answers[keys[i]];
    if (!KEY_PATTERN.test(keys[i])) return false;
    if (typeof value !== 'string' || value.length > MAX_VALUE_LENGTH) return false;
  }
  return true;
}

function isNonEmptyString_(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

/** A previous copy for this submission, matched on the full ID held in the file description. */
function findExisting_(folder, submissionId) {
  var suffix = ' - ' + submissionId.substring(0, 8);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    var file = files.next();
    if (file.isTrashed()) continue;
    if (file.getName().slice(-suffix.length) !== suffix) continue;
    if (file.getDescription() === DESCRIPTION_PREFIX + submissionId) return file;
  }
  return null;
}

function buildTitle_(athleteName, goalRace, submissionId) {
  var date = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
  return [cleanTitlePart_(athleteName), cleanTitlePart_(goalRace), date, submissionId.substring(0, 8)].join(' - ');
}

function cleanTitlePart_(value) {
  return value.replace(/[\u0000-\u001f\u007f\/\\]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, MAX_TITLE_PART);
}

/** Writes each answer to column B on the row whose column C holds its key. Returns skipped key names. */
function writeAnswers_(spreadsheetId, answers) {
  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(ATHLETE_TAB);
  if (!sheet) throw new Error('Athlete tab missing');

  var lastRow = sheet.getLastRow();
  var keyValues = lastRow > 0 ? sheet.getRange(1, KEY_COLUMN, lastRow, 1).getDisplayValues() : [];
  var rowByKey = {};
  for (var r = 0; r < keyValues.length; r++) {
    var key = String(keyValues[r][0]).trim();
    if (key && !rowByKey[key]) rowByKey[key] = r + 1;
  }

  var skipped = [];
  Object.keys(answers).forEach(function (key) {
    var row = rowByKey[key];
    if (!row) {
      skipped.push(key);
      return;
    }
    var cell = sheet.getRange(row, ANSWER_COLUMN);
    cell.setNumberFormat('@');
    cell.setValue(asText_(answers[key]));
  });

  SpreadsheetApp.flush();
  return skipped;
}

/** Plain text that cannot run as a formula. */
function asText_(value) {
  var text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

function sendNotification_(to, athleteName, goalRace, sheetUrl) {
  var name = escapeHtml_(athleteName);
  var goal = escapeHtml_(goalRace);
  var link = escapeHtml_(sheetUrl);

  var rows = [
    ['Open the athlete sheet', '<a href="' + link + '">Athlete sheet</a>'],
    ['Check the answers and baselines', 'Athlete tab, then Paces tab'],
    ['Read the optional health answers', 'In the sheet only'],
    ['Build the plan', 'Plan and Brief tabs'],
    ['Publish when ready', 'Manual step, outside the app']
  ];

  var cellStyle = 'border:1px solid #ccc;padding:6px 10px;text-align:left;';
  var table = '<table style="border-collapse:collapse;">' +
    '<tr><th style="' + cellStyle + '">Action</th><th style="' + cellStyle + '">Where</th></tr>' +
    rows.map(function (row) {
      return '<tr><td style="' + cellStyle + '">' + row[0] + '</td><td style="' + cellStyle + '">' + row[1] + '</td></tr>';
    }).join('') +
    '</table>';

  var html = '<p>A new plan intake form has been submitted.</p>' +
    '<p><strong>Athlete:</strong> ' + name + '<br><strong>Goal:</strong> ' + goal + '</p>' +
    table +
    '<p>The sheet is private to this account. The athlete\'s answers are in the sheet, not in this email.</p>';

  var text = 'A new plan intake form has been submitted.\n\n' +
    'Athlete: ' + athleteName + '\nGoal: ' + goalRace + '\nSheet: ' + sheetUrl + '\n\n' +
    rows.map(function (row) { return row[0] + ': ' + row[1].replace(/<[^>]+>/g, ''); }).join('\n');

  MailApp.sendEmail({
    to: to,
    subject: 'Plan intake: ' + cleanTitlePart_(athleteName) + ' - ' + cleanTitlePart_(goalRace),
    body: text,
    htmlBody: html,
    name: 'Run Alcester Plan Intake'
  });
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Log and response
// ---------------------------------------------------------------------------

/** Time, submission ID, result code and (for skips) key names. Never answers. */
function log_(submissionId, code, detail) {
  try {
    getLogSheet_().appendRow([new Date(), submissionId, code, detail]);
  } catch (err) {
    // Logging must never break a submission
  }
}

function getLogSheet_() {
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  var files = folder.getFilesByName(LOG_SHEET_NAME);
  while (files.hasNext()) {
    var file = files.next();
    if (!file.isTrashed()) return SpreadsheetApp.openById(file.getId()).getSheets()[0];
  }
  var created = SpreadsheetApp.create(LOG_SHEET_NAME);
  DriveApp.getFileById(created.getId()).moveTo(folder);
  var sheet = created.getSheets()[0];
  sheet.appendRow(['Time', 'Submission ID', 'Result', 'Skipped keys']);
  sheet.setFrozenRows(1);
  return sheet;
}

function respond_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
