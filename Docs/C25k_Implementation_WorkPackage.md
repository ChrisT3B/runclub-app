# Couch to 5k (C25k) Feature Implementation - Work Package

## Overview
Implement a Couch to 5k programme feature that allows admins to invite specific members as C25k participants, create C25k-specific runs, and filter run visibility based on participant status.

## Prerequisites
Database schema changes have been completed. The following columns exist:
- `members.is_c25k_participant` (BOOLEAN, DEFAULT FALSE)
- `pending_members.is_c25k_participant` (BOOLEAN, DEFAULT FALSE)
- `pending_invitations.is_c25k_participant` (BOOLEAN, DEFAULT FALSE)
- `scheduled_runs.is_c25k_run` (BOOLEAN, DEFAULT FALSE)

## Design Decisions (Confirmed)
1. **Run Visibility**: C25k participants see BOTH C25k runs AND regular runs
2. **Admin/LIRF Visibility**: Admins and LIRFs see ALL runs regardless of C25k flag
3. **Invitation System**: Dedicated C25k invitation page (separate from bulk invitations)
4. **C25k Status Management**: Both invitation-based AND manual toggle in member edit modal

---

## Step 2: Update TypeScript Interfaces

### Task 2.1: Update PendingInvitation Interface
**File**: `src/types/database.ts`

**Action**: Add the `is_c25k_participant` field to the `PendingInvitation` interface.

**Implementation**:
```typescript
export interface PendingInvitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'registered' | 'expired';
  invited_by: string | null;
  invited_at: string;
  registered_at: string | null;
  expires_at: string;
  invitation_sent: boolean;
  email_sent_at: string | null;
  guest_member_id: string | null;
  is_c25k_participant: boolean;  // ADD THIS LINE
  created_at: string;
  updated_at: string;
}
```

### Task 2.2: Update Member Interface
**File**: `src/modules/auth/types/index.ts`

**Action**: Add the `is_c25k_participant` field to the `Member` interface.

**Implementation**:
```typescript
export interface Member {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  access_level: 'member' | 'lirf' | 'admin';
  membership_status: 'pending' | 'active' | 'suspended';
  emergency_contact_name: string;
  emergency_contact_phone: string;
  health_conditions: string;
  email_notifications_enabled?: boolean;
  is_c25k_participant?: boolean;  // ADD THIS LINE
  created_at: string;
  updated_at: string;

  // EA Affiliation fields
  is_paid_member?: boolean;
  ea_urn?: string;
  ea_membership_type?: 'first_claim' | 'second_claim';
  ea_affiliation_year?: string;
  title?: string;
  date_of_birth?: string;
  sex_at_birth?: 'male' | 'female';
  address_postcode?: string;
  nationality?: string;
  emergency_contact_relationship?: string;
}
```

### Task 2.3: Update ScheduledRun Interfaces
**File**: `src/modules/admin/services/scheduledRunsService.ts`

**Action**: Add the `is_c25k_run` field to both `ScheduledRun` and `CreateScheduledRunData` interfaces.

**Implementation**:
```typescript
export interface ScheduledRun {
  id: string;
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  max_participants: number;
  run_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  description?: string;
  is_recurring: boolean;
  weekly_recurrences: number;
  end_date?: string;
  lirfs_required: number;
  assigned_lirf_1?: string;
  assigned_lirf_2?: string;
  assigned_lirf_3?: string;
  is_c25k_run?: boolean;  // ADD THIS LINE
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  bookings_count?: number;
}

export interface CreateScheduledRunData {
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  max_participants: number;
  description?: string;
  is_recurring: boolean;
  weekly_recurrences: number;
  end_date?: string;
  lirfs_required: number;
  assigned_lirf_1?: string;
  assigned_lirf_2?: string;
  assigned_lirf_3?: string;
  is_c25k_run?: boolean;  // ADD THIS LINE
  created_by: string;
  created_by_name?: string;
}
```

---

## Step 3: Update InvitationService to Handle C25k Flag

### Task 3.1: Add C25k Parameter to sendInvitation Method
**File**: `src/services/invitationService.ts`

**Action**: Modify the `sendInvitation` method to accept and store the `is_c25k_participant` flag.

**Changes Required**:

1. **Update method signature**:
```typescript
public static async sendInvitation(
  email: string,
  invitedById?: string,
  isC25kParticipant: boolean = false  // ADD THIS PARAMETER
): Promise<InvitationResult>
```

2. **Update the invitation insert to include the C25k flag**:

Find this section:
```typescript
const { data: invitation, error: createError } = await supabase
  .from('pending_invitations')
  .insert({
    email: cleanEmail,
    token,
    invited_by: invitedById || null,
    expires_at: expiresAt.toISOString(),
    status: 'pending'
  })
  .select()
  .single();
```

Change to:
```typescript
const { data: invitation, error: createError } = await supabase
  .from('pending_invitations')
  .insert({
    email: cleanEmail,
    token,
    invited_by: invitedById || null,
    expires_at: expiresAt.toISOString(),
    status: 'pending',
    is_c25k_participant: isC25kParticipant  // ADD THIS LINE
  })
  .select()
  .single();
```

3. **Update sendBulkInvitations method signature** to also accept the C25k flag:
```typescript
public static async sendBulkInvitations(
  emails: string[],
  invitedById?: string,
  isC25kParticipant: boolean = false,  // ADD THIS PARAMETER
  progressCallback?: (current: number, total: number, email: string, result: InvitationResult) => void
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{ email: string; result: InvitationResult }>;
}>
```

4. **Update the sendInvitation call inside sendBulkInvitations**:

Find:
```typescript
const result = await this.sendInvitation(email, invitedById);
```

Change to:
```typescript
const result = await this.sendInvitation(email, invitedById, isC25kParticipant);
```

---

## Step 4: Update Registration Flow to Carry C25k Flag

### Task 4.1: Update registerUser to Check Invitation and Carry C25k Flag
**File**: `src/modules/auth/services/authService.ts`

**Action**: Modify the `registerUser` function to check if the registration is from a C25k invitation and carry the flag to `pending_members`.

**Find this section** (around the beginning of the registerUser function):
```typescript
export const registerUser = async (registerData: RegistrationData, invitationToken?: string): Promise<AuthResponse> => {
  try {
    console.log('🔐 Starting registration with secure input sanitization');
```

**After the sanitization code and BEFORE the Supabase auth signup**, add this code to check the invitation:
```typescript
    // Check if this registration is from a C25k invitation
    let isC25kParticipant = false;
    if (invitationToken) {
      const { data: invitation } = await supabase
        .from('pending_invitations')
        .select('is_c25k_participant')
        .eq('token', invitationToken)
        .eq('status', 'pending')
        .single();
      
      if (invitation) {
        isC25kParticipant = invitation.is_c25k_participant || false;
        console.log('📋 C25k invitation detected:', isC25kParticipant);
      }
    }
```

**Find the pending member data section**:
```typescript
const pendingMemberData = {
  id: data.user.id,
  email: emailValidation.clean,
  full_name: sanitizedData.fullName,
  phone: sanitizedData.phone,
  emergency_contact_name: sanitizedData.emergencyContactName,
  emergency_contact_phone: sanitizedData.emergencyContactPhone,
  health_conditions: sanitizedData.healthConditions || 'None disclosed',
};
```

**Change to**:
```typescript
const pendingMemberData = {
  id: data.user.id,
  email: emailValidation.clean,
  full_name: sanitizedData.fullName,
  phone: sanitizedData.phone,
  emergency_contact_name: sanitizedData.emergencyContactName,
  emergency_contact_phone: sanitizedData.emergencyContactPhone,
  health_conditions: sanitizedData.healthConditions || 'None disclosed',
  is_c25k_participant: isC25kParticipant  // ADD THIS LINE
};
```

### Task 4.2: Update verifyEmail to Carry C25k Flag to Members Table
**File**: `src/modules/auth/services/authService.ts`

**Action**: Modify the `verifyEmail` function to carry the C25k flag from `pending_members` to `members`.

**Find this section** (inside the verifyEmail function where memberData is created):
```typescript
const memberData: Partial<Member> = {
  id: pendingMember.id,
  email: pendingMember.email,
  full_name: pendingMember.full_name,
  phone: pendingMember.phone || '',
  access_level: 'member',
  membership_status: 'active',
  emergency_contact_name: pendingMember.emergency_contact_name || '',
  emergency_contact_phone: pendingMember.emergency_contact_phone || '',
  health_conditions: pendingMember.health_conditions || 'None disclosed',
  email_notifications_enabled: true,
};
```

**Change to**:
```typescript
const memberData: Partial<Member> = {
  id: pendingMember.id,
  email: pendingMember.email,
  full_name: pendingMember.full_name,
  phone: pendingMember.phone || '',
  access_level: 'member',
  membership_status: 'active',
  emergency_contact_name: pendingMember.emergency_contact_name || '',
  emergency_contact_phone: pendingMember.emergency_contact_phone || '',
  health_conditions: pendingMember.health_conditions || 'None disclosed',
  email_notifications_enabled: true,
  is_c25k_participant: pendingMember.is_c25k_participant || false  // ADD THIS LINE
};
```

---

## Step 5: Create Dedicated C25k Invitation Page

### Task 5.1: Create New C25k Invitations Component
**File**: `src/modules/admin/pages/C25kInvitations.tsx` (NEW FILE)

**Action**: Create a dedicated page for sending C25k invitations.

**Full Implementation**:
```typescript
import React, { useState } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { InvitationService, InvitationResult } from '../../../services/invitationService';

interface C25kInvitationsProps {
  onNavigate?: (page: string) => void;
}

export const C25kInvitations: React.FC<C25kInvitationsProps> = ({ onNavigate }) => {
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Array<{ email: string; result: InvitationResult }>>([]);
  const [showResults, setShowResults] = useState(false);

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));
  };

  const handleSendInvitations = async () => {
    const emails = parseEmails(emailInput);
    if (emails.length === 0) {
      alert('Please enter at least one valid email address');
      return;
    }

    setSending(true);
    setProgress({ current: 0, total: emails.length });
    setResults([]);
    setShowResults(true);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      const result = await InvitationService.sendInvitation(email, undefined, true); // true = is_c25k_participant
      
      setProgress({ current: i + 1, total: emails.length });
      setResults(prev => [...prev, { email, result }]);
      
      // Rate limit: 1 per second
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setSending(false);
  };

  const handleClear = () => {
    setEmailInput('');
    setResults([]);
    setShowResults(false);
    setProgress({ current: 0, total: 0 });
  };

  const getResultIcon = (result: InvitationResult) => {
    if (!result.success) return '❌';
    switch (result.action) {
      case 'invitation_sent': return '✉️';
      case 'password_reset': return '🔑';
      case 'reminder_sent': return '🔔';
      default: return '✓';
    }
  };

  const getResultColor = (result: InvitationResult) => {
    if (!result.success) return '#dc2626';
    switch (result.action) {
      case 'invitation_sent': return '#059669';
      case 'password_reset': return '#2563eb';
      case 'reminder_sent': return '#d97706';
      default: return '#059669';
    }
  };

  return (
    <div>
      <PageHeader title="Couch to 5k Invitations" />
      
      <button
        onClick={() => onNavigate?.('admin-reports')}
        className="btn btn--secondary"
        style={{ marginBottom: '20px' }}
      >
        ← Back to Reports
      </button>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '8px' }}>Send C25k Programme Invitations</h3>
        <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
          Invited members will be automatically flagged as C25k participants. They will see both C25k-specific runs and regular club runs.
        </p>

        <textarea
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="Enter email addresses (one per line or comma-separated)&#10;&#10;Example:&#10;john.smith@example.com&#10;jane.doe@example.com"
          rows={10}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--gray-300)',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            marginBottom: '16px'
          }}
          disabled={sending}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSendInvitations}
            disabled={sending || emailInput.trim().length === 0}
            className="btn btn--primary"
          >
            {sending ? `Sending (${progress.current}/${progress.total})...` : 'Send C25k Invitations'}
          </button>

          {(results.length > 0 || emailInput.length > 0) && (
            <button
              onClick={handleClear}
              disabled={sending}
              className="btn btn--secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {showResults && results.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>
            Invitation Results ({results.length}/{progress.total})
          </h3>

          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid var(--gray-200)',
            borderRadius: '4px'
          }}>
            <table className="member-table">
              <thead className="member-table__header">
                <tr>
                  <th className="member-table__header-cell" style={{ width: '40px' }}>Status</th>
                  <th className="member-table__header-cell">Email</th>
                  <th className="member-table__header-cell">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index} className="member-table__row">
                    <td className="member-table__cell" style={{ textAlign: 'center', fontSize: '20px' }}>
                      {getResultIcon(item.result)}
                    </td>
                    <td className="member-table__cell" style={{ fontFamily: 'monospace' }}>
                      {item.email}
                    </td>
                    <td 
                      className="member-table__cell" 
                      style={{ color: getResultColor(item.result), fontWeight: '500' }}
                    >
                      {item.result.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'var(--gray-50)', 
            borderRadius: '4px',
            fontSize: '14px',
            color: 'var(--gray-600)'
          }}>
            <strong>Summary:</strong> {results.filter(r => r.result.success).length} successful, {results.filter(r => !r.result.success).length} failed
          </div>
        </div>
      )}
    </div>
  );
};

export default C25kInvitations;
```

---

## Step 6: Add C25k Navigation to Sidebar

### Task 6.1: Add C25k Link to Admin Navigation
**File**: `src/shared/components/navigation/Sidebar.tsx`

**Action**: Add a navigation item for C25k invitations in the admin section.

**Find the admin navigation section** (around line 50-60):
```typescript
// Add admin-only navigation using permissions
if (permissions.canManageMembers) {
  navigation.push(
    { id: 'members', name: 'Members', icon: '👥' },
    { id: 'ea-applications', name: 'EA Applications', icon: '📋', badge: pendingEACount },
    { id: 'test-lirf-reminder', name: 'Test LIRF Reminder', icon: '🧪' }
  )
}
```

**Change to**:
```typescript
// Add admin-only navigation using permissions
if (permissions.canManageMembers) {
  navigation.push(
    { id: 'members', name: 'Members', icon: '👥' },
    { id: 'ea-applications', name: 'EA Applications', icon: '📋', badge: pendingEACount },
    { id: 'c25k-invitations', name: 'C25k Invitations', icon: '🏃' },  // ADD THIS LINE
    { id: 'test-lirf-reminder', name: 'Test LIRF Reminder', icon: '🧪' }
  )
}
```

---

## Step 7: Add C25k Route to Main App

### Task 7.1: Add Route Handler for C25k Page
**File**: `src/App.tsx` (or wherever your main routing is handled)

**Action**: Add a route/case for the C25k invitations page.

**Find the navigation/routing switch statement** (look for where 'members', 'ea-applications' etc. are handled):

**Add this import at the top**:
```typescript
import C25kInvitations from './modules/admin/pages/C25kInvitations';
```

**Add this case** (in the same section as other admin pages):
```typescript
{currentPage === 'c25k-invitations' && <C25kInvitations onNavigate={navigateTo} />}
```

---

## Step 8: Add C25k Toggle to Member Edit Modal

### Task 8.1: Add C25k Checkbox to Member Edit Form
**File**: `src/modules/admin/components/MemberEditModal.tsx`

**Action**: Add a checkbox to allow admins to manually toggle C25k participant status.

**Find the formData state initialization** (around line 20):
```typescript
const [formData, setFormData] = useState({
  full_name: member.full_name || '',
  email: member.email || '',
  phone: member.phone || '',
  emergency_contact_name: member.emergency_contact_name || '',
  emergency_contact_phone: member.emergency_contact_phone || '',
  health_conditions: member.health_conditions || '',
  membership_status: member.membership_status || 'pending',
  access_level: member.access_level || 'member',
  dbs_expiry_date: member.dbs_expiry_date || '',
  email_notifications_enabled: member.email_notifications_enabled !== false
});
```

**Add the C25k field**:
```typescript
const [formData, setFormData] = useState({
  full_name: member.full_name || '',
  email: member.email || '',
  phone: member.phone || '',
  emergency_contact_name: member.emergency_contact_name || '',
  emergency_contact_phone: member.emergency_contact_phone || '',
  health_conditions: member.health_conditions || '',
  membership_status: member.membership_status || 'pending',
  access_level: member.access_level || 'member',
  dbs_expiry_date: member.dbs_expiry_date || '',
  email_notifications_enabled: member.email_notifications_enabled !== false,
  is_c25k_participant: member.is_c25k_participant || false  // ADD THIS LINE
});
```

**Find the form JSX** (look for the email_notifications_enabled checkbox section):

**Add this checkbox after the email notifications checkbox**:
```typescript
{/* C25k Participant Status */}
<div className="form-group">
  <label className="checkbox-label">
    <input
      type="checkbox"
      name="is_c25k_participant"
      checked={formData.is_c25k_participant}
      onChange={handleInputChange}
      style={{ marginRight: '8px' }}
    />
    Couch to 5k Participant
  </label>
  <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', marginLeft: '24px' }}>
    C25k participants see both C25k-specific runs and regular club runs
  </p>
</div>
```

---

## Step 9: Add C25k Checkbox to Run Creation/Edit Forms

### Task 9.1: Add C25k Checkbox to ManageScheduledRuns Component
**File**: Find the component that handles run creation/editing (likely `src/modules/admin/pages/ManageScheduledRuns.tsx` or similar)

**Action**: Add a checkbox to mark a run as a C25k run.

**In the run form state**, add:
```typescript
is_c25k_run: false  // or from existing run if editing
```

**In the form JSX**, add this checkbox (likely near other run metadata fields):
```typescript
<div className="form-group">
  <label className="checkbox-label">
    <input
      type="checkbox"
      name="is_c25k_run"
      checked={formData.is_c25k_run || false}
      onChange={handleInputChange}
      style={{ marginRight: '8px' }}
    />
    This is a Couch to 5k Run
  </label>
  <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', marginLeft: '24px' }}>
    C25k runs are visible to C25k participants and all other members
  </p>
</div>
```

**When submitting the form**, ensure `is_c25k_run` is included in the data sent to `ScheduledRunsService.createScheduledRun()`.

---

## Step 10: Implement Run Visibility Filtering

### Task 10.1: Update Run Listing Query to Filter Based on C25k Status
**File**: Find where scheduled runs are fetched for display to members (likely in a service or component that lists runs)

**Action**: Implement the filtering logic:
- Regular members (non-C25k): See only regular runs (is_c25k_run = false)
- C25k participants: See ALL runs (both C25k and regular)
- LIRFs/Admins: See ALL runs (regardless of flag)

**Example implementation pattern**:

```typescript
// In the service/component that fetches runs for display
const fetchVisibleRuns = async (currentMember: Member) => {
  let query = supabase
    .from('scheduled_runs')
    .select('*')
    .gte('run_date', new Date().toISOString().split('T')[0])
    .order('run_date', { ascending: true });

  // Apply C25k filtering based on member status
  // Admins and LIRFs see everything, no filter needed
  if (currentMember.access_level === 'member') {
    if (currentMember.is_c25k_participant) {
      // C25k participants see ALL runs - no filter needed
    } else {
      // Regular members only see non-C25k runs
      query = query.eq('is_c25k_run', false);
    }
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data;
};
```

**Find the location where runs are fetched for the member dashboard/run listing page and apply this filtering logic.**

---

## Step 11: Add Visual Indicators for C25k Runs

### Task 11.1: Add C25k Badge to Run Display Components
**File**: Components that display runs to users (run cards, run lists, etc.)

**Action**: Add a visual badge/indicator when a run is marked as a C25k run.

**Example implementation**:

```typescript
{run.is_c25k_run && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    marginLeft: '8px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  }}>
    C25K
  </span>
)}
```

**Add this badge next to run titles in:**
- Scheduled runs list
- Run detail views
- Run booking interface
- LIRF run management views

---

## Step 12: Add C25k Indicator to Member List

### Task 12.1: Add C25k Column/Badge to Member List
**File**: `src/modules/admin/components/MemberList.tsx`

**Action**: Add a visual indicator showing which members are C25k participants.

**In the member table header**, add:
```typescript
<th className="member-table__header-cell">C25k</th>
```

**In the member table body**, add:
```typescript
<td className="member-table__cell">
  {member.is_c25k_participant ? (
    <span style={{
      display: 'inline-block',
      padding: '4px 8px',
      background: '#dbeafe',
      color: '#1e40af',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600'
    }}>
      ✓ C25K
    </span>
  ) : (
    <span style={{ color: 'var(--gray-400)', fontSize: '11px' }}>—</span>
  )}
</td>
```

---

## Testing Checklist

After implementation, test the following scenarios:

### Invitation Flow
- [ ] Create a C25k invitation via the dedicated C25k page
- [ ] Verify invitation is created with `is_c25k_participant = true`
- [ ] Register a new member using the C25k invitation link
- [ ] Verify `pending_members` record has `is_c25k_participant = true`
- [ ] Complete email verification
- [ ] Verify `members` record has `is_c25k_participant = true`

### Manual Toggle
- [ ] Edit an existing member and toggle C25k status on
- [ ] Save and verify database is updated
- [ ] Toggle C25k status off
- [ ] Verify database is updated

### Run Creation
- [ ] Create a new run and mark it as "C25k Run"
- [ ] Verify `scheduled_runs` record has `is_c25k_run = true`
- [ ] Edit the run and uncheck "C25k Run"
- [ ] Verify database is updated

### Run Visibility
- [ ] Login as regular member (non-C25k): Should only see regular runs
- [ ] Login as C25k participant: Should see BOTH C25k and regular runs
- [ ] Login as LIRF: Should see ALL runs
- [ ] Login as Admin: Should see ALL runs

### Visual Indicators
- [ ] C25k runs show badge in run listings
- [ ] C25k members show indicator in member list
- [ ] Member edit modal shows C25k checkbox
- [ ] Run creation form shows C25k checkbox

### Navigation
- [ ] C25k Invitations link appears in admin sidebar
- [ ] Link navigates to C25k invitations page
- [ ] Back button returns to reports page

---

## Notes for Implementation

1. **Preserve existing functionality**: Do not remove or modify any existing code except where explicitly specified in this work package.

2. **Error handling**: Maintain existing error handling patterns. Log C25k-related errors with prefix `🏃 C25k:` for easy identification.

3. **Database queries**: All database queries should handle the case where `is_c25k_participant` or `is_c25k_run` may be null/undefined by treating them as false.

4. **Backwards compatibility**: Existing members without the C25k flag should function exactly as before (treated as non-C25k participants).

5. **Security**: Ensure only admins can access the C25k invitations page and toggle C25k status in member edit.

6. **UI consistency**: Match existing UI patterns for badges, checkboxes, and form layouts.

---

## Success Criteria

Implementation is complete when:
1. Admins can send C25k invitations via dedicated page
2. New C25k members are automatically flagged through registration flow
3. Admins can manually toggle C25k status on existing members
4. LIRFs can create C25k-specific runs
5. Run visibility filtering works correctly for all user types
6. Visual indicators clearly show C25k runs and participants
7. All tests in the testing checklist pass

---

## Estimated Complexity
- **Time estimate**: 2-3 hours
- **Risk level**: Low (additive feature, minimal changes to existing code)
- **Dependencies**: Database schema changes must be completed first
