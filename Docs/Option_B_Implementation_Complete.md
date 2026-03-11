# Option B: Two-Way Sync - Supabase ↔ Google Sheets

## Overview

Implement a two-way sync system where:
1. Form submissions go to Supabase (secure, no client-side token)
2. Google Apps Script syncs applications from Supabase → Google Sheets
3. Admin works in Google Sheets (flexible, familiar UX)
4. Apps Script syncs status updates back: Google Sheets → Supabase
5. Members see their application status in the app

---

## Architecture

```
┌─────────────┐
│ Member Form │
└──────┬──────┘
       │ (submit)
       ↓
┌─────────────────┐
│    Supabase     │ ← Source of Truth
│    Database     │
└────────┬────────┘
         │
         │ ← Google Apps Script (scheduled sync)
         ↓
┌─────────────────┐
│  Google Sheets  │ ← Admin Processing
│  (with extra    │
│  admin columns) │
└────────┬────────┘
         │
         │ ← Apps Script watches for changes
         ↓
┌─────────────────┐
│    Supabase     │ ← Updates member profiles
│  (status sync)  │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│  Member Sees    │
│  Status in App  │
└─────────────────┘
```

---

## Benefits

✅ **Security:** No client-side tokens exposed
✅ **Reliability:** Database validation, RLS, duplicate detection
✅ **UX:** Admins work in familiar spreadsheet
✅ **Flexibility:** Admins can add columns without breaking sync
✅ **Transparency:** Members see their application status
✅ **Automation:** Status updates flow both directions

---

## PHASE 1: Update Frontend (Form → Supabase Only)

### Step 1: Remove Google Sheets Submission

**File:** `src/modules/membership/components/AffiliatedMemberApplicationForm.tsx`

**Remove:**
```typescript
import { GoogleSheetsService } from '../services/googleSheetsService';
```

**Restore:**
```typescript
import { AffiliatedMemberService } from '../services/affiliatedMemberService';
```

**In `handleSubmit`, replace Google Sheets code with:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  try {
    setIsSubmitting(true);
    setError('');
    
    // Prepare data for Supabase submission
    const submissionData: ApplicationFormData = {
      title: formData.title,
      date_of_birth: formData.date_of_birth,
      sex_at_birth: formData.sex_at_birth,
      address_postcode: formData.address_postcode,
      nationality: formData.nationality,
      membership_type: formData.membership_type,
      ea_urn_at_application: formData.ea_urn_at_application,
      previous_club_name: formData.previous_club_name,
      has_health_conditions: formData.has_health_conditions,
      health_conditions_details: formData.health_conditions_details,
      emergency_contact_name: formData.emergency_contact_name,
      emergency_contact_relationship: formData.emergency_contact_relationship,
      emergency_contact_number: formData.emergency_contact_number,
      additional_info: formData.additional_info,
      payment_reference: formData.payment_reference,
      payment_method: 'bank_transfer',
      declaration_amateur: formData.declaration_amateur,
      declaration_own_risk: formData.declaration_own_risk,
      declaration_data_privacy: formData.declaration_data_privacy,
      declaration_policies: formData.declaration_policies,
      payment_sent_confirmed: formData.payment_sent_confirmed,
      payment_reference_confirmed: formData.payment_reference_confirmed,
    };
    
    // Submit to Supabase
    await AffiliatedMemberService.submitApplication(submissionData);
    
    // Show success message
    setSuccess(
      'Application Submitted Successfully!\n\n' +
      'Thank you for your EA membership application. ' +
      'You can view your application status in your dashboard.\n\n' +
      'Your payment reference: ' + formData.payment_reference
    );
    
    // Reload to show submitted application
    await loadInitialData();
    
  } catch (error) {
    console.error('Submission failed:', error);
    setError(
      error instanceof Error 
        ? error.message 
        : 'Failed to submit application. Please try again.'
    );
  } finally {
    setIsSubmitting(false);
  }
};
```

### Step 2: Restore Application Status Display

**In the same file, restore the existing application check:**

Make sure `loadInitialData()` includes:

```typescript
// Check for existing application
const existingApp = await AffiliatedMemberService.getMemberApplication(member.id, year);
setExistingApplication(existingApp);
```

And the JSX shows existing application status if it exists (this should already be in the code from before).

### Step 3: Remove Google Sheets Service (Optional)

You can delete or keep `src/modules/membership/services/googleSheetsService.ts` - it's no longer used.

### Step 4: Remove Environment Variables

From `.env.local`, remove:
```
VITE_GOOGLE_SHEETS_URL=...
VITE_GOOGLE_SHEETS_TOKEN=...
```

These are no longer needed in the frontend.

### Step 5: Test Frontend Submission

1. Start dev server: `npm run dev`
2. Navigate to Club Membership page
3. Fill out application form
4. Submit
5. **Expected:** 
   - Submission succeeds
   - Data goes to Supabase `affiliated_member_applications` table
   - Success message shows
   - Application status displays

---

## PHASE 2: Update Google Sheet Structure

### Step 1: Add New Columns to Existing Sheet

Open "Run Alcester Adult Membership 2026 – 2027 (Responses)"

**Add these columns AFTER column Z (Payment Reference):**

| Column | Header | Type | Notes |
|--------|--------|------|-------|
| AA | Application ID | Text | Supabase UUID (hidden, locked) |
| AB | Last Synced | Timestamp | Tracking (hidden) |
| AC | Sync Status | Text | Optional tracking |

**Then admins can add columns AD onwards for their own notes**

### Step 2: Format New Columns

**Column AA (Application ID):**
- Width: 300px
- Font: Monospace
- Background: Light gray (to indicate system column)

**Column AB (Last Synced):**
- Width: 150px
- Format: Date time

**Column AC (Sync Status):**
- Width: 100px
- Optional values: "Synced", "Error", "Pending"

### Step 3: Hide System Columns

1. Select columns AA and AB
2. Right-click → Hide columns

These are for sync only - admins don't need to see them.

### Step 4: Protect System Columns

1. Select columns AA-AB
2. Right-click → Protect range
3. Description: "System sync columns - do not edit"
4. Set permissions: Only you
5. Done

---

## PHASE 3: Create Google Apps Script (Supabase Sync)

### Step 1: Open Apps Script

1. In your Google Sheet: Extensions → Apps Script
2. You'll see your existing `doPost()` function - we'll replace/update it

### Step 2: Setup Supabase Credentials

Add this function (run once to setup):

```javascript
/**
 * ONE-TIME SETUP: Store Supabase credentials securely
 * Run this once, then can delete this function
 */
function setupSupabaseCredentials() {
  const ui = SpreadsheetApp.getUi();
  
  // Get Supabase URL
  const urlResult = ui.prompt(
    'Supabase Configuration',
    'Enter your Supabase URL (e.g., https://xxx.supabase.co):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (urlResult.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  // Get Service Role Key
  const keyResult = ui.prompt(
    'Supabase Service Role Key',
    'Enter your Supabase SERVICE ROLE KEY (not anon key):\n\nWARNING: This has full database access - keep it secret!',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (keyResult.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  // Store securely in Script Properties
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('SUPABASE_URL', urlResult.getResponseText().trim());
  scriptProperties.setProperty('SUPABASE_SERVICE_KEY', keyResult.getResponseText().trim());
  
  ui.alert('Success', 'Supabase credentials saved securely.', ui.ButtonSet.OK);
}
```

**Run this function:**
1. Select `setupSupabaseCredentials` from dropdown
2. Click Run
3. Authorize permissions
4. Enter your Supabase URL when prompted
5. Enter your Service Role Key when prompted
   - Find this: Supabase Dashboard → Project Settings → API → service_role key
   - ⚠️ NOT the anon key!

### Step 3: Main Sync Configuration

Replace/add this at the top of your script:

```javascript
// ============================================================================
// EA APPLICATIONS - TWO-WAY SYNC (Supabase ↔ Google Sheets)
// ============================================================================

// CONFIGURATION
const SHEET_NAME = "Form responses 1";

// Column mapping (0-indexed)
const COLUMNS = {
  MEMBERSHIP_CHECKED: 0,   // A
  PAID_TO_RA: 1,           // B
  PAID_TO_EA: 2,           // C
  TIMESTAMP: 3,            // D
  EMAIL: 4,                // E
  TITLE: 5,                // F
  FULL_NAME: 6,            // G
  DATE_OF_BIRTH: 7,        // H
  SEX_AT_BIRTH: 8,         // I
  ADDRESS: 9,              // J
  EMAIL_DUP: 10,           // K (duplicate)
  TELEPHONE: 11,           // L
  NATIONALITY: 12,         // M
  MEMBERSHIP_TYPE: 13,     // N
  EA_URN: 14,              // O
  PREVIOUSLY_REGISTERED: 15, // P
  PREVIOUS_CLUB: 16,       // Q
  HEALTH_CONDITIONS: 17,   // R
  HEALTH_DETAILS: 18,      // S
  EMERGENCY_NAME: 19,      // T
  EMERGENCY_RELATIONSHIP: 20, // U
  EMERGENCY_NUMBER: 21,    // V
  ADDITIONAL_INFO: 22,     // W
  PAYMENT_SENT: 23,        // X
  DECLARATIONS: 24,        // Y
  PAYMENT_REFERENCE: 25,   // Z
  APPLICATION_ID: 26,      // AA (Supabase UUID)
  LAST_SYNCED: 27,         // AB
  SYNC_STATUS: 28          // AC
};

/**
 * Get Supabase credentials from Script Properties
 */
function getSupabaseConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    url: props.getProperty('SUPABASE_URL'),
    key: props.getProperty('SUPABASE_SERVICE_KEY')
  };
}
```

### Step 4: Supabase → Google Sheets Sync

```javascript
/**
 * SYNC PART 1: Pull new applications from Supabase → Write to Google Sheets
 * Run this on a schedule (hourly or daily)
 */
function syncFromSupabase() {
  try {
    Logger.log('Starting Supabase → Sheets sync...');
    
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
      throw new Error('Supabase credentials not configured. Run setupSupabaseCredentials()');
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet not found: ${SHEET_NAME}`);
    }
    
    // Get existing application IDs from sheet (to avoid duplicates)
    const existingIds = getExistingApplicationIds(sheet);
    Logger.log(`Found ${existingIds.size} existing applications in sheet`);
    
    // Fetch applications from Supabase
    const applications = fetchApplicationsFromSupabase(config);
    Logger.log(`Fetched ${applications.length} applications from Supabase`);
    
    // Add new applications to sheet
    let newCount = 0;
    applications.forEach(app => {
      if (!existingIds.has(app.id)) {
        addApplicationToSheet(sheet, app);
        newCount++;
      }
    });
    
    Logger.log(`✅ Sync complete: ${newCount} new applications added`);
    
    // Return summary
    return {
      success: true,
      total: applications.length,
      added: newCount,
      skipped: applications.length - newCount
    };
    
  } catch (error) {
    Logger.log(`❌ Sync failed: ${error.toString()}`);
    throw error;
  }
}

/**
 * Get set of existing application IDs from sheet
 */
function getExistingApplicationIds(sheet) {
  const data = sheet.getDataRange().getValues();
  const ids = new Set();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const appId = data[i][COLUMNS.APPLICATION_ID];
    if (appId) {
      ids.add(appId);
    }
  }
  
  return ids;
}

/**
 * Fetch applications from Supabase
 */
function fetchApplicationsFromSupabase(config) {
  const url = `${config.url}/rest/v1/affiliated_member_applications?select=*,member:members(full_name,email,phone)&order=created_at.desc`;
  
  const options = {
    method: 'get',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  
  if (statusCode !== 200) {
    throw new Error(`Supabase API error: ${statusCode} - ${response.getContentText()}`);
  }
  
  return JSON.parse(response.getContentText());
}

/**
 * Add application to sheet
 */
function addApplicationToSheet(sheet, app) {
  const row = [
    '', // A: Membership checked (admin fills)
    app.status === 'payment_confirmed' || app.status === 'ea_confirmed' ? 'Yes' : 'No', // B: Paid to RA
    app.status === 'ea_confirmed' ? 'Yes' : 'No', // C: Paid to EA
    new Date(app.created_at), // D: Timestamp
    app.member?.email || '', // E: Email
    app.title || '', // F: Title
    app.member?.full_name || '', // G: Full Name
    app.date_of_birth || '', // H: DOB
    app.sex_at_birth || '', // I: Sex
    app.address_postcode || '', // J: Address
    app.member?.email || '', // K: Email (dup)
    app.member?.phone || '', // L: Phone
    app.nationality || '', // M: Nationality
    app.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim', // N: Type
    app.ea_urn_at_application || app.new_ea_urn || '', // O: EA URN
    app.previous_club_name ? 'Yes' : 'No', // P: Previously registered
    app.previous_club_name || '', // Q: Previous club
    app.has_health_conditions ? 'Yes' : 'No', // R: Health conditions
    app.health_conditions_details || '', // S: Health details
    app.emergency_contact_name || '', // T: Emergency name
    app.emergency_contact_relationship || '', // U: Emergency relationship
    app.emergency_contact_number || '', // V: Emergency number
    app.additional_info || '', // W: Additional info
    app.payment_sent_confirmed ? 'Yes' : 'No', // X: Payment sent
    'Yes', // Y: Declarations (all must be true to submit)
    app.payment_reference || '', // Z: Payment reference
    app.id, // AA: Application ID (Supabase UUID)
    new Date(), // AB: Last synced
    'Synced' // AC: Sync status
  ];
  
  sheet.appendRow(row);
}
```

### Step 5: Google Sheets → Supabase Sync

```javascript
/**
 * SYNC PART 2: Watch for changes in Google Sheets → Update Supabase
 * Run this on a schedule (every 15 minutes or hourly)
 */
function syncToSupabase() {
  try {
    Logger.log('Starting Sheets → Supabase sync...');
    
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
      throw new Error('Supabase credentials not configured');
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet not found: ${SHEET_NAME}`);
    }
    
    const data = sheet.getDataRange().getValues();
    let updatedCount = 0;
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const applicationId = row[COLUMNS.APPLICATION_ID];
      
      if (!applicationId) continue; // Skip rows without app ID
      
      const paidToRA = row[COLUMNS.PAID_TO_RA];
      const paidToEA = row[COLUMNS.PAID_TO_EA];
      const eaUrn = row[COLUMNS.EA_URN];
      
      // Determine status based on checkboxes
      let newStatus = 'submitted';
      if (paidToEA === 'Yes') {
        newStatus = 'ea_confirmed';
      } else if (paidToRA === 'Yes') {
        newStatus = 'payment_confirmed';
      }
      
      // Update Supabase
      const updated = updateApplicationInSupabase(config, applicationId, {
        status: newStatus,
        new_ea_urn: eaUrn || null
      });
      
      if (updated) {
        updatedCount++;
        // Update last synced timestamp
        sheet.getRange(i + 1, COLUMNS.LAST_SYNCED + 1).setValue(new Date());
        sheet.getRange(i + 1, COLUMNS.SYNC_STATUS + 1).setValue('Synced');
      }
    }
    
    Logger.log(`✅ Sync complete: ${updatedCount} applications updated in Supabase`);
    
    return {
      success: true,
      updated: updatedCount
    };
    
  } catch (error) {
    Logger.log(`❌ Sync failed: ${error.toString()}`);
    throw error;
  }
}

/**
 * Update application status in Supabase
 */
function updateApplicationInSupabase(config, applicationId, updates) {
  const url = `${config.url}/rest/v1/affiliated_member_applications?id=eq.${applicationId}`;
  
  const payload = {
    status: updates.status,
    updated_at: new Date().toISOString()
  };
  
  // Add EA URN if provided and status is ea_confirmed
  if (updates.new_ea_urn && updates.status === 'ea_confirmed') {
    payload.new_ea_urn = updates.new_ea_urn;
    payload.ea_confirmed_at = new Date().toISOString();
  }
  
  // Add payment confirmed timestamp if newly confirmed
  if (updates.status === 'payment_confirmed') {
    payload.payment_confirmed_at = new Date().toISOString();
  }
  
  const options = {
    method: 'patch',
    headers: {
      'apikey': config.key,
      'Authorization': `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  
  if (statusCode >= 200 && statusCode < 300) {
    return true;
  } else {
    Logger.log(`Failed to update ${applicationId}: ${statusCode} - ${response.getContentText()}`);
    return false;
  }
}
```

### Step 6: Add Trigger Setup

```javascript
/**
 * Setup automatic triggers for syncing
 * Run this once to create the schedule
 */
function setupTriggers() {
  // Delete existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Supabase → Sheets: Every hour
  ScriptApp.newTrigger('syncFromSupabase')
    .timeBased()
    .everyHours(1)
    .create();
  
  // Sheets → Supabase: Every 15 minutes
  ScriptApp.newTrigger('syncToSupabase')
    .timeBased()
    .everyMinutes(15)
    .create();
  
  Logger.log('✅ Triggers created successfully');
  SpreadsheetApp.getUi().alert('Success', 'Sync triggers created:\n- Supabase → Sheets: Hourly\n- Sheets → Supabase: Every 15 min', SpreadsheetApp.getUi().ButtonSet.OK);
}
```

### Step 7: Test Functions

```javascript
/**
 * Test Supabase connection
 */
function testSupabaseConnection() {
  try {
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
      throw new Error('Credentials not configured');
    }
    
    const applications = fetchApplicationsFromSupabase(config);
    Logger.log(`✅ Connection successful! Found ${applications.length} applications`);
    SpreadsheetApp.getUi().alert('Success', `Connected to Supabase!\n\nFound ${applications.length} applications.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    Logger.log(`❌ Connection failed: ${error.toString()}`);
    SpreadsheetApp.getUi().alert('Error', `Connection failed:\n\n${error.toString()}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
```

### Step 8: Remove Old doPost Function

Since form submissions now go directly to Supabase, you can remove the old `doPost()` function and related Google Sheets submission code.

Or comment it out with a note:
```javascript
/**
 * OLD FUNCTION - No longer used
 * Form submissions now go directly to Supabase
 * Keeping this for reference only
 */
// function doPost(e) { ... }
```

---

## PHASE 4: Setup and Test Sync

### Step 1: Run Setup Functions

In Apps Script editor:

1. **Setup Supabase credentials:**
   - Select: `setupSupabaseCredentials`
   - Click: Run
   - Enter Supabase URL and Service Role Key

2. **Test connection:**
   - Select: `testSupabaseConnection`
   - Click: Run
   - Should show success message with application count

3. **Initial sync:**
   - Select: `syncFromSupabase`
   - Click: Run
   - Check Google Sheet - should see applications appear

4. **Setup automated triggers:**
   - Select: `setupTriggers`
   - Click: Run
   - Confirms triggers created

### Step 2: Verify Initial Sync

1. Check Google Sheet
2. Should see applications from Supabase
3. Column AA should have application IDs
4. Column AB should have sync timestamps
5. Columns B and C should show Yes/No based on status

### Step 3: Test Two-Way Sync

**Test Sheets → Supabase:**

1. In Google Sheet, find an application with "Paid to RA" = No
2. Change it to: Yes
3. Wait 15 minutes (or run `syncToSupabase` manually)
4. Check Supabase - status should be 'payment_confirmed'
5. Check app - member should see updated status

**Test Supabase → Sheets:**

1. Submit a new application through the app
2. Wait 1 hour (or run `syncFromSupabase` manually)
3. Check Google Sheet - new row should appear
4. Should have Application ID in column AA

---

## PHASE 5: Deploy and Monitor

### Step 1: Deploy to Vercel

On the feature branch:

```bash
# Make sure all changes committed
git add .
git commit -m "Implement Option B: Two-way Supabase <-> Google Sheets sync"
git push origin feature/ea-option-b-supabase-sync
```

In Vercel:
1. Go to your project
2. Should auto-deploy from the feature branch
3. Or manually deploy from branch dropdown

### Step 2: Update Environment Variables in Vercel

Remove from Vercel environment variables:
- `VITE_GOOGLE_SHEETS_URL`
- `VITE_GOOGLE_SHEETS_TOKEN`

These are no longer needed.

### Step 3: Test End-to-End

1. **Submit application:**
   - Open production app
   - Submit test application
   - Verify it goes to Supabase
   - See submitted status in dashboard

2. **Wait for sync:**
   - Wait 1 hour or manually run `syncFromSupabase`
   - Check Google Sheet
   - Should see new application row

3. **Admin processes:**
   - In Google Sheet, mark "Paid to RA" = Yes
   - Wait 15 minutes or run `syncToSupabase`
   - Check app dashboard
   - Member should see "Payment Confirmed" status

4. **Complete flow:**
   - In Google Sheet, enter EA URN in column O
   - Mark "Paid to EA" = Yes
   - Wait for sync
   - Check app - should show "EA Confirmed" with URN

---

## PHASE 6: Merge to Main (When Ready)

Once Option B is tested and working:

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature/ea-option-b-supabase-sync

# Push to main
git push origin main

# Vercel will auto-deploy production from main
```

---

## Monitoring & Maintenance

### Check Sync Logs

In Apps Script:
1. Click: Executions (clock icon)
2. View recent runs of `syncFromSupabase` and `syncToSupabase`
3. Check for errors

### Manual Sync

If sync seems stuck:
1. Open Apps Script
2. Run `syncFromSupabase` manually
3. Run `syncToSupabase` manually
4. Check execution logs

### Troubleshooting

**Applications not appearing in sheet:**
- Check `syncFromSupabase` execution log for errors
- Verify Supabase credentials in Script Properties
- Check Service Role Key has correct permissions

**Status updates not syncing back:**
- Check `syncToSupabase` execution log
- Verify Application IDs exist in column AA
- Check Supabase update permissions

**Duplicate rows appearing:**
- Check Application ID column (AA) is populated
- Verify `getExistingApplicationIds` is working
- May need to manually clean duplicates

---

## Admin columns are flexible - no breaking changes if new columns added

---

## Success Criteria

Option B is complete when:
- ✅ Form submissions go to Supabase (no client tokens)
- ✅ New applications appear in Google Sheet within 1 hour
- ✅ Admin can mark "Paid to RA" → syncs to Supabase
- ✅ Admin can mark "Paid to EA" + URN → syncs to Supabase
- ✅ Member sees status updates in app dashboard
- ✅ Admins can add extra columns without breaking sync
- ✅ Triggers run automatically (hourly/15min)
- ✅ No errors in Apps Script execution logs

---

## Rollback Plan

If Option B has issues:

```bash
# Revert to main branch
git checkout main
git push origin main --force

# Vercel will redeploy the working version
```

Then follow instructions in `BACKUP_CONFIG_[DATE].md` to restore Google Sheet and Apps Script v1.0.

---

## Estimated Implementation Time

- Phase 1 (Frontend): 30 minutes
- Phase 2 (Sheet structure): 15 minutes
- Phase 3 (Apps Script): 60 minutes
- Phase 4 (Setup & test): 30 minutes
- Phase 5 (Deploy): 15 minutes
- Phase 6 (Merge): 5 minutes

**Total: ~2.5 hours**

Plus testing and monitoring time.

---

## Notes

- Apps Script triggers may take up to 15 minutes to start working after creation
- First sync may be slow if there are many applications
- Admins can add columns AD onwards without affecting sync
- Column AA (Application ID) is critical - don't delete or modify
- Service Role Key has full database access - keep it secure
- Sync is eventually consistent (not real-time)

---

## Questions?

Before starting, ensure:
- ✅ Branch and backup complete (from previous work package)
- ✅ Understand the two-way sync flow
- ✅ Have Supabase Service Role Key ready
- ✅ Comfortable with Apps Script editor
- ✅ Time to implement and test (~3 hours)

Ready to proceed?
