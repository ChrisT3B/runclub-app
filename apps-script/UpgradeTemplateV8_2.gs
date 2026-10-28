/**
 * UpgradeTemplateV8_2.gs - one-off patch on top of v8.1: B races (SPEC-PlanIntake-OtherRaces-v1.md, section 3).
 * Run once in the Plan Intake project, then delete this file. Needs v8.1 to have run.
 *
 * HOW TO RUN (signed in as runalcester@gmail.com)
 * 1. Open the Plan Intake project. Delete any old UpgradeTemplateV8 or V8_1 file if still there.
 * 2. + > Script, name it UpgradeTemplateV8_2, paste this whole file, Save.
 * 3. Choose `upgradeTemplateToV8_2` and click Run. Check the Execution log.
 * 4. Delete the UpgradeTemplateV8_2 file. No redeploy is needed.
 *
 * WHAT IT DOES
 * - Checks everything first, then makes a backup copy ("... (backup before v8.2)").
 * - Athlete tab: 13 new rows straight after goal_secondary, for up to 3 B races (name, date,
 *   distance, how to run it) and a note. Labels in A, keys in C, B formatted as text. They sit
 *   inside the AI copy formula's range, so the AI copy tab picks them up by itself.
 * - Brief tab: a "B races" section row after "Firm rules" (Coach specifies / AI chooses, default
 *   AI chooses). The plan settings move down one row; everything reads them by label and the
 *   formulas that point at them adjust themselves.
 * - Lists tab: "BRace" added to the Session token column.
 * - Plan tab BB10:BK33 ("is a run day", used by the Conflict flag): a BRace day counts as a run day.
 * - ReadMe: v8.2, and the session-format line mentions BRace.
 * Refuses to run before v8.1, if any part of v8.2 is already there, or if a Plan formula is not
 * the one expected. Athlete sheets already made from the template are not changed.
 */

var V82_AFTER_KEY = 'goal_secondary';
var V82_ATHLETE_ROWS = [
  ['B race 1: name', 'brace1_name'],
  ['B race 1: date', 'brace1_date'],
  ['B race 1: distance', 'brace1_distance'],
  ['B race 1: how to run it', 'brace1_priority'],
  ['B race 2: name', 'brace2_name'],
  ['B race 2: date', 'brace2_date'],
  ['B race 2: distance', 'brace2_distance'],
  ['B race 2: how to run it', 'brace2_priority'],
  ['B race 3: name', 'brace3_name'],
  ['B race 3: date', 'brace3_date'],
  ['B race 3: distance', 'brace3_distance'],
  ['B race 3: how to run it', 'brace3_priority'],
  ['B races: anything else', 'brace_note']
];
var V82_BRIEF_AFTER = 'Firm rules';
var V82_BRIEF_SECTION = 'B races';
var V82_BRIEF_HELP = 'Add or change B races (races other than the goal race) and how to run them, for example ' +
  '"10k on 14 Mar, controlled at tempo effort". If the AI chooses: follow the runner\'s choice for each B race; ' +
  '"Coach to advise" is a controlled training run.';
var V82_TOKEN_HEADER = 'Session token';
var V82_TOKEN = 'BRace';
var V82_DAY_COLUMNS = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']; // Plan day 1 to day 10
var V82_RUN_FIRST_ROW = 10;
var V82_RUN_ROWS = 24;
var V82_RUN_FIRST_COL = 54; // BB

function upgradeTemplateToV8_2() {
  var templateId = PropertiesService.getScriptProperties().getProperty('TEMPLATE_ID');
  if (!templateId) throw new Error('No TEMPLATE_ID Script Property. Run this in the Plan Intake project.');

  var file = DriveApp.getFileById(templateId);
  var ss = SpreadsheetApp.openById(templateId);
  var athlete = ss.getSheetByName('Athlete');
  var brief = ss.getSheetByName('Brief');
  var lists = ss.getSheetByName('Lists');
  var plan = ss.getSheetByName('Plan');
  var readme = ss.getSheetByName('ReadMe');
  if (!athlete || !brief || !lists || !plan) throw new Error('The template is missing an Athlete, Brief, Lists or Plan tab. Nothing changed.');

  // Check everything before changing anything
  if (findRowInColumn_(brief, 1, 'Warm-up and cool-down (minutes each)') === 0) throw new Error('Run the v8.1 upgrade first. Nothing changed.');
  if (findRowInColumn_(athlete, 3, 'brace1_date')) throw new Error('The Athlete tab already has the B race rows. v8.2 is already applied. Nothing changed.');
  if (findRowInColumn_(brief, 1, V82_BRIEF_SECTION)) throw new Error('The Brief tab already has a "B races" row. v8.2 is already applied. Nothing changed.');
  var afterRow = findRowInColumn_(athlete, 3, V82_AFTER_KEY);
  if (!afterRow) throw new Error('The Athlete tab has no ' + V82_AFTER_KEY + ' key in column C. Nothing changed.');
  var firmRow = findRowInColumn_(brief, 1, V82_BRIEF_AFTER);
  if (!firmRow) throw new Error('The Brief tab has no "' + V82_BRIEF_AFTER + '" row. Nothing changed.');
  var token = tokenCell_(lists);
  var runRange = plan.getRange(V82_RUN_FIRST_ROW, V82_RUN_FIRST_COL, V82_RUN_ROWS, V82_DAY_COLUMNS.length);
  var runFormulas = runRange.getFormulas();
  var updated = runFormulas.map(function (row, i) {
    return row.map(function (formula, j) {
      var ref = V82_DAY_COLUMNS[j] + (V82_RUN_FIRST_ROW + i);
      if (formula !== runDayFormula_(ref, false)) {
        throw new Error('Plan!' + columnLetter_(V82_RUN_FIRST_COL + j) + (V82_RUN_FIRST_ROW + i) + ' is not the expected run-day formula. Nothing changed.');
      }
      return runDayFormula_(ref, true);
    });
  });

  var backup = file.makeCopy(file.getName() + ' (backup before v8.2)');

  // Athlete tab: the B race rows, styled like the row above (insertRowsAfter copies its format)
  athlete.insertRowsAfter(afterRow, V82_ATHLETE_ROWS.length);
  var first = afterRow + 1;
  var rows = athlete.getRange(first, 1, V82_ATHLETE_ROWS.length, 4);
  rows.clearContent();
  athlete.getRange(first, 1, V82_ATHLETE_ROWS.length, 1).setValues(V82_ATHLETE_ROWS.map(function (r) { return [r[0]]; }));
  athlete.getRange(first, 2, V82_ATHLETE_ROWS.length, 1).setNumberFormat('@');
  athlete.getRange(first, 3, V82_ATHLETE_ROWS.length, 1).setValues(V82_ATHLETE_ROWS.map(function (r) { return [r[1]]; }));

  // Brief tab: the B races section, styled like the Firm rules row
  brief.insertRowsAfter(firmRow, 1);
  var b = firmRow + 1;
  brief.getRange(b, 1, 1, 4).clearContent();
  brief.getRange(b, 1).setValue(V82_BRIEF_SECTION).setFontWeight('bold');
  brief.getRange(b, 2)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Coach specifies', 'AI chooses'], true).setAllowInvalid(false).build())
    .setValue('AI chooses');
  brief.getRange(b, 3).setNumberFormat('@');
  brief.getRange(b, 4).setValue(V82_BRIEF_HELP).setFontColor('#6b7280');
  brief.getRange(b, 1, 1, 4).setWrap(true).setVerticalAlignment('top')
    .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
  brief.getRange(b, 2, 1, 2).setBackground('#fff9c4').setFontColor('#1d4ed8');

  // Lists tab: the new session token
  lists.getRange(token.row, token.col).setValue(V82_TOKEN);

  // Plan tab: a BRace day is a run day for the Conflict flag
  runRange.setFormulas(updated);

  if (readme) {
    var values = readme.getRange(1, 1, readme.getLastRow(), 1).getValues();
    values.forEach(function (v, i) {
      var text = String(v[0]);
      if (/Template v8\.1/.test(text)) readme.getRange(i + 1, 1).setValue(text.replace('Template v8.1', 'Template v8.2'));
      if (/^Use a lower case x\./.test(text) && text.indexOf('BRace') === -1) {
        readme.getRange(i + 1, 1).setValue(text + ' BRace <distance> marks a B race (a race other than the goal race) on its date; Race is the goal race only.');
      }
    });
  }

  SpreadsheetApp.flush();
  Logger.log('Template patched to v8.2: Athlete rows ' + first + '-' + (first + V82_ATHLETE_ROWS.length - 1) +
    ', Brief "B races" in row ' + b + ', "BRace" in Lists!' + columnLetter_(token.col) + token.row + ', Plan run-day formulas updated.');
  Logger.log('Backup: ' + backup.getName() + ' (' + backup.getUrl() + ')');
}

/** 1-based row of the first cell in a column whose text is exactly value, or 0. */
function findRowInColumn_(sheet, column, value) {
  var last = sheet.getLastRow();
  if (last < 1) return 0;
  var values = sheet.getRange(1, column, last, 1).getDisplayValues();
  for (var r = 0; r < values.length; r++) if (String(values[r][0]).trim() === value) return r + 1;
  return 0;
}

/** The first empty cell under the Session token header. Refuses if BRace is already listed. */
function tokenCell_(lists) {
  var values = lists.getDataRange().getDisplayValues();
  for (var r = 0; r < values.length; r++) {
    var c = values[r].indexOf(V82_TOKEN_HEADER);
    if (c === -1) continue;
    var i = r + 1;
    for (; i < values.length && String(values[i][c]).trim() !== ''; i++) {
      if (String(values[i][c]).trim() === V82_TOKEN) throw new Error('The Lists tab already has "' + V82_TOKEN + '". v8.2 is already applied. Nothing changed.');
    }
    return { row: i + 1, col: c + 1 };
  }
  throw new Error('The Lists tab has no "' + V82_TOKEN_HEADER + '" column. Nothing changed.');
}

/** The Plan "is a run day" formula for one day cell, before (false) or after (true) v8.2. */
function runDayFormula_(ref, withBRace) {
  var t = 'LEFT(TRIM(' + ref + '),';
  return '=IF(OR(' + t + '4)="Easy",' + t + '6)="Steady",' + t + '5)="Tempo",' + t + '8)="Interval",' +
    t + '4)="Long",' + t + '4)="Race"' + (withBRace ? ',' + t + '5)="BRace"' : '') + '),1,0)';
}

function columnLetter_(n) {
  var s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
