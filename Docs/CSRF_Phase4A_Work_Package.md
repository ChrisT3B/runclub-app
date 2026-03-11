# CSRF Protection - Phase 4A: Protect Update Profile & Book Run

## Overview
This is Phase 4A for implementing CSRF protection. This phase protects the **two most critical operations** from a data protection and user impact perspective.

**Estimated Time:** 1-2 days  
**Risk Level:** MEDIUM (affects real user data)  
**Prerequisites:** Phase 1 ✅, Phase 2 ✅, Phase 3 ✅ complete and tested

---

## What Phase 4A Protects

### **Priority 1: Update Profile (CRITICAL - Personal Data)**
**Why critical:**
- Modifies personal identifiable information (PII)
- GDPR compliance issue if compromised
- Could lock users out (email change)
- Safety risk (emergency contact modification)
- Identity theft potential

**Attack impact:**
- Malicious site changes user's email → user locked out
- Changes phone number → breaks emergency contact
- Modifies name/address → privacy violation

---

### **Priority 2: Book Run (HIGH - User Impact)**
**Why critical:**
- Affects all members (~70 users)
- Could fill capacity and deny legitimate bookings
- Creates confusion and poor user experience
- High visibility issue

**Attack impact:**
- Malicious site books runs on behalf of user
- Fills limited capacity spots
- Creates false attendance expectations

---

## Part 1: Protect Update Profile Operation

### Step 1: Identify Update Profile Service Location

**Find where profile updates happen.** Common locations:
- `src/modules/profile/services/profileService.ts`
- `src/services/memberService.ts`
- `src/modules/auth/services/authService.ts`

**Search your codebase for:**
```typescript
// Look for profile update functions
.update({ ... })
.eq('id', userId)
// On the members table
```

**Action:** Locate the function that updates member profiles and note the file path.

---

### Step 2: Add CSRF Validation to Update Profile Service

**File:** `[YOUR_PROFILE_SERVICE_FILE]` (e.g., `src/services/memberService.ts`)

**Find the update profile function.** It might look like:

```typescript
export const updateMemberProfile = async (
  userId: string,
  updates: Partial<Member>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
```

**Add CSRF protection:**

```typescript
// ADD THESE IMPORTS at the top of the file
import { validateCsrfToken, getCsrfToken } from '../utils/csrfProtection';

// UPDATED FUNCTION with CSRF protection
export const updateMemberProfile = async (
  userId: string,
  updates: Partial<Member>
): Promise<void> => {
  try {
    // ========== EXISTING VALIDATION (if any) ==========
    // Your existing validation code here
    
    // ========== NEW: CSRF VALIDATION ==========
    console.log('🔒 Validating CSRF token for profile update...');
    
    // Get CSRF token from sessionStorage
    const csrfToken = getCsrfToken();
    
    if (!csrfToken) {
      console.error('❌ CSRF validation failed: No token found');
      throw new Error('CSRF_TOKEN_MISSING');
    }

    // Validate CSRF token
    const validation = await validateCsrfToken(csrfToken, userId);
    
    if (!validation.isValid) {
      console.error('❌ CSRF validation failed:', validation.error);
      throw new Error('CSRF_VALIDATION_FAILED');
    }

    console.log('✅ CSRF token validated - proceeding with profile update');
    // ========== END: CSRF VALIDATION ==========

    // Existing update code
    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    console.log('✅ Profile updated successfully');
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};
```

**Verification:**
- Import added successfully
- Function signature unchanged
- CSRF validation added before update
- Error thrown with `CSRF_` prefix

---

### Step 3: Update Profile Component Error Handling

**Find the profile update component.** Common locations:
- `src/modules/profile/components/ProfileEdit.tsx`
- `src/components/MemberProfile.tsx`

**Search for where `updateMemberProfile` is called.**

**Find the update handler:**

```typescript
const handleUpdateProfile = async (formData) => {
  try {
    await updateMemberProfile(userId, formData);
    toast.success('Profile updated successfully');
  } catch (error) {
    console.error('Error updating profile:', error);
    toast.error(error.message || 'Failed to update profile');
  }
};
```

**Add CSRF-aware error handling:**

```typescript
const handleUpdateProfile = async (formData) => {
  try {
    await updateMemberProfile(userId, formData);
    toast.success('Profile updated successfully');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // ========== NEW: CSRF ERROR HANDLING ==========
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if this is a CSRF error
    if (errorMessage.includes('CSRF_TOKEN_MISSING') || 
        errorMessage.includes('CSRF_VALIDATION_FAILED')) {
      
      console.log('🔒 CSRF validation failed - logging out user');
      
      // Show user-friendly error
      toast.error('Your session has expired. Please log in again.');
      
      // Force logout using auth context (assuming you have useAuth)
      await logout();
      
      // Auth context will redirect to login automatically
      return;
    }
    // ========== END: CSRF ERROR HANDLING ==========
    
    // Show generic error for non-CSRF failures
    toast.error(errorMessage || 'Failed to update profile');
  }
};
```

**Key Changes:**
1. Detect CSRF-specific errors
2. Show user-friendly message
3. Call existing `logout()` from auth context
4. Let auth system handle redirect

**Verification:**
- Error detection works
- Logout function called correctly
- Generic errors still show normally

---

### Step 4: Test Update Profile Protection

**Test 1: Valid Token ✅**
1. Log in to the app
2. Go to profile/settings page
3. Update your phone number or name
4. Click save

**Expected:**
```
🔒 Validating CSRF token for profile update...
✅ CSRF token validated successfully for user: [user-id]
✅ CSRF token validated - proceeding with profile update
✅ Profile updated successfully
```

**Result:** Profile updated, no errors

---

**Test 2: Missing Token ❌**
1. While logged in, open console
2. Clear CSRF token: `sessionStorage.removeItem('csrf_token')`
3. Try to update profile

**Expected:**
```
🔒 Validating CSRF token for profile update...
❌ CSRF validation failed: No token found
Error: CSRF_TOKEN_MISSING
🔒 CSRF validation failed - logging out user
```

**Result:** Update blocked, logged out, login screen shown

---

**Test 3: Invalid Token ❌**
1. While logged in, open console
2. Set invalid token: `sessionStorage.setItem('csrf_token', 'invalid-123')`
3. Try to update profile

**Expected:**
```
🔒 Validating CSRF token for profile update...
⚠️ CSRF validation failed: Invalid token format
❌ CSRF validation failed: Invalid security token format...
Error: CSRF_VALIDATION_FAILED
🔒 CSRF validation failed - logging out user
```

**Result:** Update blocked, logged out, login screen shown

---

## Part 2: Protect Book Run Operation

### Step 5: Identify Book Run Service Location

**Find where run booking happens.** Common locations:
- `src/modules/booking/services/bookingService.ts`
- `src/services/runBookingService.ts`

**Search your codebase for:**
```typescript
// Look for booking functions
.insert([{
  run_id: ...,
  member_id: ...,
  booking_status: 'confirmed'
}])
// On the run_bookings table
```

**Action:** Locate the function that creates bookings and note the file path.

---

### Step 6: Add CSRF Validation to Book Run Service

**File:** `[YOUR_BOOKING_SERVICE_FILE]` (e.g., `src/services/runBookingService.ts`)

**Find the book run function.** It might look like:

```typescript
export const bookRun = async (
  runId: string,
  memberId: string
): Promise<void> => {
  try {
    // Check capacity
    const hasCapacity = await checkRunCapacity(runId);
    if (!hasCapacity) {
      throw new Error('Run is full');
    }

    // Create booking
    const { error } = await supabase
      .from('run_bookings')
      .insert([{
        run_id: runId,
        member_id: memberId,
        booking_status: 'confirmed',
        booked_at: new Date().toISOString()
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error booking run:', error);
    throw error;
  }
};
```

**Add CSRF protection:**

```typescript
// ADD THESE IMPORTS at the top of the file
import { validateCsrfToken, getCsrfToken } from '../utils/csrfProtection';

// UPDATED FUNCTION with CSRF protection
export const bookRun = async (
  runId: string,
  memberId: string
): Promise<void> => {
  try {
    // ========== EXISTING VALIDATION ==========
    // Input validation
    if (!SQLSecurityValidator.isValidUUID(runId)) {
      throw new Error('Invalid run ID format');
    }

    if (!SQLSecurityValidator.isValidUUID(memberId)) {
      throw new Error('Invalid member ID format');
    }

    // ========== NEW: CSRF VALIDATION ==========
    console.log('🔒 Validating CSRF token for run booking...');
    
    // Get CSRF token from sessionStorage
    const csrfToken = getCsrfToken();
    
    if (!csrfToken) {
      console.error('❌ CSRF validation failed: No token found');
      throw new Error('CSRF_TOKEN_MISSING');
    }

    // Validate CSRF token
    const validation = await validateCsrfToken(csrfToken, memberId);
    
    if (!validation.isValid) {
      console.error('❌ CSRF validation failed:', validation.error);
      throw new Error('CSRF_VALIDATION_FAILED');
    }

    console.log('✅ CSRF token validated - proceeding with booking');
    // ========== END: CSRF VALIDATION ==========

    // Check capacity (existing code)
    const hasCapacity = await checkRunCapacity(runId);
    if (!hasCapacity) {
      throw new Error('Run is full');
    }

    // Create booking (existing code)
    const { error } = await supabase
      .from('run_bookings')
      .insert([{
        run_id: runId,
        member_id: memberId,
        booking_status: 'confirmed',
        booked_at: new Date().toISOString()
      }]);

    if (error) throw error;

    console.log('✅ Run booked successfully');
  } catch (error) {
    console.error('❌ Error booking run:', error);
    throw error;
  }
};
```

**Key Changes:**
1. Import CSRF utilities
2. Validate token before capacity check
3. Throw CSRF-specific errors
4. Log validation steps

**Verification:**
- Import added successfully
- Function signature unchanged
- CSRF validation added early in function

---

### Step 7: Update Book Run Component Error Handling

**Find the booking component.** Common locations:
- `src/modules/booking/components/BookRun.tsx`
- `src/components/RunCard.tsx` (if booking from run list)
- `src/modules/runs/components/ViewScheduledRuns.tsx`

**Search for where `bookRun` is called.**

**Find the booking handler:**

```typescript
const handleBookRun = async (runId: string) => {
  try {
    await bookRun(runId, userId);
    toast.success('Run booked successfully');
    refetch(); // Refresh run list
  } catch (error) {
    console.error('Error booking run:', error);
    toast.error(error.message || 'Failed to book run');
  }
};
```

**Add CSRF-aware error handling:**

```typescript
const handleBookRun = async (runId: string) => {
  try {
    await bookRun(runId, userId);
    toast.success('Run booked successfully');
    refetch(); // Refresh run list
    
  } catch (error) {
    console.error('Error booking run:', error);
    
    // ========== NEW: CSRF ERROR HANDLING ==========
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if this is a CSRF error
    if (errorMessage.includes('CSRF_TOKEN_MISSING') || 
        errorMessage.includes('CSRF_VALIDATION_FAILED')) {
      
      console.log('🔒 CSRF validation failed - logging out user');
      
      // Show user-friendly error
      toast.error('Your session has expired. Please log in again.');
      
      // Force logout using auth context
      await logout();
      
      return; // Exit early - don't show generic error
    }
    // ========== END: CSRF ERROR HANDLING ==========
    
    // Show generic error for non-CSRF failures
    toast.error(errorMessage || 'Failed to book run');
  }
};
```

**Key Changes:**
1. Detect CSRF-specific errors
2. Show user-friendly message
3. Call existing `logout()` from auth context
4. Let auth system handle redirect

**Verification:**
- Error detection works
- Logout function called correctly
- Generic errors still show normally

---

### Step 8: Test Book Run Protection

**Test 1: Valid Token ✅**
1. Log in to the app
2. Navigate to view runs page
3. Find a run with available capacity
4. Click "Book Run"

**Expected:**
```
🔒 Validating CSRF token for run booking...
✅ CSRF token validated successfully for user: [user-id]
✅ CSRF token validated - proceeding with booking
✅ Run booked successfully
```

**Result:** Run booked, appears in "My Bookings"

---

**Test 2: Missing Token ❌**
1. While logged in, open console
2. Clear CSRF token: `sessionStorage.removeItem('csrf_token')`
3. Try to book a run

**Expected:**
```
🔒 Validating CSRF token for run booking...
❌ CSRF validation failed: No token found
Error: CSRF_TOKEN_MISSING
🔒 CSRF validation failed - logging out user
```

**Result:** Booking blocked, logged out, login screen shown

---

**Test 3: Invalid Token ❌**
1. While logged in, open console
2. Set invalid token: `sessionStorage.setItem('csrf_token', 'invalid-123')`
3. Try to book a run

**Expected:**
```
🔒 Validating CSRF token for run booking...
⚠️ CSRF validation failed: Invalid token format
❌ CSRF validation failed: Invalid security token format...
Error: CSRF_VALIDATION_FAILED
🔒 CSRF validation failed - logging out user
```

**Result:** Booking blocked, logged out, login screen shown

---

**Test 4: Full Capacity (Non-CSRF Error) ✅**
1. Log in with valid token
2. Try to book a run that's already full

**Expected:**
```
🔒 Validating CSRF token for run booking...
✅ CSRF token validated - proceeding with booking
❌ Error booking run: Run is full
```

**Result:** Shows "Run is full" error (NOT logged out - this is a legitimate error, not CSRF)

---

## Step 9: Commit Changes

### Git Commands

```bash
# Stage changes
git add src/[PROFILE_SERVICE_FILE]
git add src/[PROFILE_COMPONENT_FILE]
git add src/[BOOKING_SERVICE_FILE]
git add src/[BOOKING_COMPONENT_FILE]

# Commit
git commit -m "feat: protect Update Profile and Book Run with CSRF validation (Phase 4A)

- Add CSRF validation to updateMemberProfile service
- Add CSRF validation to bookRun service
- Force re-login on CSRF validation failure
- Add user-friendly error messages for CSRF failures
- Protect critical personal data modification
- Protect run booking from CSRF attacks

Part of CSRF protection implementation (Phase 4A/5)"

# Push
git push origin master
```

---

## Success Criteria

Phase 4A is complete when:

- ✅ Update Profile protected with CSRF validation
- ✅ Book Run protected with CSRF validation
- ✅ All 8 tests pass (4 per operation)
- ✅ Valid tokens allow operations
- ✅ Invalid/missing tokens block operations and force re-login
- ✅ Non-CSRF errors still work normally
- ✅ No regressions in existing functionality

---

## Security Score Impact

After Phase 4A completion:

**Before Phase 4A:**
- Score: 82/100
- Protected: Delete Run

**After Phase 4A:**
- Score: **~86/100** (+4 points)
- Protected: Delete Run, Update Profile, Book Run

**Remaining to reach 88/100 (optional Phase 4B):**
- Cancel Booking
- Create Run
- Mark Attendance

---

## Troubleshooting

### Issue 1: Profile update fails even with valid token

**Debug:**
```javascript
// In console
const token = sessionStorage.getItem('csrf_token');
console.log('Token:', token);
console.log('User ID:', window.TEST_USER_ID);
```

**Check database:**
```sql
SELECT csrf_token, user_id 
FROM active_sessions 
WHERE user_id = 'YOUR_USER_ID';
```

**Solution:** If token doesn't match database, log out and log in again

---

### Issue 2: Can't find profile update service file

**Search your codebase:**
```bash
# Search for profile update code
grep -r "update.*members" src/
grep -r "updateProfile" src/
grep -r ".update({" src/ | grep -i "member"
```

**Common locations:**
- `src/services/memberService.ts`
- `src/modules/profile/services/`
- `src/modules/auth/services/`

---

### Issue 3: Can't find booking service file

**Search your codebase:**
```bash
# Search for booking code
grep -r "run_bookings" src/
grep -r "bookRun" src/
grep -r ".insert.*booking" src/
```

**Common locations:**
- `src/services/bookingService.ts`
- `src/modules/booking/services/`
- `src/modules/runs/services/`

---

### Issue 4: Multiple profile update functions

**If you have multiple update functions:**
- Update profile details (`updateMemberProfile`)
- Update emergency contact (`updateEmergencyContact`)
- Update preferences (`updatePreferences`)

**Protect ALL of them** with the same CSRF pattern shown above.

---

### Issue 5: Booking through different flows

**If booking happens in multiple places:**
- Book from run list
- Book from run details page
- Book recurring series

**All should call the same `bookRun` service** - protect that single service function.

---

## Rollback Plan

If Phase 4A breaks critical functionality:

### Option A: Disable CSRF for specific operation
```typescript
// In the service file, comment out CSRF validation temporarily
/*
const csrfToken = getCsrfToken();
if (!csrfToken) { throw new Error('CSRF_TOKEN_MISSING'); }
const validation = await validateCsrfToken(csrfToken, userId);
if (!validation.isValid) { throw new Error('CSRF_VALIDATION_FAILED'); }
*/
console.log('⚠️ CSRF validation temporarily disabled');
```

### Option B: Git revert
```bash
git revert HEAD
git push origin master
```

---

## What's Next: Phase 4B (Optional)

After Phase 4A is complete and tested, you can optionally protect:

**Phase 4B Operations:**
1. Cancel Booking (medium priority)
2. Create Run (low priority - admin only)
3. Mark Attendance (low priority - LIRF only)

**Estimated time:** 1-2 days  
**Score impact:** +2 points (86→88/100)

**Recommendation:** Launch with Phase 4A protection. Add Phase 4B post-launch if needed.

---

## Questions or Issues?

If you encounter:
- **Can't find service files:** Share your project structure
- **Multiple update/booking functions:** List them all and we'll prioritize
- **Tests failing:** Share console output and which test failed
- **Errors during testing:** Share the full error message

Report back with Phase 4A test results! 🚀
