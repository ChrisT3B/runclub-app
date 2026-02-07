# Invitation System - Critical Bug Fixes

## Overview
Two critical bugs have been identified in the invitation system that need immediate fixing:

1. **Guest Member Email Bug** - Guest members are being created with real emails instead of temp emails, blocking future invitations
2. **Registration Routing Bug** - Invitation links route to login page instead of registration page

---

## Bug Fix 1: Guest Member Email Handling

### Problem
When adding a guest member with the "send invitation" checkbox enabled, the system is storing the real email address in the members table as a guest record. This causes the invitation system to think the person is "already registered" and sends a password reset instead of an invitation.

### Root Cause
In `src/modules/activeruns/components/RunAttendance.tsx`, the `addManualRunner` function uses the real email for the guest member record when it should ALWAYS use a temp email. The real email should only be used for sending the invitation.

### Solution
Guest member records must ALWAYS use temporary emails (`temp-{timestamp}@runalcester.temp`), regardless of whether an invitation is being sent. The real email is stored only in the `pending_invitations` table.

### File to Modify: `src/modules/activeruns/components/RunAttendance.tsx`

**Find the `addManualRunner` function and replace the entire function with this corrected version:**

```typescript
const addManualRunner = async () => {
  if (!manualRunner.full_name || !state.user?.id) return;

  try {
    setSaving('adding-manual');
    setError('');

    // Validate email if sending invitation
    if (sendInvitationToGuest && !guestEmail) {
      setError('Email is required to send invitation');
      setSaving(null);
      return;
    }

    // CRITICAL FIX: ALWAYS use temp email for guest member record
    // Real email is ONLY used for the invitation, not the member record
    const tempEmail = `temp-${Date.now()}@runalcester.temp`;

    // Create a temporary member record for the manual runner
    const tempMember = {
      full_name: manualRunner.full_name,
      email: tempEmail, // ← ALWAYS temp email (never real email)
      phone: manualRunner.phone || null,
      emergency_contact_name: manualRunner.emergency_contact_name || null,
      emergency_contact_phone: manualRunner.emergency_contact_phone || null,
      health_conditions: manualRunner.health_conditions || null,
      membership_status: 'guest',
      is_temp_runner: true,
      date_joined: new Date().toISOString().split('T')[0]
    };

    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert([tempMember])
      .select()
      .single();

    if (memberError) {
      console.error('Member creation error:', memberError);
      throw memberError;
    }

    // Add attendance record
    const attendanceData = {
      run_id: runId,
      member_id: newMember.id,
      marked_present: true,
      marked_at: new Date().toISOString(),
      marked_by: state.user.id,
      is_manual_addition: true
    };

    const { error: attendanceError } = await supabase
      .from('run_attendance')
      .insert([attendanceData]);
    
    if (attendanceError) {
      console.error('Attendance creation error:', attendanceError);
      throw attendanceError;
    }

    // Send invitation if requested (using REAL email for invitation only)
    if (sendInvitationToGuest && guestEmail) {
      try {
        const invitationResult = await InvitationService.sendInvitation(
          guestEmail, // ← Real email used here for invitation
          state.user.id
        );
        
        if (invitationResult.success) {
          // Link invitation to guest member
          if (invitationResult.invitationId) {
            await supabase
              .from('pending_invitations')
              .update({ guest_member_id: newMember.id })
              .eq('id', invitationResult.invitationId);
          }
          
          alert(`${manualRunner.full_name} added as guest! ${invitationResult.message}`);
        } else {
          alert(`${manualRunner.full_name} added as guest, but invitation failed: ${invitationResult.message}`);
        }
      } catch (invError) {
        console.error('Invitation error:', invError);
        alert(`${manualRunner.full_name} added as guest, but invitation sending failed.`);
      }
    } else {
      alert(`${manualRunner.full_name} added as guest member!`);
    }

    // Reload data
    await loadRunData();
    
    // Reset form
    setManualRunner({
      full_name: '',
      phone: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      health_conditions: ''
    });
    setGuestEmail('');
    setSendInvitationToGuest(false);
    setShowAddRunner(false);

  } catch (err: any) {
    console.error('Failed to add manual runner:', err);
    setError(err.message || 'Failed to add runner');
  } finally {
    setSaving(null);
  }
};
```

**Key Change:**
- Line where `emailToUse` was conditionally set has been removed
- Guest member ALWAYS uses `tempEmail` constant
- Real email (`guestEmail`) is ONLY passed to `InvitationService.sendInvitation()`

---

## Bug Fix 2: Registration Routing

### Problem
Invitation links are formatted correctly (`https://app.runalcester.co.uk/register?token=xxx`), but when users click them, they are routed to the login page instead of the registration page.

### Root Cause
The app uses state-based routing (not URL-based routing). The `AuthContent` component defaults to showing the login view and doesn't check for:
1. URL query parameters (`?token=xxx`)
2. URL path (`/register`)
3. URL hash (`#register`)

### Solution
Update `AuthContent` to detect invitation tokens and registration paths, then default to showing the registration form instead of login.

### File to Modify: `src/modules/auth/components/AuthContent.tsx`

**Step 1: Add imports at the top of the file:**

```typescript
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
```

**Step 2: Find the component's state initialization and replace it with this:**

Look for the line that says:
```typescript
const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
```

Replace the ENTIRE state initialization section with:

```typescript
// Detect invitation token or registration intent from URL
const [searchParams] = useSearchParams();
const invitationToken = searchParams.get('token');

// Check multiple places for registration intent
const isRegisterPath = window.location.pathname.includes('/register');
const isRegisterHash = window.location.hash.includes('register');
const hasInvitationToken = !!invitationToken;

// Determine initial view based on URL
const determineInitialView = (): 'login' | 'register' | 'forgot' | 'reset' => {
  // Check for password reset flow first
  const urlParams = new URLSearchParams(window.location.search);
  const urlHash = window.location.hash;
  const hasRecoveryParam = urlParams.get('type') === 'recovery';
  const hasRecoveryHash = urlHash.includes('access_token') && urlHash.includes('type=recovery');
  const isResetPath = window.location.pathname === '/reset-password';
  
  if (hasRecoveryParam || hasRecoveryHash || isResetPath) {
    return 'reset';
  }
  
  // Check for registration intent (invitation token or /register path)
  if (hasInvitationToken || isRegisterPath || isRegisterHash) {
    console.log('🔗 Invitation detected - showing registration form', {
      hasInvitationToken,
      isRegisterPath,
      isRegisterHash,
      token: invitationToken
    });
    return 'register';
  }
  
  // Default to login
  return 'login';
};

const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset'>(determineInitialView());

// Re-check if URL changes (e.g., user clicks invitation link while already on auth page)
useEffect(() => {
  const newView = determineInitialView();
  if (newView !== currentView) {
    console.log('🔄 URL changed, updating view to:', newView);
    setCurrentView(newView);
  }
}, [searchParams, window.location.pathname, window.location.hash]);
```

**Step 3: Verify the RegisterForm is receiving the token**

The `RegisterForm` component should already be checking for the token via `useSearchParams`. No changes needed there - it will automatically pick up the token from the URL.

---

## Additional Safety Fix: Exclude Guest Members from Invitation Check

### File to Modify: `src/services/invitationService.ts`

**Find the `checkExistingUser` method and update it to exclude guest members:**

Locate this section:
```typescript
// Check members table
const { data: memberData } = await supabase
  .from('members')
  .select('id, email')
  .eq('email', cleanEmail)
  .maybeSingle();
```

**Replace with:**

```typescript
// Check members table - EXCLUDE guest members and temp runners
const { data: memberData } = await supabase
  .from('members')
  .select('id, email, membership_status, is_temp_runner')
  .eq('email', cleanEmail)
  .maybeSingle();

// Only count as "existing member" if they're a real member (not a guest)
const isRealMember = memberData && 
                     memberData.membership_status !== 'guest' && 
                     !memberData.is_temp_runner &&
                     !memberData.email?.includes('temp-') &&
                     !memberData.email?.includes('@runalcester.temp');
```

**Then update the return statement at the bottom of the function:**

Change from:
```typescript
return {
  existsInMembers: !!memberData,
  existsInPending: !!pendingData,
  hasInvitation: !!invitationData,
  invitationData
};
```

To:
```typescript
return {
  existsInMembers: isRealMember, // ← Changed from !!memberData
  existsInPending: !!pendingData,
  hasInvitation: !!invitationData,
  invitationData
};
```

---

## Testing Instructions

### Test 1: Guest Member Invitation
1. Navigate to "Lead Your Run" page
2. Select a run and click "Manage Attendance"
3. Click "Add Runner" → "New Runner"
4. Fill in guest name (e.g., "Test Guest")
5. Check the "Send registration invitation" box
6. Enter a real email address
7. Submit the form
8. **Expected Result:** 
   - Guest member created with `temp-{timestamp}@runalcester.temp` email
   - Invitation sent to the real email address
   - If you try to invite the same email again, should create NEW invitation (not password reset)

### Test 2: Registration Routing
1. Copy an invitation link from the bulk invite results or admin dashboard
2. Paste it into a new incognito/private browser window
3. **Expected Result:**
   - Should land on the REGISTRATION page (not login page)
   - Email field should be pre-filled and disabled
   - Green banner should show "Valid Invitation"

### Test 3: Verify Guest Members Don't Block Invitations
1. Add a guest member WITHOUT sending invitation (checkbox unchecked)
2. Note the guest's name
3. Go to sidebar → "Send Invitation"
4. Enter any email address
5. **Expected Result:**
   - Should create new invitation successfully
   - Should NOT trigger "already registered" logic

---

## Verification Queries

Run these in Supabase SQL Editor to verify the fixes:

```sql
-- 1. Check that guest members have temp emails
SELECT id, full_name, email, membership_status, is_temp_runner
FROM members
WHERE membership_status = 'guest'
  OR is_temp_runner = true
ORDER BY created_at DESC
LIMIT 10;

-- Expected: All guest members should have email like 'temp-{timestamp}@runalcester.temp'

-- 2. Check pending invitations are properly created
SELECT id, email, status, created_at, guest_member_id
FROM pending_invitations
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should see invitations with real emails, some linked to guest_member_id

-- 3. Verify no guest members with real emails exist
SELECT id, full_name, email, membership_status, is_temp_runner
FROM members
WHERE (membership_status = 'guest' OR is_temp_runner = true)
  AND email NOT LIKE 'temp-%'
  AND email NOT LIKE '%@runalcester.temp';

-- Expected: Should return 0 rows (no guest members with real emails)
```

---

## Summary of Changes

### Files Modified:
1. `src/modules/activeruns/components/RunAttendance.tsx`
   - Fixed `addManualRunner` function to always use temp email for guest records
   
2. `src/modules/auth/components/AuthContent.tsx`
   - Added token detection logic
   - Set initial view to 'register' when invitation token present
   
3. `src/services/invitationService.ts`
   - Updated `checkExistingUser` to exclude guest members from "already registered" check

### Expected Behavior After Fixes:
- ✅ Guest members always created with temp emails
- ✅ Real emails only stored in `pending_invitations` table
- ✅ Invitation links route to registration page
- ✅ Guest members don't block future invitations to the same email
- ✅ System can track which guest members were sent invitations via `guest_member_id` link

---

End of bug fix instructions.
