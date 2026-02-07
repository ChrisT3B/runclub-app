# EA AFFILIATED MEMBER APPLICATIONS - IMPLEMENTATION WORK PACKAGE (REVISED)

## Overview
Implement England Athletics affiliated member application system with two-stage admin approval (payment confirmation → EA registration confirmation).

## Database Migration
**COMPLETED:** Run `/home/claude/01_ea_affiliation_migration_REVISED.sql` in Supabase SQL editor

## Key Schema Notes (From Revised Migration)

### Members Table - Existing Fields Used:
- `is_paid_member` (boolean) - EA affiliated flag (TRUE = currently affiliated)
- `ea_urn` (text) - England Athletics URN (already exists)

### Members Table - New Fields Added:
- `ea_membership_type` (text) - 'first_claim' or 'second_claim'
- `ea_affiliation_year` (text) - e.g., "2025-2026"
- `title` (text) - Mr, Mrs, Ms, Miss, Dr, Other
- `date_of_birth` (date)
- `sex_at_birth` (text) - 'male' or 'female'
- `address_postcode` (text)
- `nationality` (text)

### Applications Table:
- Stores historical snapshot of application data
- Links to member via `member_id`
- Trigger automatically syncs to members table when status = 'ea_confirmed'

---

## Implementation Tasks

### TASK 1: Create TypeScript Types
**File:** `src/types/affiliatedMember.ts`

Create interfaces for:

```typescript
// Main application interface (matches affiliated_member_applications table)
export interface AffiliatedMemberApplication {
  id: string;
  member_id: string;
  
  // Personal Information (snapshot at time of application)
  title: 'mr' | 'mrs' | 'ms' | 'miss' | 'dr' | 'other';
  date_of_birth: string; // Date string
  sex_at_birth: 'male' | 'female';
  address_postcode: string;
  nationality: string;
  
  // Membership Details
  membership_type: 'first_claim' | 'second_claim';
  membership_fee: number; // 30.00 or 12.00
  membership_year: string; // e.g., "2025-2026"
  is_renewal: boolean;
  
  // EA Registration
  ea_urn_at_application?: string; // Their URN when applying (if renewal)
  new_ea_urn?: string; // URN assigned by EA (set by membership secretary)
  previous_club_name?: string;
  
  // Health & Safety (snapshot)
  has_health_conditions: boolean;
  health_conditions_details?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  additional_info?: string;
  
  // Payment Information
  payment_reference: string;
  payment_method: string;
  payment_date?: string;
  payment_notes?: string;
  
  // Declarations (all 6 must be true)
  declaration_amateur: boolean;
  declaration_own_risk: boolean;
  declaration_data_privacy: boolean;
  declaration_policies: boolean;
  payment_sent_confirmed: boolean;
  payment_reference_confirmed: boolean;
  
  // Workflow Status
  status: 'submitted' | 'payment_confirmed' | 'ea_confirmed' | 'cancelled';
  
  // Admin Tracking
  payment_confirmed_by?: string;
  payment_confirmed_at?: string;
  ea_confirmed_by?: string;
  ea_confirmed_at?: string;
  ea_confirmation_notes?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Application settings (matches ea_application_settings table)
export interface EAApplicationSettings {
  id: string;
  membership_year: string; // e.g., "2025-2026"
  applications_open: boolean;
  open_date?: string;
  close_date?: string;
  marathon_ballot_deadline?: string;
  first_claim_fee: number; // NEW: admin can set fee
  second_claim_fee: number; // NEW: admin can set fee
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Form submission data (what member submits)
export interface ApplicationFormData {
  title: string;
  date_of_birth: string;
  sex_at_birth: string;
  address_postcode: string;
  nationality: string;
  membership_type: string;
  ea_urn_at_application?: string;
  previous_club_name?: string;
  has_health_conditions: boolean;
  health_conditions_details?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  additional_info?: string;
  payment_reference: string;
  declaration_amateur: boolean;
  declaration_own_risk: boolean;
  declaration_data_privacy: boolean;
  declaration_policies: boolean;
  payment_sent_confirmed: boolean;
  payment_reference_confirmed: boolean;
}

// Payment confirmation data (treasurer)
export interface PaymentConfirmationData {
  application_id: string;
  payment_date: string;
  payment_notes?: string;
}

// EA confirmation data (membership secretary)
export interface EAConfirmationData {
  application_id: string;
  new_ea_urn: string;
  ea_confirmation_notes?: string;
}

// Updated Member interface to include EA fields
export interface Member {
  // ... existing fields ...
  is_paid_member: boolean; // EA affiliated flag
  ea_urn?: string;
  ea_membership_type?: 'first_claim' | 'second_claim';
  ea_affiliation_year?: string;
  title?: string;
  date_of_birth?: string;
  sex_at_birth?: 'male' | 'female';
  address_postcode?: string;
  nationality?: string;
}
```

---

### TASK 2: Create Service Layer
**File:** `src/modules/membership/services/affiliatedMemberService.ts`

Implement these functions with **full security validation** using `InputSanitizer` and `SQLSecurityValidator`:

#### Member Functions:
```typescript
// Get current membership year from DB function
async getCurrentMembershipYear(): Promise<string>

// Get application settings (includes open/closed status and fees)
async getApplicationSettings(year: string): Promise<EAApplicationSettings>

// Check if member has existing application for year
async getMemberApplication(memberId: string, year?: string): Promise<AffiliatedMemberApplication | null>

// Submit new application
async submitApplication(
  memberId: string,
  applicationData: ApplicationFormData
): Promise<AffiliatedMemberApplication>

// Update submitted application (only if status = 'submitted')
async updateApplication(
  applicationId: string,
  data: Partial<ApplicationFormData>
): Promise<void>

// Cancel application
async cancelApplication(
  applicationId: string,
  memberId: string,
  reason: string
): Promise<void>
```

#### Admin Functions:
```typescript
// Get applications by status (for treasurer/membership secretary views)
async getApplicationsByStatus(
  status: 'submitted' | 'payment_confirmed' | 'ea_confirmed' | 'cancelled',
  year?: string
): Promise<AffiliatedMemberApplication[]>

// Confirm payment (treasurer) - changes status to 'payment_confirmed'
async confirmPayment(
  applicationId: string, 
  confirmedBy: string,
  data: PaymentConfirmationData
): Promise<void>

// Confirm EA registration (membership secretary) - changes status to 'ea_confirmed'
async confirmEARegistration(
  applicationId: string,
  confirmedBy: string,
  data: EAConfirmationData
): Promise<void>

// Get all applications with filters
async getAllApplications(filters?: {
  status?: string;
  membershipYear?: string;
  search?: string;
}): Promise<AffiliatedMemberApplication[]>

// Get single application by ID
async getApplicationById(applicationId: string): Promise<AffiliatedMemberApplication>

// Export to CSV for EA portal
async exportApplicationsToCSV(membershipYear: string): Promise<Blob>
```

#### Settings Management Functions (Admin Only):
```typescript
// Get settings for specific year
async getApplicationSettings(year: string): Promise<EAApplicationSettings>

// Create/update settings for a membership year
async updateApplicationSettings(
  year: string,
  settings: Partial<EAApplicationSettings>
): Promise<void>

// Open/close application window
async setApplicationWindowStatus(
  year: string,
  isOpen: boolean
): Promise<void>

// Update membership fees
async updateMembershipFees(
  year: string,
  firstClaimFee: number,
  secondClaimFee: number
): Promise<void>
```

**Note on Fees:** When submitting application, query the settings table to get current fees for the membership year and set `membership_fee` accordingly based on `membership_type`.

**CSV Export Format:**
```csv
Title,Full Name,Date of Birth,Sex,Address & Postcode,Email,Telephone,Nationality,Membership Type,EA URN,Previous Club,Emergency Contact Name,Emergency Contact Relationship,Emergency Contact Number
```

---

### TASK 3: Member Application Form Component
**File:** `src/modules/membership/components/AffiliatedMemberApplicationForm.tsx`

**Features:**

1. **Check application window status:**
   - Query `ea_application_settings` for current year
   - If `applications_open = false`, show message: "Applications are currently closed. Please check back later."
   - Don't render form if closed

2. **Auto-detect renewal:**
   - Check `member.is_paid_member` from context
   - If true and current year, show banner: "🔄 This is a renewal for 2025-2026"
   - Pre-fill `ea_urn_at_application` with their current `member.ea_urn`

3. **Display current fees:**
   - Query settings to get `first_claim_fee` and `second_claim_fee`
   - Show in membership type radio buttons: "1st Claim (£{first_claim_fee})" and "2nd Claim (£{second_claim_fee})"

4. **Pre-populate from member profile:**
   - `full_name` - display but don't include in form (use from member context)
   - `email` - display but don't include in form (use from member context)
   - `phone` - display but don't include in form (use from member context)
   - `title` (if exists in member profile)
   - `date_of_birth` (if exists)
   - `sex_at_birth` (if exists)
   - `address_postcode` (if exists)
   - `nationality` (if exists)
   - `emergency_contact_name`
   - `emergency_contact_relationship` (if exists, otherwise blank)
   - `emergency_contact_number` (same as `emergency_contact_phone`)
   - `health_conditions` → maps to `has_health_conditions` and `health_conditions_details`

5. **Form fields:**
   - Title (dropdown: Mr, Mrs, Ms, Miss, Dr, Other)
   - Date of Birth (date picker, validate ≥16 years old)
   - Sex at Birth (radio: Male, Female)
   - Address & Postcode (textarea)
   - Nationality (text)
   - Membership Type (radio: "1st Claim (£{fee})" | "2nd Claim (£{fee})")
   - EA URN (text, conditional: show if renewal OR if "previous club" answered yes)
   - Previous club? (radio: Yes/No)
   - Previous club name (text, conditional if yes)
   - Health conditions? (radio: Yes/No)
   - Health conditions details (textarea, conditional if yes)
   - Emergency contact name (text, pre-filled)
   - Emergency contact relationship (text, pre-filled or blank)
   - Emergency contact number (text, pre-filled)
   - Additional info (textarea, optional)

6. **Payment section:**
   - Auto-generate payment reference: 
     ```typescript
     const surname = member.full_name.split(' ').pop() || '';
     const ref = '25MEM' + surname.substring(0, 5).toUpperCase();
     ```
   - Display bank details clearly:
     ```
     Bank Transfer Details:
     Run Alcester
     Sort Code: 30 96 97
     Account Number: 54037468
     Payment Reference: [auto-generated]
     ```
   - Checkbox: "I have sent payment via bank transfer"
   - Checkbox: "I confirm my payment reference is correct"

7. **Declarations section (all required, exact wording from form):**
   - ☐ I am declaring that I am an amateur as defined by the eligibility rule of UK Athletics
   - ☐ I take part in the club's activities at my own risk and that I will be responsible for my own safety whilst out running with the club or when I take part in events as a club member
   - ☐ Personal information will not be disclosed to any third party with the exception of England Athletics for affiliation or registering purposes. All athletes will be registered with EA
   - ☐ I understand that a copy of the Health & Safety policy, Constitution, Risk Assessments and Byelaws are available and agree to abide by these
   - ☐ Payment sent confirmed
   - ☐ Payment reference confirmed

8. **Important note at top of form:**
   ```
   ℹ️ PLEASE NOTE THAT MEMBERSHIP RUNS FROM 1ST APRIL TO 31ST MARCH. 
   PART-YEAR SUBSCRIPTIONS ARE NOT AVAILABLE.
   ```

9. **Validation:**
   - All required fields must be filled
   - All 6 declarations must be checked
   - DOB must be ≥16 years ago
   - Check application window is open
   - Check no existing application for current year
   - Phone number ≥10 digits
   - Use security validators for all inputs

10. **Submission:**
    - Show loading state
    - On success: Show confirmation message with application ID and status
    - On error: Show error message
    - Don't clear form after success (let user review)

**Styling:** Use existing card/form styles from ProfileEditForm.tsx

---

### TASK 4: Admin Management Interface
**File:** `src/modules/admin/components/AffiliatedApplicationsManagement.tsx`

**Interface Structure:**
- Three-tab layout
- Search/filter bar at top
- Export CSV button
- Settings button (opens settings modal)

**Tab 1: Pending Payment (Treasurer View)**
Shows applications where `status = 'submitted'`

**Columns:**
| Actions | Name | Email | Type | Fee | Payment Ref | Applied |
|---------|------|-------|------|-----|-------------|---------|

**Actions:**
- "✓ Confirm Payment" button → opens modal
- "👁️ View Details" button → opens full application view
- "❌ Cancel" button → cancel application

**Confirm Payment Modal:**
- Display member name and application details
- Input: Payment date (date picker, defaults to today)
- Textarea: Payment notes (optional)
- Button: "Confirm Payment Received"
- On confirm: Update status to 'payment_confirmed'

**Tab 2: Pending EA Registration (Membership Secretary View)**
Shows applications where `status = 'payment_confirmed'`

**Columns:**
| Actions | Name | Email | Type | Payment Confirmed | EA URN |
|---------|------|-------|------|-------------------|--------|

**Actions:**
- Input field for EA URN (inline editable)
- "✓ Confirm EA" button → opens modal
- "👁️ View Details" button → opens full application view

**Confirm EA Registration Modal:**
- Display member name and application details
- Required: EA URN input (if not already entered inline)
- Textarea: Notes (optional)
- Button: "Confirm EA Registration"
- On confirm: 
  - Update status to 'ea_confirmed'
  - Set `new_ea_urn`
  - **Trigger automatically updates member profile** (via database trigger)
  - Show success message: "Member profile updated automatically"

**Tab 3: Completed & Cancelled**
Shows applications where `status IN ('ea_confirmed', 'cancelled')`

**Columns:**
| Status | Name | Email | Type | Completed Date | Actions |
|--------|------|-------|------|----------------|---------|

**Actions:**
- "👁️ View Details" button

**Additional Features:**
- Filter by membership year dropdown (at top)
- Search by name/email (at top)
- "Export to CSV" button → downloads CSV for EA portal (only ea_confirmed applications)
- View Details Modal shows full application (read-only)
- Cancel Application option (with reason textarea) - available on Tab 1 and Tab 2

**Settings Button:**
Opens settings modal for managing application window and fees.

**Styling:** Follow patterns from MemberList.tsx and associated CSS

---

### TASK 5: Admin Settings Modal Component
**File:** `src/modules/admin/components/EAApplicationSettingsModal.tsx`

**Purpose:** Allow admins to manage application window and fees

**Modal Content:**

```
╔═══════════════════════════════════════════════════╗
║ EA Application Settings - 2025-2026               ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║ Application Window Status                         ║
║ ○ Open  ○ Closed                                 ║
║                                                   ║
║ Open Date: [date picker] (optional)              ║
║ Close Date: [date picker] (optional)             ║
║ Marathon Ballot Deadline: [date picker]          ║
║                                                   ║
║ ─────────────────────────────────────────────     ║
║                                                   ║
║ Membership Fees                                   ║
║ 1st Claim Fee: £ [30.00]                         ║
║ 2nd Claim Fee: £ [12.00]                         ║
║                                                   ║
║ ─────────────────────────────────────────────     ║
║                                                   ║
║ Notes (optional)                                  ║
║ [textarea for admin notes]                       ║
║                                                   ║
║ [Cancel]  [Save Settings]                        ║
╚═══════════════════════════════════════════════════╝
```

**Features:**
- Load current settings for selected membership year
- Toggle application window open/closed
- Set optional open and close dates
- Set marathon ballot deadline
- **Edit membership fees** (first claim and second claim)
- Add optional admin notes
- Save updates settings table
- Show success/error messages

**Validation:**
- Fees must be > 0
- Fees should be in format XX.XX (two decimal places)
- Dates must be valid
- Close date must be after open date (if both provided)

**Access:** Only visible to admins

---

### TASK 6: Dashboard Integration
**File:** `src/modules/dashboard/components/DashboardContent.tsx`

Add new card to member dashboard (after "Your Profile" card):

**Logic:**
```typescript
// Check member's EA status
const isEAAffiliated = state.member?.is_paid_member;
const eaYear = state.member?.ea_affiliation_year;
const currentYear = await getCurrentMembershipYear();

// Check for pending application
const pendingApp = await getMemberApplication(state.member.id, currentYear);

// Get settings to check if applications are open
const settings = await getApplicationSettings(currentYear);
```

**Card Variations:**

**Case 1: No affiliation, no pending application, window OPEN**
```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">🏃 England Athletics Affiliation</h3>
  </div>
  <div className="card-content">
    <p>Join EA affiliation for £{settings.first_claim_fee}/year</p>
    <p style={{fontSize: '14px', color: 'var(--gray-600)'}}>
      Benefits include:
    </p>
    <ul style={{fontSize: '14px', color: 'var(--gray-600)', marginLeft: '20px'}}>
      <li>Reduced race entry fees</li>
      <li>London Marathon ballot entry</li>
      <li>Discounts from sports retailers</li>
    </ul>
    <button className="btn btn-primary" onClick={() => navigate to application form}>
      Apply for Membership
    </button>
  </div>
</div>
```

**Case 2: No affiliation, no pending application, window CLOSED**
```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">🏃 England Athletics Affiliation</h3>
  </div>
  <div className="card-content">
    <p style={{color: 'var(--gray-600)'}}>
      Applications are currently closed. Please check back later.
    </p>
  </div>
</div>
```

**Case 3: Affiliated (current year)**
```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">✅ EA Affiliated Member {eaYear}</h3>
  </div>
  <div className="card-content">
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
      <div>
        <div style={{fontSize: '14px', color: 'var(--gray-600)'}}>Type:</div>
        <div>{member.ea_membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}</div>
      </div>
      <div>
        <div style={{fontSize: '14px', color: 'var(--gray-600)'}}>EA URN:</div>
        <div>{member.ea_urn || 'Not set'}</div>
      </div>
    </div>
    {/* Show renewal option if in renewal period (e.g., from February onwards) */}
    {isRenewalPeriod && settings.applications_open && (
      <button className="btn btn-secondary" style={{marginTop: '12px'}}>
        Renew for {nextYear}
      </button>
    )}
  </div>
</div>
```

**Case 4: Pending application**
```tsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">📋 EA Application Status</h3>
  </div>
  <div className="card-content">
    <div style={{marginBottom: '12px'}}>
      <span style={{fontSize: '14px', color: 'var(--gray-600)'}}>Submitted:</span> {formatDate(pendingApp.created_at)}
    </div>
    <div style={{marginBottom: '12px'}}>
      <span style={{fontSize: '14px', color: 'var(--gray-600)'}}>Status:</span>{' '}
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        background: pendingApp.status === 'submitted' ? '#fef3c7' : 
                   pendingApp.status === 'payment_confirmed' ? '#dcfce7' : '#dcfce7',
        color: pendingApp.status === 'submitted' ? '#92400e' :
               pendingApp.status === 'payment_confirmed' ? '#166534' : '#166534'
      }}>
        {pendingApp.status === 'submitted' ? 'Awaiting Payment Confirmation' :
         pendingApp.status === 'payment_confirmed' ? 'Payment Confirmed - EA Registration Pending' :
         'Confirmed'}
      </span>
    </div>
    <div style={{fontSize: '14px', color: 'var(--gray-600)'}}>
      Payment Ref: <strong>{pendingApp.payment_reference}</strong>
    </div>
    {pendingApp.status === 'submitted' && (
      <button 
        className="btn btn-secondary" 
        style={{marginTop: '12px'}} 
        onClick={() => navigate to edit application}>
        Edit Application
      </button>
    )}
  </div>
</div>
```

---

### TASK 7: Navigation Updates

**File:** `src/shared/components/navigation/Sidebar.tsx` (or similar)

**For ALL Users (Members, LIRFs, and Admins):**
Add menu item in membership section:
```tsx
{
  label: 'EA Membership',
  icon: '🏃',
  path: '/ea-membership',
  exact: false,
  visible: true // Visible to all authenticated users
}
```

**For Admins Only:**
Add menu item in admin section:
```tsx
{
  label: 'EA Applications',
  icon: '📋',
  path: '/admin/ea-applications',
  badge: pendingCount, // Count of pending applications
  exact: false,
  visible: member?.access_level === 'admin'
}
```

**Badge logic:**
```typescript
const pendingPaymentCount = await getApplicationsByStatus('submitted').length;
const pendingEACount = await getApplicationsByStatus('payment_confirmed').length;
const totalPending = pendingPaymentCount + pendingEACount;
```

---

### TASK 8: Routing Setup

**File:** `src/App.tsx` (or router configuration file)

Add routes:
```tsx
// Member routes (accessible to all authenticated users)
<Route 
  path="/ea-membership" 
  element={
    <ProtectedRoute>
      <AffiliatedMemberApplicationForm />
    </ProtectedRoute>
  } 
/>

// Admin routes (admin only)
<Route 
  path="/admin/ea-applications" 
  element={
    <AdminRoute>
      <AffiliatedApplicationsManagement />
    </AdminRoute>
  } 
/>
```

---

### TASK 9: Email Notifications (Optional - Implement Later)

**File:** `src/modules/membership/services/affiliatedMemberEmailService.ts`

Create email templates and sending logic for:
1. Application submitted confirmation
2. Payment confirmed notification
3. EA registration confirmed welcome email
4. Application cancelled notification

Use existing email infrastructure from the codebase.

---

## Implementation Order

1. ✅ Database migration (run SQL file first)
2. TypeScript types (Task 1)
3. Service layer (Task 2)
4. Admin settings modal (Task 5) - needed for Task 3
5. Member application form (Task 3)
6. Admin management interface (Task 4)
7. Dashboard integration (Task 6)
8. Navigation updates (Task 7)
9. Routing setup (Task 8)
10. Email notifications (Task 9 - optional)

---

## Key Business Rules

1. **Membership Year:** April to March, use `get_current_membership_year()` function
2. **Application Window:** Check `ea_application_settings.applications_open` before allowing submission
3. **Fees:** Query settings table for current `first_claim_fee` and `second_claim_fee`
4. **Single Application:** One active application per member per year
5. **Two-Stage Approval:** Treasurer confirms payment → Membership secretary confirms EA registration
6. **Auto-Update Member:** Database trigger updates `members` table when status becomes 'ea_confirmed':
   - Sets `is_paid_member = true`
   - Updates `ea_membership_type`, `ea_affiliation_year`, `ea_urn`
   - Updates `title`, `date_of_birth`, `sex_at_birth`, `address_postcode`, `nationality`
   - Does NOT update `full_name`, `email`, `phone`, emergency contacts, health conditions
7. **Payment Reference Format:** `25MEM + first 5 chars of surname (uppercase)`
8. **Cancellation:** Keep record with cancelled status, don't delete
9. **CSV Export:** Required for membership secretary to upload to EA portal
10. **Age Validation:** Must be ≥16 years old (DOB check)
11. **Security:** Use `InputSanitizer` and `SQLSecurityValidator` on all user inputs

---

## Admin Capabilities Summary

Admins can:
- ✅ Open/close application window for any membership year
- ✅ Set open and close dates (optional)
- ✅ Set marathon ballot deadline
- ✅ **Set membership fees** (first claim and second claim)
- ✅ Confirm payment received (treasurer role)
- ✅ Confirm EA registration (membership secretary role)
- ✅ View all applications with filtering
- ✅ Export applications to CSV
- ✅ Cancel applications with reason
- ✅ View application history

---

## Testing Checklist

### Member Application Form:
- [ ] Pre-populates correctly from member profile
- [ ] Detects renewal vs new application
- [ ] Auto-generates payment reference correctly
- [ ] Displays current fees from settings
- [ ] Shows "closed" message when applications closed
- [ ] Validates all required fields
- [ ] Validates DOB ≥16 years
- [ ] Requires all 6 declarations checked
- [ ] Shows error if existing application for year
- [ ] Successfully submits application
- [ ] Shows confirmation on success

### Admin Settings:
- [ ] Loads current settings for year
- [ ] Can toggle application window open/closed
- [ ] Can update fees
- [ ] Validates fees > 0 and proper format
- [ ] Saves settings successfully
- [ ] Shows success message

### Admin Interface (Treasurer):
- [ ] Shows all 'submitted' applications
- [ ] Confirms payment with date and notes
- [ ] Updates status to 'payment_confirmed'
- [ ] Moves application to EA confirmation tab
- [ ] Can cancel application with reason

### Admin Interface (Membership Secretary):
- [ ] Shows all 'payment_confirmed' applications
- [ ] Requires EA URN input
- [ ] Confirms EA registration
- [ ] Updates status to 'ea_confirmed'
- [ ] Triggers member profile update automatically
- [ ] Shows success message about profile update

### Dashboard:
- [ ] Shows correct card based on member status
- [ ] Shows "closed" message when window closed
- [ ] Shows current fees when window open
- [ ] Updates when application submitted
- [ ] Shows application status correctly
- [ ] Shows renewal option when appropriate

### CSV Export:
- [ ] Exports correct fields in correct order
- [ ] Includes only 'ea_confirmed' applications
- [ ] Filters by membership year
- [ ] Downloads as proper CSV file
- [ ] Uses snapshot data from application

### Navigation:
- [ ] EA Membership menu visible to all users (members, LIRFs, admins)
- [ ] EA Applications menu visible only to admins
- [ ] Badge shows correct pending count

---

## Security Requirements

**ALL user inputs MUST be validated using:**
- `InputSanitizer.sanitizeFormData()` for form inputs
- `InputSanitizer.sanitizeText()` for text fields
- `SQLSecurityValidator.validateEmailForDB()` for emails
- `SQLSecurityValidator.validateDate()` for dates
- `SQLSecurityValidator.containsSQLInjection()` for all text fields
- `SecureQueryBuilder.validateUserQuery()` for UUIDs

**NO raw user input should ever go directly to the database.**

---

## Code Style Guidelines

- Follow existing patterns from `ProfileEditForm.tsx`, `MemberList.tsx`, `AdminService.ts`
- Use TypeScript interfaces for all data types
- Use React hooks (useState, useEffect, useContext) 
- Use existing CSS classes from `src/styles/`
- Add comments for complex logic
- Use try/catch for all async operations
- Log errors to console with descriptive messages
- Show user-friendly error messages (not raw errors)

---

## Files to Reference for Patterns

- **Form styling:** `src/modules/membership/components/ProfileEditForm.tsx`
- **Table styling:** `src/modules/admin/components/MemberList.tsx`
- **Service layer:** `src/modules/admin/services/adminService.ts`
- **Security validation:** `src/utils/sqlSecurityValidator.ts`, `src/utils/inputSanitizer.ts`
- **Modal components:** `src/modules/membership/components/MemberProfileModal.tsx`
- **Dashboard cards:** `src/modules/dashboard/components/DashboardContent.tsx`

---

## Additional Notes

### Fees Management:
The SQL migration needs to be updated to add fee columns to `ea_application_settings` table. Add this to the migration:

```sql
ALTER TABLE ea_application_settings
ADD COLUMN IF NOT EXISTS first_claim_fee DECIMAL(10,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS second_claim_fee DECIMAL(10,2) DEFAULT 12.00;
```

When members submit applications, the service should:
1. Query settings for current year
2. Get the appropriate fee based on membership_type selected
3. Set `membership_fee` in the application record

This ensures fees are always correctly recorded even if admin changes them later.
