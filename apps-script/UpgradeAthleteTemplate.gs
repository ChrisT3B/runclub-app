/**
 * UpgradeAthleteTemplate.gs - one-off: widens the header and paces area of the athlete plan
 * template with merged cells, so long paces and effort text show in full without changing the
 * week table's column widths.
 *
 * HOW TO RUN (signed in as runalcester@gmail.com)
 * 1. Open the Plan Proposal project. + > Script, name it UpgradeAthleteTemplate, paste this file, Save.
 * 2. Choose `upgradeAthleteTemplate` and click Run. Check the Execution log.
 * 3. Delete the UpgradeAthleteTemplate file. No redeploy is needed.
 * 4. Plans already published keep their old layout. To rebuild one from the new template, move its
 *    published sheet (not the PDF) to the bin and Publish again: Publish then makes a fresh copy.
 *
 * WHAT IT DOES (on the "Your plan" tab of ATHLETE_TEMPLATE_ID)
 * - Header values: B:F merged on each of rows 2 to 6.
 * - Paces: row 8 headings and rows 9 to 12 become Zone (A) | Pace (B:D merged) | Effort (E:J merged).
 * - Named ranges: AP_PACES is replaced by AP_PACE_ZONE (A9:A12), AP_PACE (B9:B12), AP_EFFORT (E9:E12).
 * Refuses to run if AP_PACE already exists. Nothing else changes; the week table is untouched.
 */

function upgradeAthleteTemplate() {
  var id = PropertiesService.getScriptProperties().getProperty('ATHLETE_TEMPLATE_ID');
  if (!id) throw new Error('ATHLETE_TEMPLATE_ID is not set. Run this in the Plan Proposal project.');
  var ss = SpreadsheetApp.openById(id);
  if (ss.getRangeByName('AP_PACE')) throw new Error('The template already has the wider paces layout. Nothing changed.');
  var old = ss.getRangeByName('AP_PACES');
  if (!old) throw new Error('The template has no AP_PACES named range. Nothing changed.');

  var sheet = old.getSheet();
  var top = old.getRow();      // 9 in the built template
  var rows = old.getNumRows(); // 4
  var zones = old.getValues().map(function (r) { return [r[0]]; });

  widenHeaderAndPaces_(sheet, top, rows, zones);

  ss.removeNamedRange('AP_PACES');
  ss.setNamedRange('AP_PACE_ZONE', sheet.getRange(top, 1, rows, 1));
  ss.setNamedRange('AP_PACE', sheet.getRange(top, 2, rows, 1));
  ss.setNamedRange('AP_EFFORT', sheet.getRange(top, 5, rows, 1));
  SpreadsheetApp.flush();
  Logger.log('Athlete plan template updated: header B:F merged, paces Pace B:D and Effort E:J merged.');
}

/** Shared with BuildAthleteTemplate: header values B:F, paces Zone | Pace (B:D) | Effort (E:J). */
function widenHeaderAndPaces_(sheet, top, rows, zones) {
  var navy = '#1f2a44';
  var line = '#d1d5db';

  for (var r = 2; r <= 6; r++) {
    sheet.getRange(r, 2, 1, 5).breakApart().merge().setHorizontalAlignment('left').setNumberFormat('@');
  }

  var area = sheet.getRange(top - 1, 1, rows + 1, 10);
  area.breakApart();
  area.clearContent();
  area.setBorder(false, false, false, false, false, false);

  sheet.getRange(top - 1, 1).setValue('Your paces');
  sheet.getRange(top - 1, 2, 1, 3).merge().setValue('Pace');
  sheet.getRange(top - 1, 5, 1, 6).merge().setValue('Effort');
  sheet.getRange(top - 1, 1, 1, 10).setFontWeight('bold').setBackground(navy).setFontColor('#ffffff');

  sheet.getRange(top, 1, rows, 1).setValues(zones).setFontWeight('bold');
  for (var i = 0; i < rows; i++) {
    sheet.getRange(top + i, 2, 1, 3).merge();
    sheet.getRange(top + i, 5, 1, 6).merge();
  }
  var body = sheet.getRange(top, 1, rows, 10);
  body.setNumberFormat('@').setWrap(true).setVerticalAlignment('top').setBackground(null).setFontColor('#000000');
  sheet.getRange(top, 1, rows, 1).setFontWeight('bold');
  sheet.getRange(top - 1, 1, rows + 1, 10)
    .setBorder(true, true, true, true, true, true, line, SpreadsheetApp.BorderStyle.SOLID);
}
