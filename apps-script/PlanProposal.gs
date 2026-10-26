/**
 * PlanProposal.gs - Run Alcester: builds an AI planning prompt from one athlete sheet and
 * imports the AI's reply into two review tabs. Used by the coach only.
 *
 * This file is a copy of the script deployed in Google. Editing it here changes nothing live.
 *
 * ---------------------------------------------------------------------------
 * DEPLOYMENT (by hand, signed in as runalcester@gmail.com)
 * ---------------------------------------------------------------------------
 * 1. Go to script.google.com and create a NEW standalone project (not Plan Intake, and not
 *    Extensions > Apps Script from inside the template). Name it "Plan Proposal".
 * 2. Files in the project:
 *      Code.gs                 paste apps-script/PlanProposal.gs
 *      PlanProposal.html       + > HTML, name it PlanProposal, paste apps-script/PlanProposal.html
 *      PlanProposalPrompt.html + > HTML, name it PlanProposalPrompt, paste the whole of
 *                              apps-script/PlanProposalPrompt.txt (Apps Script has no .txt files;
 *                              the script reads it back as plain text)
 * 3. Project Settings (gear icon):
 *    - Time zone: (GMT+00:00) London
 *    - Script Properties: FOLDER_ID = the athlete sheets folder (the same value as in Plan Intake)
 * 4. Run the function `authorise` once from the editor and accept the permissions.
 *    It also creates the "PlanProposal Log" sheet in the folder.
 * 5. Deploy > New deployment > type "Web app":
 *        Execute as:     Me (runalcester@gmail.com)
 *        Who has access: Only myself
 *    Bookmark the web app URL (ends in /exec). Keep it in the bookmark, not in this file.
 * 6. After any later code change: Deploy > Manage deployments > edit > Version: New version.
 *
 * Optional: run `testValidator` from the editor. It checks the reply validator against good and
 * bad sample replies made up in code (no athlete data) and writes the results to the log.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT READS AND WRITES
 * ---------------------------------------------------------------------------
 * Reads only: the "AI copy" tab, fixed result cells on the "Paces" tab, the "Lists" tab and the
 * "Brief" tab (the coach's sections and plan settings, template v8 or later). Never the Athlete tab,
 * never the Plan tab. Plan Intake writes a link on each sheet's Brief tab that opens this page with
 * the sheet already filled in (?sheet=<id>).
 * Writes only: the "AI proposal", "AI rationale" and "Athlete summary" tabs of the athlete sheet,
 * and the "PlanProposal Log" sheet in the athlete folder. Never the Plan tab. In the Athlete summary
 * tab, the coach's column C is only filled where it is empty, so re-importing never overwrites it.
 * No AI service is called. There is no API key and no secret.
 * The log holds time, sheet ID, action, prompt version and a result code. Never answers or reply text.
 */

var TAB_AI_COPY = 'AI copy';
var TAB_PACES = 'Paces';
var TAB_LISTS = 'Lists';
var TAB_BRIEF = 'Brief';
var TAB_PROPOSAL = 'AI proposal';
var TAB_RATIONALE = 'AI rationale';
var TAB_SUMMARY = 'Athlete summary';
var LOG_SHEET_NAME = 'PlanProposal Log';
var PROMPT_FILE = 'PlanProposalPrompt';
var BUILD_KEY_PREFIX = 'build_';

// Labels as they appear in column A of the AI copy tab (the template's Athlete tab labels)
var LABEL_RACE_DATE = 'Goal race date';
var LABEL_UNITS = 'Preferred units (km or miles)';

// Lists tab headers (row 3 of the template)
var LIST_TOKENS = 'Session token';
var LIST_PHASES = 'Phase';
var LIST_UNITS = 'Units';

var MAX_WEEKS = 26;
var HARD_TEXT_CAP = 600;
var MAX_LIST_ITEMS = 20;
var DAY_STRING_CAP = 30;
var MAX_SESSION_KM = 45;
var MAX_SESSION_MIN = 240;
var MAX_REPS = 40;
var KM_PER_MILE = 1.609344;
var GOAL_VIEWS = ['achievable', 'aggressive', 'needs_discussion'];
var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Word limits from the prompt's output shape (v3)
var WORD_LIMITS = {
  follows_brief: 80, goal_view_reason: 60, phase_rationale: 60, short: 40, answer: 60,
  note_for_athlete: 40, coach_note: 40, rationale: 60,
  summary_intro: 80, summary_goal: 60, summary_phase: 40, summary_paces: 60, summary_point: 25
};
var MAX_KEY_POINTS = 5;

// Athlete summary tab rows (column A labels). Publish reads column C by these labels.
var SUMMARY_ROWS = ['About your plan', 'Your goal', 'How the plan is built', 'Using your paces', 'Key points', 'A note from your coach'];

// Brief tab (template v8): sections found by their exact column A text. A section with a
// defaultText may be left to the AI; the others are Coach specifies or None.
var MODE_COACH = 'Coach specifies';
var MODE_AI = 'AI chooses';
var MODE_NONE = 'None';
var BRIEF_SECTIONS = [
  { name: 'Key insight and main risk', defaultText: 'Work out the one thing that should shape this plan, and the main risk.' },
  { name: 'Reality check on the goal', defaultText: 'Say whether the goal looks achievable, aggressive or needs discussion, and why.' },
  { name: 'Phase structure', defaultText: 'Default: 7-day weeks; Base, Build, Peak, Taper, Race; follow the load strategy in the plan settings.' },
  { name: 'How to apply the paces', defaultText: 'Default: use the paces as calculated, starting at the slow end of each range.' },
  { name: 'Training adjustments from health' },
  { name: 'Firm rules' },
  { name: 'Questions for the AI' }
];
var HEALTH_SECTION = 'Training adjustments from health';
var QUESTIONS_SECTION = 'Questions for the AI';
var SETTING = {
  start: 'First week starts',
  metric: 'Primary metric',
  load: 'Load strategy',
  cut: 'Down-week cut',
  warmup: 'Warm-up and cool-down (minutes each)'
};

// WP section 4.6. Whole words, ignoring case.
var HEALTH_WORDS = [
  'injury', 'injured', 'pain', 'painful', 'sore', 'medical', 'doctor', 'GP', 'physio', 'surgery', 'operation',
  'tight', 'strain', 'sprain', 'adductor', 'hamstring', 'calf', 'knee', 'achilles', 'shin', 'groin', 'hip',
  'stress fracture', 'asthma', 'heart', 'medication', 'pregnant', 'pregnancy', 'illness', 'ill', 'infection',
  'diabetes', 'anxiety', 'depression'
];
var HEALTH_PATTERN = new RegExp('\\b(' + HEALTH_WORDS.map(function (w) { return w.replace(/ /g, '\\s+'); }).join('|') + ')\\b', 'i');
var EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
var PHONE_PATTERN = /(\+44\s?\(?0?\)?\s?|\b0)\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/;

// Session quantity after the token (this package's own table, decision 14)
var QUANTITY_PATTERN = /^(\d+(?:\.\d+)?)(km|mi|min)$|^(\d+)x(\d+(?:\.\d+)?)(min|m)$/;

// ---------------------------------------------------------------------------
// Web app
// ---------------------------------------------------------------------------

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('PlanProposal');
  var sheet = String((e && e.parameter && e.parameter.sheet) || '');
  template.sheet = /^[a-zA-Z0-9_-]{20,}$/.test(sheet) ? sheet : '';
  return template.evaluate()
    .setTitle('Plan Proposal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Run once from the editor to grant permissions and create the Log sheet. */
function authorise() {
  if (!folderId_()) {
    throw new Error('Missing Script Property: FOLDER_ID');
  }
  readPromptTemplate_();
  getLogSheet_();
  Logger.log('Authorised.');
}

/**
 * Step 1. input: { sheet: link or ID }
 * Returns { ok, prompt, filled, notes, warnings } or { ok: false, errors }.
 */
function buildPrompt(input) {
  var template = readPromptTemplate_();
  var version = promptVersion_(template);
  var sheetId = '';
  try {
    sheetId = parseSheetId_(input && input.sheet);
    var ss = openAthleteSheet_(sheetId);

    var aiCopy = readAiCopy_(ss);
    var brief = readBrief_(ss);
    var window = readWindow_(aiCopy, brief);
    var paces = readPaces_(ss);

    var prompt = template
      .split('{{AI_COPY_TABLE}}').join(aiCopy.lines.join('\n'))
      .split('{{PACES_BLOCK}}').join(paces.join('\n'))
      .split('{{PLAN_START}}').join(formatLongDate_(window.planStart))
      .split('{{RACE_DATE}}').join(formatLongDate_(window.raceDate))
      .split('{{WEEKS_TO_RETURN}}').join(String(window.weeks))
      .split('{{UNITS}}').join(window.units === 'mile' ? 'miles (write distances with "mi")' : 'km')
      .split('{{COACH_BRIEF}}').join(brief.text);

    // The import checks the reply against what this prompt asked for
    PropertiesService.getScriptProperties().setProperty(BUILD_KEY_PREFIX + sheetId, JSON.stringify({
      planStart: isoDate_(window.planStart),
      raceDate: isoDate_(window.raceDate),
      weeks: window.weeks,
      units: window.units,
      aiSections: brief.aiSections,
      questions: brief.questions.length,
      version: version,
      builtAt: new Date().toISOString()
    }));

    var notes = brief.notes.slice();
    notes.push('Weeks asked for: ' + window.weeks + ' (' + isoDate_(window.planStart) + ' to the week of ' + isoDate_(window.raceDate) + ').');
    notes.push('Left to the AI: ' + (brief.aiSections.join(', ') || 'nothing') + '.');

    log_(sheetId, 'prompt', version, 'ok');
    return {
      ok: true,
      prompt: prompt,
      filled: [TAB_AI_COPY + ' tab', TAB_PACES + ' tab', TAB_LISTS + ' tab', TAB_BRIEF + ' tab'],
      notes: notes,
      warnings: startWarnings_(window.planStart, new Date()).concat(promptWarnings_(aiCopy.rows, brief.sections))
    };
  } catch (err) {
    return failure_(err, sheetId, 'prompt', version);
  }
}

/**
 * Step 2. input: { sheet: link or ID, reply: the AI's reply }
 * Returns { ok, summary } or { ok: false, errors }. Nothing is written unless every check passes.
 */
function importProposal(input) {
  var version = promptVersion_(readPromptTemplate_());
  var sheetId = '';
  try {
    sheetId = parseSheetId_(input && input.sheet);
    var ss = openAthleteSheet_(sheetId);
    var lists = readLists_(ss);
    var expected = expectedWindow_(ss, sheetId);

    var parsed = parseReply_(input && input.reply);
    if (parsed.error) {
      log_(sheetId, 'import', version, 'invalid_json');
      return { ok: false, errors: [parsed.error] };
    }

    var result = validateReply_(parsed.data, {
      tokens: lists.tokens,
      phases: lists.phases,
      weeksExpected: expected.weeks,
      briefSections: BRIEF_SECTIONS.map(function (b) { return b.name; }),
      aiSections: expected.aiSections,
      questionsCount: expected.questions,
      units: expected.units
    });
    if (result.errors.length) {
      log_(sheetId, 'import', version, 'invalid');
      return { ok: false, errors: result.errors };
    }

    var stamp = Utilities.formatDate(new Date(), 'Europe/London', 'd MMM yyyy HH:mm');
    writeProposalTab_(ss, result.clean, version, stamp, expected);
    writeRationaleTab_(ss, result.clean, version, stamp);
    var summaryKept = writeSummaryTab_(ss, result.clean.athleteSummary, version, stamp);

    log_(sheetId, 'import', version, 'ok');
    return {
      ok: true,
      summary: {
        tabs: [TAB_PROPOSAL, TAB_RATIONALE, TAB_SUMMARY],
        summaryKept: summaryKept,
        weeks: result.clean.weeks.length,
        departures: result.clean.plan.departures.length,
        goalView: result.clean.plan.goal_view,
        assumptions: result.clean.plan.assumptions.length,
        answers: result.clean.plan.answers_to_questions.length,
        expectedFrom: expected.source
      }
    };
  } catch (err) {
    return failure_(err, sheetId, 'import', version);
  }
}

// ---------------------------------------------------------------------------
// Opening and reading the athlete sheet
// ---------------------------------------------------------------------------

/** An error whose message is safe to show on the page. */
function UserError_(message, code, list) {
  this.message = message;
  this.code = code;
  this.list = list || [message];
}

function failure_(err, sheetId, action, version) {
  if (err instanceof UserError_) {
    log_(sheetId, action, version, err.code);
    return { ok: false, errors: err.list };
  }
  log_(sheetId, action, version, 'error');
  return { ok: false, errors: ['Something went wrong. Check the sheet link and try again.'] };
}

function parseSheetId_(value) {
  var text = String(value || '').trim();
  var match = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(text) || /^([a-zA-Z0-9_-]{20,})$/.exec(text);
  if (!match) throw new UserError_('Paste the athlete sheet link or its ID.', 'bad_link');
  return match[1];
}

/** FOLDER_ID from Script Properties, tolerating spaces or a pasted folder URL. */
function folderId_() {
  var raw = String(PropertiesService.getScriptProperties().getProperty('FOLDER_ID') || '').trim();
  var match = /folders\/([a-zA-Z0-9_-]+)/.exec(raw);
  return match ? match[1] : raw;
}

/** The spreadsheet, only if it is a Google Sheet directly inside the athlete folder. */
function openAthleteSheet_(sheetId) {
  var folderId = folderId_();
  if (!folderId) throw new UserError_('FOLDER_ID is not set in Script Properties.', 'no_folder_id');

  var file;
  try {
    file = DriveApp.getFileById(sheetId);
  } catch (err) {
    throw new UserError_('That sheet could not be opened.', 'not_found');
  }
  if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new UserError_('That file is not a Google Sheet.', 'not_a_sheet');
  }

  var inFolder = false;
  var parentNames = [];
  var parents = file.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    if (parent.getId() === folderId) inFolder = true;
    parentNames.push('"' + parent.getName() + '"');
  }
  if (!inFolder) {
    var expected = '';
    try { expected = ' The tool expects "' + DriveApp.getFolderById(folderId).getName() + '".'; } catch (err) { expected = ' FOLDER_ID does not match any folder.'; }
    throw new UserError_('That sheet is not in the athlete folder, so it was refused. It is in ' +
      (parentNames.join(', ') || 'no folder') + '.' + expected, 'outside_folder');
  }

  return SpreadsheetApp.openById(sheetId);
}

/** Label and answer rows from the AI copy tab. Never falls back to the Athlete tab. */
function readAiCopy_(ss) {
  var sheet = ss.getSheetByName(TAB_AI_COPY);
  if (!sheet) {
    throw new UserError_('This sheet has no "' + TAB_AI_COPY + '" tab. Add it (see the template) and try again. The Athlete tab is never used.', 'no_ai_copy');
  }

  var values = sheet.getDataRange().getDisplayValues();
  var rows = [];
  values.forEach(function (row) {
    var label = String(row[0] || '').trim();
    var answer = String(row[1] || '').replace(/\s*\n\s*/g, ' / ').trim();
    if (label && answer) rows.push({ label: label, answer: answer });
  });
  if (rows.length === 0) {
    throw new UserError_('The "' + TAB_AI_COPY + '" tab is empty. Check its formula.', 'ai_copy_empty');
  }

  return {
    rows: rows,
    lines: rows.map(function (r) { return r.label + ': ' + r.answer; }),
    find: function (label) {
      for (var i = 0; i < rows.length; i++) if (rows[i].label === label) return rows[i].answer;
      return '';
    }
  };
}

/** Race date and units from the AI copy tab, plan start from the Brief, and the number of weeks to return. */
function readWindow_(aiCopy, brief) {
  var raceDate = parseDate_(aiCopy.find(LABEL_RACE_DATE));
  if (!raceDate) throw new UserError_('No valid "' + LABEL_RACE_DATE + '" in the AI copy tab.', 'no_race_date');

  var unitsAnswer = aiCopy.find(LABEL_UNITS).toLowerCase();
  var units = unitsAnswer.indexOf('mile') === 0 ? 'mile' : 'km';

  var weeks = weeksBetween_(brief.planStart, raceDate);
  if (weeks < 1) throw new UserError_('The race date is before the plan start on the Brief tab.', 'race_before_start');
  if (weeks > MAX_WEEKS) {
    throw new UserError_('That is ' + weeks + ' weeks. The most this tool handles is ' + MAX_WEEKS + '. Set a later "First week starts" on the Brief tab.', 'too_many_weeks');
  }
  return { planStart: brief.planStart, raceDate: raceDate, units: units, weeks: weeks };
}

/**
 * The Brief tab: each section's mode and text, and the plan settings.
 * Returns { text, sections, aiSections, questions, planStart, notes }. Lists every problem at once.
 */
function readBrief_(ss) {
  var sheet = ss.getSheetByName(TAB_BRIEF);
  if (!sheet) throw new UserError_('This sheet has no "' + TAB_BRIEF + '" tab.', 'no_brief');
  var range = sheet.getDataRange();
  var values = range.getValues();
  var display = range.getDisplayValues();
  var findRow = function (label) {
    for (var r = 0; r < values.length; r++) if (String(values[r][0]).trim() === label) return r;
    return -1;
  };
  if (findRow('Section') === -1) {
    throw new UserError_('The Brief tab is not in the v8 layout. Create the athlete sheet from template v8 or later.', 'brief_old_layout');
  }

  var problems = [];
  var lines = [];
  var sections = [];
  var aiSections = [];
  var questions = [];

  BRIEF_SECTIONS.forEach(function (def) {
    var r = findRow(def.name);
    if (r === -1) { problems.push('The Brief tab has no "' + def.name + '" row.'); return; }
    var mode = String(display[r][1] || '').trim();
    var text = String(display[r][2] || '').trim();
    var allowed = def.defaultText ? [MODE_COACH, MODE_AI] : [MODE_COACH, MODE_NONE];
    if (allowed.indexOf(mode) === -1) {
      problems.push('"' + def.name + '": choose ' + allowed.join(' or ') + ' in column B.');
      return;
    }
    if (mode === MODE_COACH) {
      if (!text) { problems.push('"' + def.name + '" is set to Coach specifies but column C is empty.'); return; }
      sections.push({ name: def.name, text: text });
      lines.push('- ' + def.name + ': Coach specifies: ' + text.replace(/\s*\n\s*/g, ' / '));
      if (def.name === QUESTIONS_SECTION) {
        questions = text.split(/\r?\n/).map(function (q) { return q.trim(); }).filter(Boolean);
      }
    } else if (mode === MODE_AI) {
      aiSections.push(def.name);
      lines.push('- ' + def.name + ': AI to choose. ' + def.defaultText);
    }
  });

  var setting = function (label) {
    var r = findRow(label);
    return r === -1 ? { value: '', display: '' } : { value: values[r][1], display: String(display[r][1] || '').trim() };
  };
  var notes = [];

  var startCell = setting(SETTING.start);
  var raw = startCell.value;
  var planStart = null;
  if (Object.prototype.toString.call(raw) === '[object Date]' && !isNaN(raw.getTime())) {
    planStart = utcDate_(raw.getFullYear(), raw.getMonth(), raw.getDate());
  } else if (startCell.display) {
    planStart = parseDate_(startCell.display);
  }
  if (!planStart) problems.push('Set "' + SETTING.start + '" on the Brief tab to the Monday the plan starts.');
  else if (planStart.getUTCDay() !== 1) problems.push('"' + SETTING.start + '" on the Brief tab must be a Monday.');

  var metric = setting(SETTING.metric).display;
  if (!metric) { metric = 'Distance'; notes.push('"' + SETTING.metric + '" is empty on the Brief tab, so Distance was used.'); }
  var load = setting(SETTING.load).display;
  if (!load) { load = '3:1 step'; notes.push('"' + SETTING.load + '" is empty on the Brief tab, so 3:1 step was used.'); }
  var cut = setting(SETTING.cut).display || '0.25';
  var warmup = Number(setting(SETTING.warmup).value) || 0;

  if (problems.length) throw new UserError_(problems.join(' '), 'brief_incomplete', problems);

  var settingsLine = 'Plan settings: first week starts ' + formatLongDate_(planStart) +
    '; primary metric ' + metric + '; load strategy ' + load + '; down-week cut ' + cut +
    (warmup > 0
      ? '; warm-up and cool-down ' + warmup + ' min easy each, before and after every Tempo and Interval day.'
      : '; no warm-up or cool-down is added.');

  return {
    text: (lines.length ? lines.join('\n') : '- Every section is set to None.') + '\n\n' + settingsLine,
    sections: sections,
    aiSections: aiSections,
    questions: questions,
    planStart: planStart,
    notes: notes
  };
}

/** What the last prompt for this sheet asked for, or the same calculation again from the sheet. */
function expectedWindow_(ss, sheetId) {
  var saved = PropertiesService.getScriptProperties().getProperty(BUILD_KEY_PREFIX + sheetId);
  if (saved) {
    var build = JSON.parse(saved);
    return {
      weeks: build.weeks, planStart: build.planStart, raceDate: build.raceDate,
      units: build.units || '', aiSections: build.aiSections || [], questions: build.questions || 0, source: 'prompt'
    };
  }
  var brief = readBrief_(ss);
  var window = readWindow_(readAiCopy_(ss), brief);
  return {
    weeks: window.weeks, planStart: isoDate_(window.planStart), raceDate: isoDate_(window.raceDate),
    units: window.units, aiSections: brief.aiSections, questions: brief.questions.length, source: 'sheet'
  };
}

/** Fixed result cells on the Paces tab (template v7), as displayed. */
function readPaces_(ss) {
  var sheet = ss.getSheetByName(TAB_PACES);
  if (!sheet) throw new UserError_('This sheet has no "' + TAB_PACES + '" tab.', 'no_paces');
  var v = sheet.getRange('A1:K41').getDisplayValues();
  var cell = function (a1) {
    var col = a1.charCodeAt(0) - 65;
    var row = Number(a1.slice(1)) - 1;
    return String(v[row][col] || '').trim();
  };

  var lines = [];
  var add = function (label, value) { if (value) lines.push(label + ': ' + value); };

  add(cell('A4'), cell('B4'));
  add(cell('A5'), cell('B5'));
  add(cell('A6'), cell('B6'));
  add(cell('A7'), cell('B7'));

  var predictions = [];
  for (var r = 21; r <= 24; r++) {
    if (cell('C' + r)) {
      predictions.push('- ' + cell('A' + r) + ': ' + cell('C' + r) + ' (' + cell('D' + r) + ' /km, ' + cell('E' + r) + ' /mile)');
    }
  }
  if (predictions.length) lines.push('Predicted race times from the baseline:', predictions.join('\n'));

  var zones = [];
  for (var z = 30; z <= 33; z++) {
    if (cell('J' + z)) zones.push('- ' + cell('A' + z) + ': ' + cell('J' + z) + (cell('K' + z) ? ' (effort ' + cell('K' + z) + ')' : ''));
  }
  if (zones.length) lines.push('Training paces (Long runs use Easy pace):', zones.join('\n'));

  add(cell('A37'), cell('B37'));
  add(cell('A39'), cell('B39'));
  add('Goal check', cell('B41'));

  if (lines.length === 0) lines.push('No paces calculated yet (the Paces tab needs a baseline).');
  return lines;
}

/** Tokens, phases and units from the Lists tab, found by their header names. */
function readLists_(ss) {
  var sheet = ss.getSheetByName(TAB_LISTS);
  if (!sheet) throw new UserError_('This sheet has no "' + TAB_LISTS + '" tab.', 'no_lists');
  var values = sheet.getDataRange().getDisplayValues();

  var column = function (header) {
    for (var r = 0; r < values.length; r++) {
      var c = values[r].indexOf(header);
      if (c !== -1) {
        var out = [];
        for (var i = r + 1; i < values.length && String(values[i][c]).trim() !== ''; i++) out.push(String(values[i][c]).trim());
        return out;
      }
    }
    throw new UserError_('The Lists tab has no "' + header + '" column.', 'lists_header_missing');
  };

  return { tokens: column(LIST_TOKENS), phases: column(LIST_PHASES), units: column(LIST_UNITS) };
}

// ---------------------------------------------------------------------------
// Prompt warnings (section 4.6). Name the field and the kind, never the text.
// ---------------------------------------------------------------------------

/** A warning if the plan would start before this week's Monday. */
function startWarnings_(planStart, now) {
  var today = utcDate_(now.getFullYear(), now.getMonth(), now.getDate());
  var thisMonday = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * 86400000);
  if (planStart.getTime() >= thisMonday.getTime()) return [];
  return ['"' + SETTING.start + '" (' + isoDate_(planStart) + ') is in the past, so the plan would start before this week. ' +
    'Change it on the Brief tab if that is not what you want.'];
}

function promptWarnings_(rows, sections) {
  var warnings = [];
  var check = function (field, text) {
    if (HEALTH_PATTERN.test(text)) warnings.push('"' + field + '" contains a health word.');
    if (EMAIL_PATTERN.test(text)) warnings.push('"' + field + '" contains what looks like an email address.');
    if (PHONE_PATTERN.test(text)) warnings.push('"' + field + '" contains what looks like a phone number.');
  };
  rows.forEach(function (r) { check(r.label, r.answer); });
  (sections || []).forEach(function (sec) {
    check('Brief: ' + sec.name, sec.text);
    if (sec.name === HEALTH_SECTION) {
      warnings.push('"Brief: ' + HEALTH_SECTION + '" is filled in. Check it uses training terms only: no conditions, body parts or diagnoses.');
    }
  });
  return warnings;
}

// ---------------------------------------------------------------------------
// Reply parsing and validation
// ---------------------------------------------------------------------------

function parseReply_(reply) {
  var text = String(reply || '').trim();
  if (!text) return { error: 'Paste the AI reply first.' };
  var fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced) text = fenced[1].trim();
  try {
    return { data: JSON.parse(text) };
  } catch (err) {
    return { error: 'The reply is not valid JSON. Ask the AI to reply with the JSON code block only, then paste it again.' };
  }
}

/**
 * Checks a parsed reply. ctx: { tokens, phases, weeksExpected }.
 * Returns { errors: [...], clean } where clean holds sheet-safe values (formula guard applied).
 */
function validateReply_(data, ctx) {
  var errors = [];
  var err = function (message) { errors.push(message); };

  if (!isObject_(data)) return { errors: ['The reply must be one JSON object with "plan" and "weeks".'] };
  if (!isObject_(data.plan)) err('"plan" is missing or not an object.');
  if (!Array.isArray(data.weeks)) err('"weeks" is missing or not a list.');
  if (errors.length) return { errors: errors };

  // ---- plan ----
  var p = data.plan;
  var names = ctx.briefSections || [];
  var plan = {
    departures: checkObjects_(err, 'plan departures', p.departures, function (o, where) {
      checkSectionName_(err, where, o.section, names);
      return {
        section: guard_(String(o.section || '')),
        what: checkText_(err, where + ' what', o.what, WORD_LIMITS.short, true),
        why: checkText_(err, where + ' why', o.why, WORD_LIMITS.short, true)
      };
    }),
    choices: checkObjects_(err, 'plan choices', p.choices, function (o, where) {
      checkSectionName_(err, where, o.section, names);
      return {
        section: String(o.section || ''),
        choice: checkText_(err, where + ' choice', o.choice, WORD_LIMITS.short, true),
        reason: checkText_(err, where + ' reason', o.reason, WORD_LIMITS.short, true)
      };
    }),
    follows_brief: checkText_(err, 'plan follows_brief', p.follows_brief, WORD_LIMITS.follows_brief, true),
    goal_view: '',
    goal_view_reason: checkText_(err, 'plan goal_view_reason', p.goal_view_reason, WORD_LIMITS.goal_view_reason, true),
    phases: [],
    answers_to_questions: checkObjects_(err, 'plan answers_to_questions', p.answers_to_questions, function (o, where) {
      return {
        question: checkText_(err, where + ' question', o.question, null, true),
        answer: checkText_(err, where + ' answer', o.answer, WORD_LIMITS.answer, true)
      };
    }),
    assumptions: checkList_(err, 'plan assumptions', p.assumptions)
  };

  // Every section left to the AI needs a choice; questions need answers
  (ctx.aiSections || []).forEach(function (name) {
    var found = plan.choices.some(function (c) { return c.section === name; });
    if (!found) err('plan choices has no entry for "' + name + '", which the brief left to the AI.');
  });
  if ((ctx.questionsCount || 0) > 0 && plan.answers_to_questions.length === 0) {
    err('plan answers_to_questions is empty but the brief asked ' + ctx.questionsCount + ' question(s).');
  }

  if (GOAL_VIEWS.indexOf(p.goal_view) === -1) err('plan goal_view must be one of: ' + GOAL_VIEWS.join(', ') + '.');
  else plan.goal_view = p.goal_view;

  if (!Array.isArray(p.phases)) {
    err('plan phases must be a list.');
  } else {
    p.phases.forEach(function (ph, i) {
      var where = 'plan phase ' + (i + 1);
      if (!isObject_(ph)) { err(where + ' must be an object.'); return; }
      if (ctx.phases.indexOf(ph.name) === -1) err(where + ': "' + clip_(ph.name) + '" is not a phase on the Lists tab.');
      plan.phases.push({
        name: guard_(String(ph.name || '')),
        weeks: checkText_(err, where + ' weeks', ph.weeks, null, true),
        rationale: checkText_(err, where + ' rationale', ph.rationale, WORD_LIMITS.phase_rationale, true)
      });
    });
  }

  // ---- weeks ----
  var weeks = [];
  if (data.weeks.length > MAX_WEEKS) err('There are ' + data.weeks.length + ' weeks. The most allowed is ' + MAX_WEEKS + '.');
  if (data.weeks.length !== ctx.weeksExpected) {
    err('The reply has ' + data.weeks.length + ' weeks but the prompt asked for ' + ctx.weeksExpected + '.');
  }

  var raceCount = 0;
  var lastIndex = data.weeks.length - 1;

  data.weeks.forEach(function (w, i) {
    var label = 'Week ' + (i + 1);
    if (!isObject_(w)) { err(label + ' must be an object.'); return; }

    if (w.week !== i + 1) {
      err(label + ': "week" is ' + clip_(w.week) + ' but should be ' + (i + 1) + ' (weeks are numbered 1 upwards with no gaps).');
    } else {
      label = 'Week ' + w.week;
    }

    if (ctx.phases.indexOf(w.phase) === -1) err(label + ': phase "' + clip_(w.phase) + '" is not a phase on the Lists tab.');

    var days = [];
    if (!Array.isArray(w.days) || w.days.length !== 7) {
      err(label + ': "days" must have exactly 7 entries, Monday to Sunday.');
    } else {
      w.days.forEach(function (d, j) {
        var check = checkDay_(d, ctx.tokens, ctx.units);
        var where = label + ', ' + DAY_NAMES[j];
        if (check.error) err(where + ': ' + check.error);
        if (check.token === 'Race') {
          raceCount++;
          if (i !== lastIndex) err(where + ': Race is only allowed in the last week.');
        }
        days.push(check.value);
      });
    }

    if (typeof w.target_total_km !== 'number' || !isFinite(w.target_total_km) || w.target_total_km < 0) {
      err(label + ': "target_total_km" must be a number of 0 or more.');
    }

    var note = checkText_(err, label + ' note_for_athlete', w.note_for_athlete, WORD_LIMITS.note_for_athlete, false);
    var healthWord = HEALTH_PATTERN.exec(String(w.note_for_athlete || ''));
    if (healthWord) err(label + ' note_for_athlete contains the health word "' + healthWord[1] + '". Edit it and paste again.');

    weeks.push({
      week: i + 1,
      phase: guard_(String(w.phase || '')),
      days: days,
      target_total: typeof w.target_total_km === 'number' ? w.target_total_km : '',
      note_for_athlete: note,
      coach_note: checkText_(err, label + ' coach_note', w.coach_note, WORD_LIMITS.coach_note, false),
      rationale: checkText_(err, label + ' rationale', w.rationale, WORD_LIMITS.rationale, true),
      based_on: checkList_(err, label + ' based_on', w.based_on).join(', ')
    });
  });

  if (raceCount > 1) err('Race appears ' + raceCount + ' times. It is allowed at most once, in the last week.');

  // ---- athlete summary (shown to the runner after the coach edits it) ----
  var athleteSummary = null;
  var a = data.athlete_summary;
  if (!isObject_(a)) {
    err('"athlete_summary" is missing or not an object. Build the prompt again with this tool (prompt v4) and ask the AI again.');
  } else {
    var healthCheck = function (where, text) {
      var hit = HEALTH_PATTERN.exec(String(text || ''));
      if (hit) err(where + ' contains the health word "' + hit[1] + '". Edit it and paste again.');
    };
    athleteSummary = {
      intro: checkText_(err, 'athlete_summary intro', a.intro, WORD_LIMITS.summary_intro, true),
      goal: checkText_(err, 'athlete_summary goal', a.goal, WORD_LIMITS.summary_goal, true),
      phases: checkObjects_(err, 'athlete_summary phases', a.phases, function (o, where) {
        healthCheck(where, o.what_it_is_for);
        var match = plan.phases.some(function (ph) { return ph.name === o.name && ph.weeks === String(o.weeks || '').trim(); });
        if (!match) err(where + ': "' + clip_(o.name) + '" weeks ' + clip_(o.weeks) + ' does not match a phase in "plan".');
        return {
          name: guard_(String(o.name || '')),
          weeks: checkText_(err, where + ' weeks', o.weeks, null, true),
          what: checkText_(err, where + ' what_it_is_for', o.what_it_is_for, WORD_LIMITS.summary_phase, true)
        };
      }),
      paces: checkText_(err, 'athlete_summary paces', a.paces, WORD_LIMITS.summary_paces, true),
      keyPoints: checkList_(err, 'athlete_summary key_points', a.key_points)
    };
    healthCheck('athlete_summary intro', a.intro);
    healthCheck('athlete_summary goal', a.goal);
    healthCheck('athlete_summary paces', a.paces);
    if (Array.isArray(a.key_points)) {
      if (a.key_points.length > MAX_KEY_POINTS) err('athlete_summary key_points has ' + a.key_points.length + ' items. The most allowed is ' + MAX_KEY_POINTS + '.');
      a.key_points.forEach(function (k, i) {
        var where = 'athlete_summary key_points item ' + (i + 1);
        healthCheck(where, k);
        var words = String(k || '').trim().split(/\s+/).filter(Boolean).length;
        if (words > WORD_LIMITS.summary_point) err(where + ' has ' + words + ' words. The limit is ' + WORD_LIMITS.summary_point + '.');
      });
    }
    if (athleteSummary.phases.length === 0) err('athlete_summary phases is empty.');
  }

  return { errors: errors, clean: { plan: plan, weeks: weeks, athleteSummary: athleteSummary } };
}

/** One day string: token, then a quantity (or Rest alone). */
function checkDay_(value, tokens, units) {
  if (typeof value !== 'string') return { error: 'must be text.', value: '' };
  var text = value.trim();
  if (text.length > DAY_STRING_CAP) return { error: '"' + clip_(text) + '" is longer than ' + DAY_STRING_CAP + ' characters.', value: '' };

  var space = text.indexOf(' ');
  var token = space === -1 ? text : text.slice(0, space);
  if (tokens.indexOf(token) === -1) {
    return { error: '"' + text + '" does not start with an allowed word (' + tokens.join(', ') + ').', value: '' };
  }
  if (token === 'Rest') {
    return text === 'Rest' ? { token: token, value: 'Rest' } : { error: '"' + text + '": Rest must be on its own.', value: '' };
  }
  if (space === -1) return { error: '"' + text + '" needs a quantity after ' + token + ', for example ' + token + ' 8km.', token: token, value: '' };

  var quantity = text.slice(space + 1);
  var m = QUANTITY_PATTERN.exec(quantity);
  if (!m) {
    return { error: '"' + text + '": the quantity must be like 8km, 5mi, 25min, 3x10min or 6x400m.', token: token, value: '' };
  }

  // The race day keeps the race's own distance (Race 10km for a miles runner is fine); other sessions match the runner
  var unitsApply = token !== 'Race';
  if (unitsApply && units === 'mile' && m[2] === 'km') {
    return { error: '"' + text + '" is in km but this runner uses miles. Write it in mi.', token: token, value: '' };
  }
  if (unitsApply && units === 'km' && m[2] === 'mi') {
    return { error: '"' + text + '" is in miles but this runner uses km. Write it in km.', token: token, value: '' };
  }

  var km = 0;
  var minutes = 0;
  var reps = 0;
  if (m[1]) {
    var n = Number(m[1]);
    if (!(n > 0)) return { error: '"' + text + '": the number must be more than 0.', token: token, value: '' };
    if (m[2] === 'km') km = n;
    else if (m[2] === 'mi') km = n * KM_PER_MILE;
    else minutes = n;
  } else {
    reps = Number(m[3]);
    var each = Number(m[4]);
    if (!(reps > 0) || !(each > 0)) return { error: '"' + text + '": the numbers must be more than 0.', token: token, value: '' };
    if (m[5] === 'min') minutes = reps * each;
    else km = reps * each / 1000;
  }

  if (km > MAX_SESSION_KM) return { error: '"' + text + '" is over the ' + MAX_SESSION_KM + ' km (about 28 mi) limit for one session.', token: token, value: '' };
  if (minutes > MAX_SESSION_MIN) return { error: '"' + text + '" is over the ' + MAX_SESSION_MIN + ' minute limit for one session.', token: token, value: '' };
  if (reps > MAX_REPS) return { error: '"' + text + '" is over the ' + MAX_REPS + ' rep limit.', token: token, value: '' };

  return { token: token, value: text };
}

/** A string within its word limit and the hard cap, formula-guarded. Required strings must not be empty. */
function checkText_(err, where, value, wordLimit, required) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') { err(where + ' must be text.'); return ''; }
  var text = value.trim();
  if (required && !text) err(where + ' is missing.');
  if (text.length > HARD_TEXT_CAP) err(where + ' is longer than ' + HARD_TEXT_CAP + ' characters.');
  if (wordLimit) {
    var words = text ? text.split(/\s+/).length : 0;
    if (words > wordLimit) err(where + ' has ' + words + ' words. The limit is ' + wordLimit + '.');
  }
  return guard_(text);
}

/** A list of short strings, each formula-guarded. */
function checkList_(err, where, value) {
  if (!Array.isArray(value)) { err(where + ' must be a list.'); return []; }
  if (value.length > MAX_LIST_ITEMS) err(where + ' has more than ' + MAX_LIST_ITEMS + ' items.');
  return value.map(function (item, i) {
    if (typeof item !== 'string') { err(where + ' item ' + (i + 1) + ' must be text.'); return ''; }
    if (item.length > HARD_TEXT_CAP) err(where + ' item ' + (i + 1) + ' is longer than ' + HARD_TEXT_CAP + ' characters.');
    return guard_(item.trim());
  });
}

/** A list of objects, each checked by fn(object, where). Returns the checked objects. */
function checkObjects_(err, where, value, fn) {
  if (!Array.isArray(value)) { err(where + ' must be a list.'); return []; }
  if (value.length > MAX_LIST_ITEMS) err(where + ' has more than ' + MAX_LIST_ITEMS + ' items.');
  var out = [];
  value.forEach(function (o, i) {
    var label = where + ' ' + (i + 1);
    if (!isObject_(o)) { err(label + ' must be an object.'); return; }
    out.push(fn(o, label));
  });
  return out;
}

function checkSectionName_(err, where, value, names) {
  if (names.indexOf(value) === -1) err(where + ': section "' + clip_(value) + '" is not a Brief section name.');
}

/** Text that cannot run as a formula. */
function guard_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isObject_(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function clip_(v) {
  var s = String(v);
  return s.length > 40 ? s.slice(0, 40) + '...' : s;
}

// ---------------------------------------------------------------------------
// Writing the two tabs. Nothing else in the sheet is touched.
// ---------------------------------------------------------------------------

function freshTab_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    sheet.clear();
    return sheet;
  }
  return ss.insertSheet(name, ss.getSheets().length);
}

/** Mirrors the Plan tab's columns: A week, C phase, D 7, E:K days, U:V notes, W rationale. O to T and X stay blank. */
function writeProposalTab_(ss, clean, version, stamp, expected) {
  var sheet = freshTab_(ss, TAB_PROPOSAL);
  var WIDTH = 26; // A to Z
  var row = function (cells) {
    var out = [];
    for (var i = 0; i < WIDTH; i++) out.push(cells[i] === undefined ? '' : cells[i]);
    return out;
  };
  var col = function (letter) { return letter.charCodeAt(0) - 65; };

  var top = [
    ['AI proposal'],
    ['Prompt version: ' + version],
    ['Imported: ' + stamp],
    ['This is an AI proposal for the coach to review. Nothing here is live until copied into the Plan tab.'],
    ['Column Z holds the AI\'s estimated weekly totals. The Plan tab recalculates the real totals.'],
    ['Plan start ' + expected.planStart + ', race day ' + expected.raceDate + ', ' + clean.weeks.length + ' weeks.'],
    ['Paste C:K, then U:W, into the Plan tab as values. Never paste over O to T.']
  ];
  sheet.getRange(1, 1, top.length, WIDTH).setValues(top.map(row));

  var header = {};
  header[col('A')] = 'Week';
  header[col('C')] = 'Phase';
  header[col('D')] = 'Microcycle days';
  for (var d = 0; d < 7; d++) header[col('E') + d] = 'Day ' + (d + 1);
  header[col('U')] = 'Note for athlete';
  header[col('V')] = 'Coach notes (private)';
  header[col('W')] = 'Rationale';
  header[col('Y')] = 'Based on';
  header[col('Z')] = 'AI target total (runner\'s units)';
  sheet.getRange(9, 1, 1, WIDTH).setValues([row(header)]);

  var body = clean.weeks.map(function (w) {
    var cells = {};
    cells[col('A')] = w.week;
    cells[col('C')] = w.phase;
    cells[col('D')] = 7;
    for (var i = 0; i < 7; i++) cells[col('E') + i] = w.days[i];
    cells[col('U')] = w.note_for_athlete;
    cells[col('V')] = w.coach_note;
    cells[col('W')] = w.rationale;
    cells[col('Y')] = w.based_on;
    cells[col('Z')] = w.target_total;
    return row(cells);
  });

  if (body.length) {
    // Text columns as plain text so nothing is reinterpreted
    sheet.getRange(10, col('C') + 1, body.length, 1).setNumberFormat('@');
    sheet.getRange(10, col('E') + 1, body.length, 7).setNumberFormat('@');
    sheet.getRange(10, col('U') + 1, body.length, 5).setNumberFormat('@');
    sheet.getRange(10, 1, body.length, WIDTH).setValues(body);
    sheet.getRange(10, col('W') + 1, body.length, 1).setWrap(true);
  }

  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  sheet.getRange(7, 1).setFontWeight('bold').setFontColor('#b91c1c');
  sheet.getRange(9, 1, 1, WIDTH).setFontWeight('bold').setBackground('#e5e7eb');
  sheet.setFrozenRows(9);
  sheet.setColumnWidth(col('W') + 1, 400);
  sheet.setColumnWidths(col('U') + 1, 2, 260);
}

/** The plan explained against the coach's brief. Departures first, because they need a decision. */
function writeRationaleTab_(ss, clean, version, stamp) {
  var sheet = freshTab_(ss, TAB_RATIONALE);
  var plan = clean.plan;
  var rows = [
    ['AI rationale', ''],
    ['Prompt version', version],
    ['Imported', stamp],
    ['', 'Read the departures first: they are where the AI did something different from your brief.']
  ];
  var section = function (title, items) {
    rows.push(['', '']);
    if (items.length === 0) {
      rows.push([title, 'None']);
      return;
    }
    items.forEach(function (item, i) { rows.push([i === 0 ? title : '', item]); });
  };

  var view = plan.goal_view.replace('_', ' ');
  section('Departures from your brief', plan.departures.map(function (d) { return d.section + ': ' + d.what + ' Why: ' + d.why; }));
  section('What the AI chose', plan.choices.map(function (c) { return c.section + ': ' + c.choice + ' Reason: ' + c.reason; }));
  section('How the plan follows your brief', [plan.follows_brief]);
  section('Goal view', [view.charAt(0).toUpperCase() + view.slice(1) + '. ' + plan.goal_view_reason]);
  section('Phases', plan.phases.map(function (ph) { return ph.name + ' (weeks ' + ph.weeks + '): ' + ph.rationale; }));
  section('Answers to your questions', plan.answers_to_questions.map(function (a) { return 'Q: ' + a.question + '\nA: ' + a.answer; }));
  section('Assumptions', plan.assumptions);

  var range = sheet.getRange(1, 1, rows.length, 2);
  range.setNumberFormat('@');
  range.setValues(rows);
  range.setWrap(true).setVerticalAlignment('top');
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  sheet.getRange(1, 1, rows.length, 1).setFontWeight('bold');
  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 640);
}

/**
 * The athlete-facing summary: A section, B AI draft, C the coach's final words (what Publish uses).
 * Column C is kept wherever it already has text, so re-importing never overwrites the coach's edits.
 * Returns how many rows kept the coach's existing words.
 */
function writeSummaryTab_(ss, summary, version, stamp) {
  var existing = {};
  var sheet = ss.getSheetByName(TAB_SUMMARY);
  if (sheet) {
    sheet.getDataRange().getValues().forEach(function (row) {
      var label = String(row[0] || '').trim();
      if (SUMMARY_ROWS.indexOf(label) !== -1 && String(row[2] || '').trim() !== '') existing[label] = String(row[2]);
    });
  }

  var drafts = {
    'About your plan': summary.intro,
    'Your goal': summary.goal,
    'How the plan is built': summary.phases.map(function (ph) { return ph.name + ' (weeks ' + ph.weeks + '): ' + ph.what; }).join('\n'),
    'Using your paces': summary.paces,
    'Key points': summary.keyPoints.map(function (k) { return '- ' + k; }).join('\n'),
    'A note from your coach': ''
  };

  var kept = 0;
  var rows = SUMMARY_ROWS.map(function (label) {
    var final = existing[label];
    if (final !== undefined) kept++;
    return [label, drafts[label], final !== undefined ? final : drafts[label]];
  });

  sheet = freshTab_(ss, TAB_SUMMARY);
  var top = [
    ['Athlete summary', '', ''],
    ['Prompt version', version, ''],
    ['Imported', stamp, ''],
    ['', 'Column C is what the athlete sees. Edit it before publishing. Re-importing refreshes column B only; column C keeps your words.', ''],
    ['Section', 'AI draft', 'Final (shown to the athlete)']
  ];
  var all = top.concat(rows);
  var range = sheet.getRange(1, 1, all.length, 3);
  range.setNumberFormat('@');
  range.setValues(all);
  range.setWrap(true).setVerticalAlignment('top');
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  sheet.getRange(5, 1, 1, 3).setFontWeight('bold').setBackground('#e5e7eb');
  sheet.getRange(6, 1, rows.length, 1).setFontWeight('bold');
  sheet.getRange(6, 2, rows.length, 1).setFontColor('#6b7280');
  sheet.getRange(6, 3, rows.length, 1).setBackground('#fff9c4').setFontColor('#1d4ed8');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 420);
  sheet.setFrozenRows(5);
  return kept;
}

// ---------------------------------------------------------------------------
// Prompt file, dates, log
// ---------------------------------------------------------------------------

/** The prompt text, stored in the project as the HTML file PlanProposalPrompt. */
function readPromptTemplate_() {
  return HtmlService.createHtmlOutputFromFile(PROMPT_FILE).getContent();
}

function promptVersion_(template) {
  var first = String(template || '').split(/\r?\n/)[0].trim();
  return first || 'unknown';
}

function utcDate_(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}

/** yyyy-mm-dd or dd/mm/yyyy to a UTC midnight date, or null. */
function parseDate_(text) {
  var s = String(text || '').trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  var date = null;
  if (m) date = utcDate_(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) date = utcDate_(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return date && !isNaN(date.getTime()) ? date : null;
}

/** Monday-start weeks from start (a Monday) up to and including the week containing raceDay. */
function weeksBetween_(start, raceDay) {
  var days = Math.round((raceDay.getTime() - start.getTime()) / 86400000);
  if (days < 0) return 0;
  return Math.floor(days / 7) + 1;
}

function isoDate_(date) {
  return date.toISOString().slice(0, 10);
}

function formatLongDate_(date) {
  return Utilities.formatDate(date, 'UTC', 'EEEE d MMMM yyyy') + ' (' + isoDate_(date) + ')';
}

/** Time, sheet ID, action, prompt version, result code. Never answers or reply text. */
function log_(sheetId, action, version, code) {
  try {
    getLogSheet_().appendRow([new Date(), sheetId, action, version, code]);
  } catch (err) {
    // Logging must never break the tool
  }
}

function getLogSheet_() {
  var folder = DriveApp.getFolderById(folderId_());
  var files = folder.getFilesByName(LOG_SHEET_NAME);
  while (files.hasNext()) {
    var file = files.next();
    if (!file.isTrashed()) return SpreadsheetApp.openById(file.getId()).getSheets()[0];
  }
  var created = SpreadsheetApp.create(LOG_SHEET_NAME);
  DriveApp.getFileById(created.getId()).moveTo(folder);
  var sheet = created.getSheets()[0];
  sheet.appendRow(['Time', 'Sheet ID', 'Action', 'Prompt version', 'Result']);
  sheet.setFrozenRows(1);
  return sheet;
}

// ---------------------------------------------------------------------------
// testValidator: run from the editor. Made-up replies only, no athlete data.
// ---------------------------------------------------------------------------

function testValidator() {
  var ctx = {
    tokens: ['Easy', 'Steady', 'Tempo', 'Interval', 'Long', 'Race', 'Cross', 'Strength', 'Rest'],
    phases: ['Base', 'Build', 'Peak', 'Taper', 'Race', 'Recovery'],
    weeksExpected: 3,
    briefSections: BRIEF_SECTIONS.map(function (b) { return b.name; }),
    aiSections: ['Phase structure', 'How to apply the paces'],
    questionsCount: 1,
    units: 'km'
  };
  var milesCtx = Object.assign({}, ctx, { units: 'mile' });

  var good = function () {
    return {
      plan: {
        departures: [],
        choices: [
          { section: 'Phase structure', choice: 'Build then race.', reason: 'Short window.' },
          { section: 'How to apply the paces', choice: 'Slow end of each range.', reason: 'Recent baseline.' }
        ],
        follows_brief: 'Keeps to four runs a week as the firm rules ask.',
        goal_view: 'achievable',
        goal_view_reason: 'Baseline supports the goal.',
        phases: [{ name: 'Build', weeks: '1-2', rationale: 'Build volume.' }, { name: 'Race', weeks: '3', rationale: 'Race week.' }],
        answers_to_questions: [{ question: 'Long run on Saturday?', answer: 'Yes in week 2.' }],
        assumptions: ['Runs on Sundays']
      },
      athlete_summary: {
        intro: 'A short plan to get you to race day ready.',
        goal: 'Your goal is achievable with steady work.',
        phases: [{ name: 'Build', weeks: '1-2', what_it_is_for: 'Builds your volume.' }, { name: 'Race', weeks: '3', what_it_is_for: 'Fresh for race day.' }],
        paces: 'Start at the slow end of each range.',
        key_points: ['Rest days matter.', 'Warm up before tempo days.']
      },
      weeks: [
        { week: 1, phase: 'Build', days: ['Rest', 'Easy 8km', 'Rest', 'Tempo 3x10min', 'Rest', 'Cross 45min', 'Long 16km'], target_total_km: 32, note_for_athlete: 'Nice start.', coach_note: 'Watch volume.', rationale: 'Based on current volume.', based_on: ['weekly_volume'] },
        { week: 2, phase: 'Build', days: ['Rest', 'Easy 8km', 'Rest', 'Interval 6x400m', 'Strength 60min', 'Rest', 'Long 18km'], target_total_km: 34, note_for_athlete: 'Keep going.', coach_note: '', rationale: 'Steady build.', based_on: ['days_available', 'time_weekday'] },
        { week: 3, phase: 'Race', days: ['Rest', 'Easy 5km', 'Rest', 'Steady 4km', 'Rest', 'Rest', 'Race 21.1km'], target_total_km: 30, note_for_athlete: 'Race week, enjoy it.', coach_note: '', rationale: 'Taper into race.', based_on: ['goal_race_date'] }
      ]
    };
  };
  var withDay = function (week, day, value) { var r = good(); r.weeks[week].days[day] = value; return r; };
  // The same reply for a miles runner: every km distance written in mi
  var goodMiles = function () {
    var r = good();
    r.weeks.forEach(function (w) { w.days = w.days.map(function (d) { return d.replace(/km$/, 'mi'); }); });
    return r;
  };
  var milesWithDay = function (week, day, value) { var r = goodMiles(); r.weeks[week].days[day] = value; return r; };

  var cases = [
    ['Good reply', good(), null],
    ['Good reply in a code fence', '```json\n' + JSON.stringify(good()) + '\n```', null],
    ['Extra keys are ignored', (function () { var r = good(); r.extra = 1; r.weeks[0].extra = 'x'; return r; })(), null],
    ['Formula text is guarded, not rejected', (function () { var r = good(); r.weeks[0].rationale = '=1+1'; return r; })(), null],
    ['Miles reply for a miles runner', goodMiles(), null, milesCtx],
    ['27mi is inside the limit', milesWithDay(1, 6, 'Long 27mi'), null, milesCtx],
    ['km for a miles runner is refused', milesWithDay(0, 1, 'Easy 8km'), 'this runner uses miles', milesCtx],
    ['mi for a km runner is refused', withDay(0, 1, 'Easy 5mi'), 'this runner uses km'],
    ['Race in km for a miles runner is accepted', milesWithDay(2, 6, 'Race 10km'), null, milesCtx],
    ['Race in miles for a km runner is accepted', withDay(2, 6, 'Race 13.1mi'), null],
    ['Not JSON', 'Here is your plan: {', 'not valid JSON'],
    ['Jog is not a token', withDay(0, 1, 'Jog 8km'), 'Week 1, Tuesday'],
    ['Missing space', withDay(0, 1, 'Easy8km'), 'does not start with an allowed word'],
    ['Rest with a quantity', withDay(0, 0, 'Rest 1day'), 'Rest must be on its own'],
    ['Bad quantity', withDay(0, 1, 'Easy 8 km'), 'the quantity must be like'],
    ['Over 45 km', withDay(0, 6, 'Long 50km'), 'over the 45 km'],
    ['Over 28 mi', milesWithDay(0, 6, 'Long 30mi'), 'over the 45 km', milesCtx],
    ['Over 240 min', withDay(0, 3, 'Tempo 5x50min'), 'over the 240 minute'],
    ['Over 40 reps', withDay(0, 3, 'Interval 41x200m'), 'over the 40 rep'],
    ['Six days', (function () { var r = good(); r.weeks[0].days.pop(); return r; })(), 'exactly 7 entries'],
    ['Missing week', (function () { var r = good(); r.weeks.splice(1, 1); return r; })(), 'should be 2'],
    ['Wrong week count', (function () { var r = good(); r.weeks.pop(); return r; })(), 'the prompt asked for 3'],
    ['Unknown phase', (function () { var r = good(); r.weeks[0].phase = 'Speed'; return r; })(), 'not a phase on the Lists tab'],
    ['Race before the last week', withDay(0, 6, 'Race 10km'), 'only allowed in the last week'],
    ['Health word in note', (function () { var r = good(); r.weeks[1].note_for_athlete = 'Ease the adductor.'; return r; })(), 'health word "adductor"'],
    ['A departure with a reason is accepted', (function () { var r = good(); r.plan.departures = [{ section: 'Firm rules', what: 'Five runs in week 2.', why: 'Race preparation.' }]; return r; })(), null],
    ['Departure with an unknown section', (function () { var r = good(); r.plan.departures = [{ section: 'Speed', what: 'x', why: 'y' }]; return r; })(), 'is not a Brief section name'],
    ['Missing choice for an AI section', (function () { var r = good(); r.plan.choices.pop(); return r; })(), 'no entry for "How to apply the paces"'],
    ['No answers when a question was asked', (function () { var r = good(); r.plan.answers_to_questions = []; return r; })(), 'answers_to_questions is empty'],
    ['follows_brief over 80 words', (function () { var r = good(); r.plan.follows_brief = new Array(90).join('word '); return r; })(), 'The limit is 80'],
    ['v3 reply (no athlete summary) is refused', (function () { var r = good(); delete r.athlete_summary; return r; })(), '"athlete_summary" is missing'],
    ['Health word in the athlete summary', (function () { var r = good(); r.athlete_summary.paces = 'Go easy on the knee.'; return r; })(), 'athlete_summary paces contains the health word "knee"'],
    ['Health word in a key point', (function () { var r = good(); r.athlete_summary.key_points.push('Stretch the calf.'); return r; })(), 'key_points item 3 contains the health word "calf"'],
    ['Too many key points', (function () { var r = good(); r.athlete_summary.key_points = ['a', 'b', 'c', 'd', 'e', 'f']; return r; })(), 'The most allowed is 5'],
    ['Summary phase not in the plan', (function () { var r = good(); r.athlete_summary.phases[0].weeks = '1-3'; return r; })(), 'does not match a phase in "plan"'],
    ['Summary intro over 80 words', (function () { var r = good(); r.athlete_summary.intro = new Array(90).join('word '); return r; })(), 'The limit is 80'],
    ['v2 reply is refused', (function () { var r = good(); delete r.plan.follows_brief; delete r.plan.choices; delete r.plan.departures; r.plan.key_insight = 'v2'; return r; })(), 'follows_brief is missing'],
    ['Bad goal view', (function () { var r = good(); r.plan.goal_view = 'easy'; return r; })(), 'goal_view must be one of'],
    ['Missing plan', { weeks: [] }, '"plan" is missing']
  ];

  var passed = 0;
  var lines = [];
  cases.forEach(function (c) {
    var text = typeof c[1] === 'string' ? c[1] : JSON.stringify(c[1]);
    var parsed = parseReply_(text);
    var errors = parsed.error ? [parsed.error] : validateReply_(parsed.data, c[3] || ctx).errors;
    var ok = c[2] === null ? errors.length === 0 : errors.some(function (e) { return e.indexOf(c[2]) !== -1; });
    if (ok) passed++;
    lines.push((ok ? 'PASS  ' : 'FAIL  ') + c[0] + (ok ? '' : '  -> ' + (errors.join(' | ') || 'no errors')));
  });

  var guarded = validateReply_(parseReply_(JSON.stringify(cases[3][1])).data, ctx).clean.weeks[0].rationale;
  var guardOk = guarded === "'=1+1";
  lines.push((guardOk ? 'PASS  ' : 'FAIL  ') + 'Formula guard adds an apostrophe');
  if (guardOk) passed++;

  lines.push(passed + ' of ' + (cases.length + 1) + ' passed');
  Logger.log(lines.join('\n'));
  return { passed: passed, total: cases.length + 1, lines: lines };
}
