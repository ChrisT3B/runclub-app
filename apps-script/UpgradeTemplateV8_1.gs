/**
 * UpgradeTemplateV8_1.gs - one-off patch on top of v8: a warm-up and cool-down setting.
 * Run once in the Plan Intake project, then delete this file. Needs the v8 upgrade to have run.
 *
 * HOW TO RUN (signed in as runalcester@gmail.com)
 * 1. Open the Plan Intake project. Delete the old UpgradeTemplateV8 file if it is still there.
 * 2. + > Script, name it UpgradeTemplateV8_1, paste this whole file, Save.
 * 3. Choose `upgradeTemplateToV8_1` and click Run. Check the Execution log.
 * 4. Delete the UpgradeTemplateV8_1 file. No redeploy is needed.
 *
 * WHAT IT DOES
 * - Backup copy of the template first ("... (backup before v8.1)").
 * - Brief: new plan setting in row 18, "Warm-up and cool-down (minutes each)", default 10.
 * - Paces!B11 (warm-up plus cool-down km per quality session, both blocks together) becomes a formula:
 *   the Brief minutes, twice (before and after), converted to km at Easy pace. It was a typed 3 km.
 * - Plan O10:O33: when the primary metric is Time, the weekly total now adds the warm-up and
 *   cool-down minutes for each Tempo and Interval day. Distance totals already add Paces!B11.
 * - Athlete view B10: the general note says how long the warm-up and cool-down are.
 * - ReadMe: v8.1, and the session-format line explains where warm-ups are set.
 * Refuses to run before v8, or if v8.1 is already applied. Touches nothing else.
 */

var WARMUP_ROW = 18;
var WARMUP_LABEL = 'Warm-up and cool-down (minutes each)';

function upgradeTemplateToV8_1() {
  var templateId = PropertiesService.getScriptProperties().getProperty('TEMPLATE_ID');
  if (!templateId) throw new Error('No TEMPLATE_ID Script Property. Run this in the Plan Intake project.');

  var file = DriveApp.getFileById(templateId);
  var ss = SpreadsheetApp.openById(templateId);
  var brief = ss.getSheetByName('Brief');
  var paces = ss.getSheetByName('Paces');
  var plan = ss.getSheetByName('Plan');
  var view = ss.getSheetByName('Athlete view');
  var readme = ss.getSheetByName('ReadMe');
  if (!brief || !paces || !plan || !view) throw new Error('The template is missing a Brief, Paces, Plan or Athlete view tab. Nothing changed.');
  if (String(brief.getRange('A4').getValue()).trim() !== 'Section') throw new Error('Run the v8 upgrade first. Nothing changed.');
  if (String(brief.getRange(WARMUP_ROW, 1).getValue()).trim() === WARMUP_LABEL) throw new Error('v8.1 is already applied. Nothing changed.');
  if (String(brief.getRange(WARMUP_ROW, 1).getValue()).trim() !== '') throw new Error('Brief!A' + WARMUP_ROW + ' is not empty. Nothing changed.');

  // Check the Plan totals look as expected before changing anything
  var totals = plan.getRange('O10:O33').getFormulas();
  totals.forEach(function (row, i) {
    var r = 10 + i;
    if (row[0].indexOf('IF($F$4="Time",SUM(AH' + r + ':AQ' + r + '),') === -1) {
      throw new Error('Plan!O' + r + ' is not the expected weekly total formula. Nothing changed.');
    }
  });

  var backup = file.makeCopy(file.getName() + ' (backup before v8.1)');

  // Brief: the new setting, styled like rows 14 to 17
  var cell = brief.getRange(WARMUP_ROW, 1, 1, 3);
  cell.setValues([[WARMUP_LABEL, 10, 'Easy running before and after every Tempo and Interval day. Not written in the session; the sheet adds it to the weekly total and the Athlete view note.']]);
  brief.getRange(WARMUP_ROW, 1).setFontWeight('bold');
  brief.getRange(WARMUP_ROW, 2).setBackground('#fff9c4').setFontColor('#1d4ed8').setNumberFormat('0')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0, 30).setAllowInvalid(false).build());
  brief.getRange(WARMUP_ROW, 3).setFontColor('#6b7280').setWrap(true);
  brief.getRange(13, 1, WARMUP_ROW - 12, 3).setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);

  // Paces!B11: km for warm-up plus cool-down, from the Brief minutes at Easy pace
  paces.getRange('A11').setValue('Warm-up plus cool-down together per quality session (km, from the Brief setting)');
  paces.getRange('B11').setFormula('=IF(N(Brief!B' + WARMUP_ROW + ')=0,0,IFERROR(ROUND(2*Brief!B' + WARMUP_ROW + '*60/(AVERAGE($H$30:$I$30)*86400),1),0))')
    .setFontColor('#000000').setBackground(null);
  paces.getRange('C11').setValue('Calculated: both blocks added together, at Easy pace. For example 10 min each at 6:00 /km = 1.7 km + 1.7 km = 3.3 km. Counts toward weekly distance totals only. 0 until the paces are calculated.');

  // Plan O10:O33: add warm-up and cool-down minutes to Time totals
  var updated = totals.map(function (row, i) {
    var r = 10 + i;
    return [row[0].replace('IF($F$4="Time",SUM(AH' + r + ':AQ' + r + '),',
      'IF($F$4="Time",SUM(AH' + r + ':AQ' + r + ')+SUM(BL' + r + ':BU' + r + ')*2*N(Brief!$B$' + WARMUP_ROW + '),')];
  });
  plan.getRange('O10:O33').setFormulas(updated);

  // Athlete view: the general note names the warm-up length
  view.getRange('B10').setFormula('="Long runs use Easy pace. Race pace is your goal pace. "&IF(N(Brief!B' + WARMUP_ROW + ')>0,' +
    '"Tempo and Interval days start with "&Brief!B' + WARMUP_ROW + '&" min easy running and finish with "&Brief!B' + WARMUP_ROW + '&" min easy running. These are not shown in the session but are included in the weekly total. ",' +
    '"")&"Paces are guides: if a day feels harder than the effort described, go by effort and ease off."');

  if (readme) {
    var values = readme.getRange(1, 1, readme.getLastRow(), 1).getValues();
    values.forEach(function (v, i) {
      var text = String(v[0]);
      if (/Template v8\b/.test(text) && !/v8\.1/.test(text)) readme.getRange(i + 1, 1).setValue(text.replace('Template v8', 'Template v8.1'));
      if (/^Use a lower case x\./.test(text)) {
        readme.getRange(i + 1, 1).setValue(text.replace('Keep notes (warm-up, cool-down, recoveries) in the Coach notes column, not in the day cell.',
          'Tempo and Interval cells hold the main block only: the warm-up and cool-down length is a plan setting on the Brief tab. Keep other notes (recoveries) in the Coach notes column, not in the day cell.'));
      }
    });
  }

  SpreadsheetApp.flush();
  Logger.log('Template patched to v8.1: warm-up and cool-down setting in Brief!B' + WARMUP_ROW + ' (default 10 min).');
  Logger.log('Backup: ' + backup.getName() + ' (' + backup.getUrl() + ')');
}
