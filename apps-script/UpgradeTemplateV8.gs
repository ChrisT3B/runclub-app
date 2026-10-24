/**
 * UpgradeTemplateV8.gs - one-off: upgrades the plan sheet template from v7 to v8
 * (SPEC-PlanProposal-Brief-v3.md, section 2). Run once, then delete this file from the project.
 *
 * HOW TO RUN (signed in as runalcester@gmail.com)
 * 1. Open the Plan Intake project at script.google.com (it already has TEMPLATE_ID and permissions).
 * 2. + > Script, name it UpgradeTemplateV8, paste this whole file, Save.
 * 3. Choose `upgradeTemplateToV8` in the function drop-down and click Run.
 * 4. Check the Execution log, then open the template and look at the Brief and Plan tabs.
 * 5. Delete the UpgradeTemplateV8 file from the project. No redeploy is needed: the live web app
 *    is unaffected because this file was never part of a deployment.
 *
 * WHAT IT DOES
 * - Makes a backup copy of the template ("... (backup before v8)") next to it, before any change.
 * - Rebuilds the Brief tab: a section table (Section | Who decides | Coach's text | What to write)
 *   with drop-downs, and a plan settings block (First week starts, Primary metric, Load strategy,
 *   Down-week cut). The current Plan tab settings are carried over as the starting values.
 * - Plan tab: F4 to F7 become formulas that read the Brief settings. W9 gets "Rationale (AI, private)".
 * - ReadMe: "Template v7" becomes "Template v8" and the Brief line is updated.
 * - Renames the file from ...V7 to ...V8 if the name contains v7. TEMPLATE_ID does not change.
 * Refuses to run if the Brief tab is already in the v8 layout. Touches no other tab.
 */

var V8_SECTIONS = [
  ['Key insight and main risk', ['Coach specifies', 'AI chooses'], 'AI chooses',
    'The one thing that should shape this plan, and the main risk, in training terms.'],
  ['Reality check on the goal', ['Coach specifies', 'AI chooses'], 'AI chooses',
    'Achievable, aggressive or needs discussion, and why.'],
  ['Phase structure', ['Coach specifies', 'AI chooses'], 'AI chooses',
    'Phases and their weeks, for example "Base 1-4, Build 5-9, Peak 10-11, Taper 12-13". If the AI chooses: 7-day weeks, Base, Build, Peak, Taper, Race, using the load strategy below.'],
  ['How to apply the paces', ['Coach specifies', 'AI chooses'], 'AI chooses',
    'For example "baseline was hilly, treat paces as conservative". If the AI chooses: Paces tab as calculated, starting at the slow end of each range.'],
  ['Training adjustments from health', ['Coach specifies', 'None'], 'None',
    'TRAINING TERMS ONLY. No conditions, body parts or diagnoses. For example "no speed work weeks 1-3", "strength twice a week", "long run up by no more than 10 percent a week".'],
  ['Firm rules', ['Coach specifies', 'None'], 'None',
    'Hard limits, for example "max 4 runs a week", "no hills for 4 weeks".'],
  ['Questions for the AI', ['Coach specifies', 'None'], 'None',
    'Things you are unsure about and want the AI\'s view on. One per line.']
];

var V8_FIRST_SECTION_ROW = 5;
var V8_SETTINGS_HEADER_ROW = 13;

function upgradeTemplateToV8() {
  var templateId = PropertiesService.getScriptProperties().getProperty('TEMPLATE_ID');
  if (!templateId) throw new Error('No TEMPLATE_ID Script Property. Run this in the Plan Intake project.');

  var file = DriveApp.getFileById(templateId);
  var ss = SpreadsheetApp.openById(templateId);
  var brief = ss.getSheetByName('Brief');
  var plan = ss.getSheetByName('Plan');
  var lists = ss.getSheetByName('Lists');
  var readme = ss.getSheetByName('ReadMe');
  if (!brief || !plan || !lists) throw new Error('The template is missing a Brief, Plan or Lists tab. Nothing changed.');
  if (String(brief.getRange('A4').getValue()).trim() === 'Section') {
    throw new Error('The Brief tab is already in the v8 layout. Nothing changed.');
  }

  // Check everything that could fail before touching anything
  var rules = { metric: listFromLists_(lists, 'Primary metric'), load: listFromLists_(lists, 'Load strategy') };

  // Backup first, so nothing below can lose the v7 version
  var backup = file.makeCopy(file.getName() + ' (backup before v8)');

  var current = {
    metric: plan.getRange('F4').getValue(),
    load: plan.getRange('F5').getValue(),
    cut: plan.getRange('F6').getValue(),
    start: plan.getRange('F7').getValue()
  };

  rebuildBrief_(brief, rules, current);
  linkPlanSettings_(plan);
  if (String(plan.getRange('W9').getValue()).trim() === '') {
    plan.getRange('W9').setValue('Rationale (AI, private)').setFontWeight('bold');
  }
  plan.setColumnWidth(23, 320);
  plan.getRange('W10:W33').setWrap(true);
  if (readme) updateReadMe_(readme);

  var oldName = file.getName();
  if (/v7/i.test(oldName)) file.setName(oldName.replace(/v7/i, 'V8'));
  SpreadsheetApp.flush();

  Logger.log('Template upgraded to v8: ' + file.getName());
  Logger.log('Backup of v7: ' + backup.getName() + ' (' + backup.getUrl() + ')');
}

function rebuildBrief_(brief, rules, current) {
  var maxRows = Math.max(brief.getMaxRows(), 30);
  var maxCols = Math.max(brief.getMaxColumns(), 4);
  var all = brief.getRange(1, 1, maxRows, maxCols);
  all.breakApart();
  all.clearDataValidations();
  brief.clear();

  brief.getRange('A1').setValue('Plan brief').setFontWeight('bold').setFontSize(14);
  // A2 is left empty: Plan Intake writes the "Build AI prompt for this athlete" link here
  brief.getRange('A3').setValue('Write this after reading the Athlete tab. For each section choose who decides. ' +
    'If you choose Coach specifies, write in column C. Do not edit column A: the prompt tool finds sections by this text.')
    .setFontStyle('italic').setFontColor('#4b5563');

  var header = brief.getRange(4, 1, 1, 4);
  header.setValues([['Section', 'Who decides', "Coach's text", 'What to write']]);
  header.setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');

  V8_SECTIONS.forEach(function (s, i) {
    var row = V8_FIRST_SECTION_ROW + i;
    brief.getRange(row, 1).setValue(s[0]).setFontWeight('bold');
    var who = brief.getRange(row, 2);
    who.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(s[1], true).setAllowInvalid(false).build());
    who.setValue(s[2]);
    brief.getRange(row, 3).setNumberFormat('@');
    brief.getRange(row, 4).setValue(s[3]).setFontColor('#6b7280');
  });

  var lastSectionRow = V8_FIRST_SECTION_ROW + V8_SECTIONS.length - 1;
  var table = brief.getRange(V8_FIRST_SECTION_ROW, 1, V8_SECTIONS.length, 4);
  table.setWrap(true).setVerticalAlignment('top');
  table.setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
  brief.getRange(V8_FIRST_SECTION_ROW, 2, V8_SECTIONS.length, 2).setBackground('#fff9c4').setFontColor('#1d4ed8');

  // Plan settings block
  var h = V8_SETTINGS_HEADER_ROW;
  var settingsHeader = brief.getRange(h, 1, 1, 3);
  settingsHeader.setValues([['Setting', 'Value', 'Notes']]);
  settingsHeader.setFontWeight('bold').setBackground('#1f2a44').setFontColor('#ffffff');
  brief.getRange(h + 1, 1, 4, 3).setValues([
    ['First week starts', current.start === '' ? '' : current.start, 'Must be a Monday. The Plan tab and the AI both start here.'],
    ['Primary metric', current.metric || 'Distance', 'Distance, pace or time. The Plan tab totals follow this.'],
    ['Load strategy', current.load || '3:1 step', 'The up and down week pattern the AI must follow.'],
    ['Down-week cut', current.cut === '' ? 0.25 : current.cut, 'How much a down week drops, for example 0.25 = 25 percent.']
  ]);
  brief.getRange(h + 1, 1, 4, 1).setFontWeight('bold');
  brief.getRange(h + 1, 3, 4, 1).setFontColor('#6b7280').setWrap(true);
  brief.getRange(h + 1, 2, 4, 1).setBackground('#fff9c4').setFontColor('#1d4ed8');
  brief.getRange(h, 1, 5, 3).setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);

  brief.getRange(h + 1, 2).setNumberFormat('ddd d mmm yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  brief.getRange(h + 2, 2).setDataValidation(rules.metric);
  brief.getRange(h + 3, 2).setDataValidation(rules.load);
  brief.getRange(h + 4, 2).setNumberFormat('0.00')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(0, 0.5).setAllowInvalid(false).build());

  brief.setColumnWidth(1, 240);
  brief.setColumnWidth(2, 150);
  brief.setColumnWidth(3, 420);
  brief.setColumnWidth(4, 360);
  brief.setFrozenRows(4);
  Logger.log('Brief tab rebuilt: sections in rows ' + V8_FIRST_SECTION_ROW + '-' + lastSectionRow + ', settings in rows ' + (h + 1) + '-' + (h + 4) + '.');
}

/** A drop-down rule that points at a Lists column, found by its header text. */
function listFromLists_(lists, headerText) {
  var values = lists.getDataRange().getValues();
  for (var r = 0; r < values.length; r++) {
    var c = values[r].indexOf(headerText);
    if (c === -1) continue;
    var last = r + 1;
    while (last < values.length && String(values[last][c]).trim() !== '') last++;
    var range = lists.getRange(r + 2, c + 1, Math.max(last - r - 1, 1), 1);
    return SpreadsheetApp.newDataValidation().requireValueInRange(range, true).setAllowInvalid(false).build();
  }
  throw new Error('The Lists tab has no "' + headerText + '" column. Nothing changed.');
}

/** Plan F4:F7 read the Brief settings. Blank stays blank, so the Plan formulas that test for "" still work. */
function linkPlanSettings_(plan) {
  var cells = [['F4', 'B15'], ['F5', 'B16'], ['F6', 'B17'], ['F7', 'B14']];
  cells.forEach(function (pair) {
    var cell = plan.getRange(pair[0]);
    cell.clearDataValidations();
    cell.setFormula('=IF(Brief!' + pair[1] + '="","",Brief!' + pair[1] + ')');
    cell.setFontColor('#000000').setBackground(null);
    cell.setNote('Set on the Brief tab (plan settings). Do not type here.');
  });
  plan.getRange('F7').setNumberFormat('ddd d mmm yyyy');
}

function updateReadMe_(readme) {
  var values = readme.getRange(1, 1, readme.getLastRow(), 1).getValues();
  for (var r = 0; r < values.length; r++) {
    var text = String(values[r][0]);
    if (/Template v7/.test(text)) readme.getRange(r + 1, 1).setValue(text.replace('Template v7', 'Template v8'));
    if (/^Brief:/.test(text)) {
      readme.getRange(r + 1, 1).setValue('Brief: the coach\'s direction for the AI prompt (who decides each section) and the plan settings. The Plan tab takes its start date, primary metric, load strategy and down-week cut from here.');
    }
  }
}
