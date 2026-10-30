/**
 * BuildAthleteTemplate.gs - one-off: builds the athlete plan template that Publish copies.
 * (SPEC-PlanPublish-v1.md, sections 5 and 8.)
 *
 * HOW TO RUN (signed in as runalcester@gmail.com)
 * 1. Open the Plan Proposal project at script.google.com.
 * 2. + > Script, name it BuildAthleteTemplate, paste this whole file, Save.
 * 3. Choose `buildAthleteTemplate` and click Run. Accept any new permissions.
 * 4. The Execution log gives the new template's link. Its ID is saved as the Script Property
 *    ATHLETE_TEMPLATE_ID in this project automatically.
 * 5. Open the template and restyle it if you like (fonts, colours, column widths, logo).
 *    Keep the tab names and the named ranges (Data > Named ranges): Publish fills them by name.
 * 6. Delete the BuildAthleteTemplate file from the project. No redeploy is needed.
 *
 * WHAT IT MAKES: a Google Sheet "Athlete Plan Template" in the folder that holds the athlete
 * sheets folder (your Training Plans folder), with two tabs:
 *   "Your plan"        header (athlete, race, race date, target time, last updated; values in B:F
 *                      merged), paces with effort (merged cells, so the week table keeps its widths),
 *                      the warm-up note, and the week table (24 rows).
 *   "About your plan"  the six Athlete summary sections.
 * Named ranges (the anchors Publish uses):
 *   AP_ATHLETE, AP_RACE, AP_RACE_DATE, AP_TARGET, AP_UPDATED   one cell each
 *   AP_PACE_ZONE, AP_PACE, AP_EFFORT   4 rows x 1 each: zone (A), pace (B:D merged), effort (E:J merged)
 *   AP_NOTE      the warm-up and how-to note
 *   AP_WEEKS     24 rows x 12 columns: Week, Starts, Phase, Mon..Sun, Weekly total, Note
 *   AP_SUMMARY   6 rows x 2 columns: section, text
 * Refuses to run if ATHLETE_TEMPLATE_ID is already set, so it cannot make a duplicate.
 */

var AP_SUMMARY_SECTIONS = ['About your plan', 'Your goal', 'How the plan is built', 'Using your paces', 'Key points', 'A note from your coach'];
var AP_WEEK_ROWS = 24;
var AP_NAVY = '#1f2a44';
var AP_RED = '#dc2626';
var AP_GREY = '#6b7280';
var AP_LINE = '#d1d5db';

function buildAthleteTemplate() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('ATHLETE_TEMPLATE_ID')) {
    throw new Error('ATHLETE_TEMPLATE_ID is already set, so a template exists. Delete that property first if you really want a new one.');
  }
  var athleteFolderId = String(props.getProperty('FOLDER_ID') || '').trim().replace(/^.*folders\//, '');
  if (!athleteFolderId) throw new Error('FOLDER_ID is not set. Run this in the Plan Proposal project.');
  var parents = DriveApp.getFolderById(athleteFolderId).getParents();
  if (!parents.hasNext()) throw new Error('The athlete folder has no parent folder to put the template in.');
  var trainingPlans = parents.next();

  var ss = SpreadsheetApp.create('Athlete Plan Template');
  var plan = ss.getSheets()[0].setName('Your plan');
  var about = ss.insertSheet('About your plan');

  buildPlanTab_(ss, plan);
  buildAboutTab_(ss, about);

  DriveApp.getFileById(ss.getId()).moveTo(trainingPlans);
  props.setProperty('ATHLETE_TEMPLATE_ID', ss.getId());
  SpreadsheetApp.flush();
  Logger.log('Athlete plan template created in "' + trainingPlans.getName() + '": ' + ss.getUrl());
  Logger.log('ATHLETE_TEMPLATE_ID saved in this project\'s Script Properties.');
}

function buildPlanTab_(ss, sheet) {
  var cols = 12; // A..L
  sheet.setHiddenGridlines(true);
  ensureSize_(sheet, 17 + AP_WEEK_ROWS, cols);

  sheet.getRange('A1').setValue('Training plan').setFontSize(20).setFontWeight('bold').setFontColor(AP_RED);
  var header = [['Athlete', ''], ['Race', ''], ['Race date', ''], ['Target time', ''], ['Last updated', '']];
  sheet.getRange(2, 1, header.length, 2).setValues(header);
  sheet.getRange(2, 1, header.length, 1).setFontWeight('bold').setFontColor(AP_GREY);
  sheet.getRange(2, 2, header.length, 1).setFontWeight('bold');
  for (var hr = 2; hr <= 6; hr++) sheet.getRange(hr, 2, 1, 5).merge().setHorizontalAlignment('left').setNumberFormat('@');
  ['AP_ATHLETE', 'AP_RACE', 'AP_RACE_DATE', 'AP_TARGET', 'AP_UPDATED'].forEach(function (name, i) {
    ss.setNamedRange(name, sheet.getRange(2 + i, 2));
  });
  sheet.getRange('B2').setFontSize(14);

  // Paces: Zone (A) | Pace (B:D merged) | Effort (E:J merged), so long text fits without
  // changing the week table's column widths
  sheet.getRange(8, 1).setValue('Your paces');
  sheet.getRange(8, 2, 1, 3).merge().setValue('Pace');
  sheet.getRange(8, 5, 1, 6).merge().setValue('Effort');
  sheet.getRange(8, 1, 1, 10).setFontWeight('bold').setBackground(AP_NAVY).setFontColor('#ffffff');
  sheet.getRange(9, 1, 4, 1).setValues([['Easy'], ['Steady'], ['Tempo'], ['Interval']]).setFontWeight('bold');
  for (var pr = 9; pr <= 12; pr++) {
    sheet.getRange(pr, 2, 1, 3).merge();
    sheet.getRange(pr, 5, 1, 6).merge();
  }
  sheet.getRange(9, 1, 4, 10).setNumberFormat('@').setWrap(true).setVerticalAlignment('top');
  sheet.getRange(8, 1, 5, 10).setBorder(true, true, true, true, true, true, AP_LINE, SpreadsheetApp.BorderStyle.SOLID);
  ss.setNamedRange('AP_PACE_ZONE', sheet.getRange(9, 1, 4, 1));
  ss.setNamedRange('AP_PACE', sheet.getRange(9, 2, 4, 1));
  ss.setNamedRange('AP_EFFORT', sheet.getRange(9, 5, 4, 1));

  // Note (warm-up and how to use the paces)
  var note = sheet.getRange(14, 1, 1, cols).merge();
  note.setWrap(true).setFontStyle('italic').setFontColor(AP_GREY).setVerticalAlignment('top').setNumberFormat('@');
  sheet.setRowHeight(14, 48);
  ss.setNamedRange('AP_NOTE', sheet.getRange(14, 1));

  // Week table
  var headings = ['Week', 'Starts', 'Phase', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Weekly total', 'Note'];
  sheet.getRange(16, 1, 1, cols).setValues([headings])
    .setFontWeight('bold').setBackground(AP_NAVY).setFontColor('#ffffff').setHorizontalAlignment('center');
  var weeks = sheet.getRange(17, 1, AP_WEEK_ROWS, cols);
  weeks.setNumberFormat('@').setWrap(true).setVerticalAlignment('top').setFontSize(9);
  weeks.setBorder(true, true, true, true, true, true, AP_LINE, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(17, 1, AP_WEEK_ROWS, 1).setHorizontalAlignment('center').setFontWeight('bold');
  ss.setNamedRange('AP_WEEKS', weeks);

  var widths = [44, 70, 70, 112, 112, 112, 112, 112, 112, 112, 80, 220];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setColumnWidth(1, 90); // fits the header labels too
  sheet.setFrozenRows(16);
}

function buildAboutTab_(ss, sheet) {
  sheet.setHiddenGridlines(true);
  ensureSize_(sheet, 2 + AP_SUMMARY_SECTIONS.length, 2);
  sheet.getRange('A1').setValue('About your plan').setFontSize(20).setFontWeight('bold').setFontColor(AP_RED);
  var rows = sheet.getRange(3, 1, AP_SUMMARY_SECTIONS.length, 2);
  rows.setValues(AP_SUMMARY_SECTIONS.map(function (s) { return [s, '']; })).setNumberFormat('@');
  rows.setWrap(true).setVerticalAlignment('top');
  sheet.getRange(3, 1, AP_SUMMARY_SECTIONS.length, 1).setFontWeight('bold').setFontColor(AP_NAVY);
  rows.setBorder(true, false, true, false, false, true, AP_LINE, SpreadsheetApp.BorderStyle.SOLID);
  ss.setNamedRange('AP_SUMMARY', rows);
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 640);
}

/** Make sure the sheet has at least rows x cols cells, and no more columns than needed. */
function ensureSize_(sheet, rows, cols) {
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() < cols) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());
  if (sheet.getMaxColumns() > cols) sheet.deleteColumns(cols + 1, sheet.getMaxColumns() - cols);
}
