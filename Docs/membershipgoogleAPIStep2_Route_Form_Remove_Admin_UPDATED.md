# Step 2: Route Form to Google & Remove Admin Functionality (UPDATED)

## Part A: Create Google Apps Script

### 1. Open Your Sheet
- Open "Run Alcester Adult Membership 2026 – 2027 (Responses)" in Google Sheets

### 2. Access Apps Script Editor
- Extensions → Apps Script
- This opens a new tab with the script editor

### 3. Replace Default Code

Delete everything and paste this:

```javascript
// ============================================================================
// EA APPLICATIONS - GOOGLE APPS SCRIPT BACKEND
// Receives form submissions from Run Alcester app and writes to sheet
// ============================================================================

// CONFIGURATION
const SHEET_NAME = "Form responses 1"; // Must match your tab name exactly

/**
 * ONE-TIME SETUP: Store secret token in Script Properties
 * Run this function ONCE to store your token securely, then delete this function
 */
function setupSecretToken() {
  const ui = SpreadsheetApp.getUi();
  
  const result = ui.prompt(
    'Setup Secret Token',
    'Enter a secure secret token (32+ random characters):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result.getSelectedButton() === ui.Button.OK) {
    const token = result.getResponseText().trim();
    
    if (token.length < 32) {
      ui.alert('Error', 'Token must be at least 32 characters long', ui.ButtonSet.OK);
      return;
    }
    
    // Store in Script Properties (encrypted by Google)
    PropertiesService.getScriptProperties().setProperty('SECRET_TOKEN', token);
    
    ui.alert('Success', 'Secret token stored securely.\n\nIMPORTANT: Copy this token to your .env.local file:\n\n' + token, ui.ButtonSet.OK);
  }
}

/**
 * Handle POST requests from the application form
 */
function doPost(e) {
  try {
    // Parse incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get secret token from Script Properties (secure storage)
    const SECRET_TOKEN = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN');
    
    if (!SECRET_TOKEN) {
      return createResponse(false, "Server configuration error - secret token not set");
    }
    
    // Security: Verify secret token
    if (!data.token || data.token !== SECRET_TOKEN) {
      return createResponse(false, "Unauthorized - invalid token");
    }
    
    // Get the target sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createResponse(false, "Sheet not found: " + SHEET_NAME);
    }
    
    // Prepare row data matching column structure (A-Y, 25 columns)
    const row = [
      '', // A: Membership checked (admin fills later)
      '', // B: Paid to RA (admin fills later)
      '', // C: Paid to EA (admin fills later)
      new Date(), // D: Timestamp
      data.email || '', // E: Email address
      data.title || '', // F: Title
      data.full_name || '', // G: Full Name
      data.date_of_birth || '', // H: Date of Birth
      data.sex_at_birth || '', // I: Sex at birth
      data.address_postcode || '', // J: Address & Postcode
      data.email || '', // K: Email (duplicate)
      data.phone || '', // L: Telephone
      data.nationality || '', // M: Nationality
      data.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim', // N: Membership type required
      data.ea_urn_at_application || '', // O: EA URN
      data.has_previous_club ? 'Yes' : 'No', // P: Previously registered
      data.previous_club_name || '', // Q: Previous club name
      data.has_health_conditions ? 'Yes' : 'No', // R: Health conditions
      data.health_conditions_details || '', // S: Health details
      data.emergency_contact_name || '', // T: Emergency Contact Name
      data.emergency_contact_relationship || '', // U: Emergency Contact Relationship
      data.emergency_contact_number || '', // V: Emergency Contact Number
      data.additional_info || '', // W: Additional info
      data.payment_sent_confirmed ? 'Yes' : 'No', // X: Payment Sent
      data.all_declarations_accepted ? 'Yes' : 'No' // Y: Declarations
    ];
    
    // Append the row to the sheet
    sheet.appendRow(row);
    
    // Get the row number that was just added
    const rowNumber = sheet.getLastRow();
    
    // Log for debugging
    console.log(`Application submitted: ${data.full_name} (${data.email}) - Row ${rowNumber}`);
    
    // Return success response
    return createResponse(true, "Application submitted successfully", {
      rowNumber: rowNumber,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Log error
    console.error("Error processing application:", error);
    
    // Return error response
    return createResponse(false, "Server error: " + error.toString());
  }
}

/**
 * Create JSON response
 */
function createResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    ...data
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - run this to verify script works
 */
function testSubmission() {
  // Get token from Script Properties
  const SECRET_TOKEN = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN');
  
  if (!SECRET_TOKEN) {
    Logger.log('ERROR: Secret token not set. Run setupSecretToken first.');
    return;
  }
  
  const testData = {
    token: SECRET_TOKEN,
    full_name: "Test User",
    email: "test@example.com",
    phone: "07700123456",
    title: "Mr",
    date_of_birth: "1990-01-01",
    sex_at_birth: "Male",
    address_postcode: "123 Test St, Alcester, B49 6AA",
    nationality: "British",
    membership_type: "first_claim",
    ea_urn_at_application: "",
    has_previous_club: false,
    previous_club_name: "",
    has_health_conditions: false,
    health_conditions_details: "",
    emergency_contact_name: "Jane Doe",
    emergency_contact_relationship: "Spouse",
    emergency_contact_number: "07700654321",
    additional_info: "Test submission",
    payment_sent_confirmed: true,
    all_declarations_accepted: true
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(e);
  Logger.log(response.getContent());
}
```

### 4. Setup Secret Token (Secure Method)

**Run the setup function to store your token securely:**

1. In Apps Script editor, select **"setupSecretToken"** from the function dropdown
2. Click **"Run"** (play button)
3. A dialog will appear asking for your secret token
4. Generate a strong token (use a password generator - 32+ characters)
   - Example tool: https://passwordsgenerator.net/
   - Recommended: 40 characters, alphanumeric + symbols
5. Paste the token into the dialog
6. Click **OK**
7. **COPY THE TOKEN** - you'll see it displayed in a success message
8. **SAVE THIS TOKEN** in your `.env.local` file (next step)

**After setup:**
- Your token is now stored encrypted in Google's Script Properties
- It's not visible anywhere in the code
- You can delete the `setupSecretToken` function if you want (optional)

**Security Notes:**
✅ Token stored encrypted by Google
✅ Not visible in code
✅ Not in version control
✅ Only accessible by you when logged in

### 5. Test the Script

**IMPORTANT: Run setupSecretToken first (Step 4 above) before testing!**

Then:
- Select "testSubmission" function in the dropdown
- Click "Run" (play button)
- Check "Execution log" at bottom - should show success
- Check your "Form responses 1" sheet - should have a new test row

If you get "Secret token not set" error, go back and run `setupSecretToken` first.

### 6. Deploy as Web App

1. Click "Deploy" → "New deployment"
2. Click settings icon (⚙️) next to "Select type"
3. Choose "Web app"
4. Configuration:
   - Description: "EA Applications API v1"
   - Execute as: **Me (runalcester@gmail.com)**
   - Who has access: **Anyone**
5. Click "Deploy"
6. **COPY THE WEB APP URL** - looks like:
   `https://script.google.com/macros/s/ABC123.../exec`
7. Save this URL - you'll need it for the frontend!

---

## Part B: Update Frontend to Use Google Sheets

### 1. Create Google Sheets Service

Create new file: `src/modules/membership/services/googleSheetsService.ts`

```typescript
/**
 * Google Sheets Service for EA Applications
 * Submits application forms to Google Apps Script backend
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL;
const SECRET_TOKEN = import.meta.env.VITE_GOOGLE_SHEETS_TOKEN;

export interface GoogleSheetsSubmissionData {
  full_name: string;
  email: string;
  phone: string;
  title: string;
  date_of_birth: string;
  sex_at_birth: string;
  address_postcode: string;
  nationality: string;
  membership_type: 'first_claim' | 'second_claim';
  ea_urn_at_application?: string;
  has_previous_club: boolean;
  previous_club_name?: string;
  has_health_conditions: boolean;
  health_conditions_details?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  additional_info?: string;
  payment_sent_confirmed: boolean;
  all_declarations_accepted: boolean;
}

interface GoogleSheetsResponse {
  success: boolean;
  message: string;
  rowNumber?: number;
  timestamp?: string;
}

export class GoogleSheetsService {
  /**
   * Submit application to Google Sheets
   */
  static async submitApplication(data: GoogleSheetsSubmissionData): Promise<GoogleSheetsResponse> {
    // Validate environment variables
    if (!APPS_SCRIPT_URL) {
      throw new Error('Google Sheets URL not configured. Please set VITE_GOOGLE_SHEETS_URL in .env');
    }
    
    if (!SECRET_TOKEN) {
      throw new Error('Google Sheets token not configured. Please set VITE_GOOGLE_SHEETS_TOKEN in .env');
    }

    try {
      console.log('📤 Submitting application to Google Sheets...');
      
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          token: SECRET_TOKEN
        }),
        // Google Apps Script can be slow, increase timeout
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: GoogleSheetsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit application');
      }

      console.log('✅ Application submitted successfully:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to submit to Google Sheets:', error);
      
      // Provide user-friendly error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Request timed out. Please try again.');
      }
      
      throw error;
    }
  }
}
```

### 2. Update Environment Variables

Add to `.env.local`:
```
VITE_GOOGLE_SHEETS_URL=https://script.google.com/macros/s/YOUR-SCRIPT-ID/exec
VITE_GOOGLE_SHEETS_TOKEN=your-secret-token-from-apps-script
```

Replace with your actual values from Part A.

### 3. Update Application Form Component

In `src/modules/membership/components/AffiliatedMemberApplicationForm.tsx`:

Find the `handleSubmit` function and replace with:

```typescript
import { GoogleSheetsService } from '../services/googleSheetsService';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  try {
    setIsSubmitting(true);
    setError('');
    
    // Check if user has previous club
    const hasPreviousClub = formData.previous_club_name && formData.previous_club_name.trim().length > 0;
    
    // Check if all declarations are accepted (all 6 must be true)
    const allDeclarationsAccepted = 
      formData.declaration_amateur &&
      formData.declaration_own_risk &&
      formData.declaration_data_privacy &&
      formData.declaration_policies &&
      formData.payment_sent_confirmed &&
      formData.payment_reference_confirmed;
    
    // Prepare data for Google Sheets submission
    const submissionData: GoogleSheetsSubmissionData = {
      full_name: state.member?.full_name || '',
      email: state.member?.email || '',
      phone: state.member?.phone || '',
      title: formData.title,
      date_of_birth: formData.date_of_birth,
      sex_at_birth: formData.sex_at_birth,
      address_postcode: formData.address_postcode,
      nationality: formData.nationality,
      membership_type: formData.membership_type,
      ea_urn_at_application: formData.ea_urn_at_application,
      has_previous_club: hasPreviousClub,
      previous_club_name: formData.previous_club_name,
      has_health_conditions: formData.has_health_conditions,
      health_conditions_details: formData.health_conditions_details,
      emergency_contact_name: formData.emergency_contact_name,
      emergency_contact_relationship: formData.emergency_contact_relationship,
      emergency_contact_number: formData.emergency_contact_number,
      additional_info: formData.additional_info,
      payment_sent_confirmed: formData.payment_sent_confirmed,
      all_declarations_accepted: allDeclarationsAccepted
    };
    
    // Submit to Google Sheets
    const result = await GoogleSheetsService.submitApplication(submissionData);
    
    // Show success message
    setSuccess(
      'Application Submitted Successfully!\n\n' +
      'Thank you for your EA membership application. ' +
      'We will review your application and contact you once payment is confirmed.\n\n' +
      'Your payment reference: ' + formData.payment_reference
    );
    
    // Optionally redirect or reset form
    // ...
    
  } catch (error) {
    console.error('Submission failed:', error);
    setError(
      error instanceof Error 
        ? error.message 
        : 'Failed to submit application. Please try again or contact us if the problem persists.'
    );
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Part C: Remove Admin Functionality from App

### 1. Remove Admin Routes

In your routing configuration, remove:
- `/admin/ea-applications` route
- Any EA admin components

### 2. Remove Admin Navigation

In `src/shared/components/navigation/Sidebar.tsx` (or equivalent):

Remove the "EA Applications" admin menu item:
```typescript
// DELETE THIS:
{
  label: 'EA Applications',
  icon: '📋',
  path: '/admin/ea-applications',
  visible: member?.access_level === 'admin'
}
```

### 3. Keep Member Navigation

KEEP the member menu item:
```typescript
{
  label: 'Club Membership',
  icon: '🏃',
  path: '/ea-membership',
  visible: true // All users can access
}
```

### 4. Optional: Archive Admin Components

You can either delete or keep (but not use) these files:
- `src/modules/admin/components/AffiliatedApplicationsManagement.tsx`
- `src/modules/admin/components/EAApplicationSettingsModal.tsx`

Recommendation: Keep them in case you want to reference later, just remove the routes.

---

## Data Mapping Reference

### Form Field → Google Sheet Column:

| Form Field | Apps Script Variable | Column | Header |
|------------|---------------------|--------|--------|
| (admin) | - | A | Membership checked |
| (admin) | - | B | Paid to RA |
| (admin) | - | C | Paid to EA |
| (auto) | new Date() | D | Timestamp |
| state.member.email | data.email | E | Email address |
| formData.title | data.title | F | Title |
| state.member.full_name | data.full_name | G | Full Name |
| formData.date_of_birth | data.date_of_birth | H | Date of Birth |
| formData.sex_at_birth | data.sex_at_birth | I | Sex at birth |
| formData.address_postcode | data.address_postcode | J | Address & Postcode |
| state.member.email | data.email | K | Email |
| state.member.phone | data.phone | L | Telephone |
| formData.nationality | data.nationality | M | Nationality |
| formData.membership_type | data.membership_type | N | Membership type required |
| formData.ea_urn_at_application | data.ea_urn_at_application | O | EA URN |
| (calculated) | data.has_previous_club | P | Previously registered |
| formData.previous_club_name | data.previous_club_name | Q | Previous club name |
| formData.has_health_conditions | data.has_health_conditions | R | Health conditions |
| formData.health_conditions_details | data.health_conditions_details | S | Health details |
| formData.emergency_contact_name | data.emergency_contact_name | T | Emergency Contact Name |
| formData.emergency_contact_relationship | data.emergency_contact_relationship | U | Emergency Contact Relationship |
| formData.emergency_contact_number | data.emergency_contact_number | V | Emergency Contact Number |
| formData.additional_info | data.additional_info | W | Additional info |
| formData.payment_sent_confirmed | data.payment_sent_confirmed | X | Payment Sent |
| (all 6 declarations) | data.all_declarations_accepted | Y | Declarations |

---

## Testing Checklist

- [ ] Google Apps Script created
- [ ] SHEET_NAME = "Form responses 1" (matches tab name)
- [ ] SECRET_TOKEN generated and saved
- [ ] Test function runs successfully
- [ ] Web App deployed
- [ ] Web App URL copied
- [ ] Frontend service created: `googleSheetsService.ts`
- [ ] Environment variables added to `.env.local`
- [ ] Application form updated to use Google Sheets
- [ ] Data mapping correct (25 columns A-Y)
- [ ] Admin routes removed
- [ ] Admin navigation removed
- [ ] Member navigation still works
- [ ] Build succeeds without errors

---

## Troubleshooting

**"Sheet not found" error:**
- Check SHEET_NAME in Apps Script is exactly "Form responses 1"
- Case-sensitive, including spaces

**Wrong number of columns:**
- Apps Script row array has 25 elements (A-Y)
- Check no missing or extra columns

**Data in wrong columns:**
- Check row array matches the mapping table above
- Arrays are 0-indexed: row[0] = column A, row[1] = column B, etc.

**"Unauthorized" response:**
- Token mismatch between Apps Script and `.env.local`
- Check both are identical

---

## Next Step

Proceed to Step 3: Test form submission from app to Google Sheets.
