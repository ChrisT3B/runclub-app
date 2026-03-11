# CSRF Protection - Phase 3: Protect Delete Run Operation

## Overview
This is Phase 3 of 5 for implementing CSRF protection. This phase applies CSRF validation to **one critical operation** - Delete Run - to verify the protection works in a real-world scenario before rolling out to other operations.

**Estimated Time:** 1-2 hours  
**Risk Level:** MEDIUM (affects real functionality but limited user base)  
**Prerequisites:** Phase 1 ✅ and Phase 2 ✅ complete and tested

---

## What Phase 3 Does

### Phase 2 Recap (Already Done ✅)
- ✅ Implemented CSRF validation function
- ✅ Tested validation on safe endpoint
- ✅ Verified all validation scenarios work

### Phase 3 Objectives
- ✅ Apply CSRF validation to **Delete Run** operation
- ✅ Add proper error handling for CSRF failures
- ✅ Force re-login on CSRF validation failure
- ✅ Test thoroughly with admin/LIRF accounts

**What we're protecting:**
- ✅ Delete Run (admin/LIRF only - limited blast radius)

**What we're NOT protecting yet:**
- ❌ Create Run (Phase 4)
- ❌ Book Run (Phase 4)
- ❌ Cancel Booking (Phase 4)
- ❌ Admin operations (Phase 4)

---

## Why Delete Run First?

**Advantages:**
- Limited users (only admins/LIRFs can delete)
- High-value CSRF target (malicious deletion is serious)
- Easy to test (create run → delete it)
- Clear success/failure (run deleted or not)

**Safety:**
- If CSRF breaks deletion, only affects admins/LIRFs
- Regular members unaffected
- Easy to rollback

---

## Step 1: Update Delete Run Service

### Action: Add CSRF validation to delete run function

**File:** `src/modules/admin/services/scheduledRunsService.ts`

**Find the `deleteScheduledRun` function** (should be around line 200-250):

```typescript
export const deleteScheduledRun = async (
  runId: string, 
  userId: string, 
  accessLevel: string
): Promise<void> => {
  try {
    // Existing security checks
    if (!SQLSecurityValidator.isValidUUID(runId)) {
      throw new Error('Invalid run ID format');
    }

    if (!SQLSecurityValidator.isValidUUID(userId)) {
      throw new Error('Invalid user ID format');
    }

    // Check user has permission to delete
    if (accessLevel !== 'admin') {
      throw new Error('Only administrators can delete scheduled runs');
    }

    // Delete the run
    const { error } = await supabase
      .from('scheduled_runs')
      .delete()
      .eq('id', runId);

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ Run deleted successfully:', runId);
  } catch (error) {
    console.error('❌ Error deleting run:', error);
    throw error;
  }
};
```

**Replace with CSRF-protected version:**

```typescript
// ADD THIS IMPORT at the top of the file
import { validateCsrfToken, getCsrfToken } from '../../../utils/csrfProtection';

// UPDATED FUNCTION with CSRF protection
export const deleteScheduledRun = async (
  runId: string, 
  userId: string, 
  accessLevel: string
): Promise<void> => {
  try {
    // ========== EXISTING SECURITY CHECKS ==========
    if (!SQLSecurityValidator.isValidUUID(runId)) {
      throw new Error('Invalid run ID format');
    }

    if (!SQLSecurityValidator.isValidUUID(userId)) {
      throw new Error('Invalid user ID format');
    }

    // Check user has permission to delete
    if (accessLevel !== 'admin') {
      throw new Error('Only administrators can delete scheduled runs');
    }

    // ========== NEW: CSRF VALIDATION ==========
    console.log('🔒 Validating CSRF token for delete operation...');
    
    // Get CSRF token from sessionStorage
    const csrfToken = getCsrfToken();
    
    if (!csrfToken) {
      console.error('❌ CSRF validation failed: No token found');
      throw new Error('CSRF_TOKEN_MISSING: Your session has expired. Please log in again.');
    }

    // Validate CSRF token
    const validation = await validateCsrfToken(csrfToken, userId);
    
    if (!validation.isValid) {
      console.error('❌ CSRF validation failed:', validation.error);
      throw new Error(`CSRF_VALIDATION_FAILED: ${validation.error}`);
    }

    console.log('✅ CSRF token validated - proceeding with deletion');
    // ========== END: CSRF VALIDATION ==========

    // Delete the run (existing code)
    const { error } = await supabase
      .from('scheduled_runs')
      .delete()
      .eq('id', runId);

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ Run deleted successfully:', runId);
  } catch (error) {
    console.error('❌ Error deleting run:', error);
    throw error;
  }
};
```

**Key Changes:**
1. Import CSRF utilities
2. Get token from sessionStorage
3. Validate token before deletion
4. Throw specific CSRF errors (prefixed with `CSRF_`)
5. Log validation steps for debugging

**Verification:**
- Import resolves correctly
- No TypeScript errors
- Function signature unchanged (backward compatible)

---

## Step 2: Update Delete Run Component Error Handling

### Action: Handle CSRF errors in the UI

**File:** `src/modules/admin/components/ViewScheduledRuns.tsx`

**Find the delete run handler** (search for `handleDeleteRun` or where `deleteScheduledRun` is called):

```typescript
const handleDeleteRun = async (runId: string) => {
  if (!window.confirm('Are you sure you want to delete this run?')) {
    return;
  }

  try {
    await deleteScheduledRun(runId, userId, accessLevel);
    toast.success('Run deleted successfully');
    // Refresh runs list
    refetch();
  } catch (error) {
    console.error('Error deleting run:', error);
    toast.error(error.message || 'Failed to delete run');
  }
};
```

**Replace with CSRF-aware error handling:**

```typescript
// ADD THIS IMPORT at the top
import { supabase } from '../../../services/supabase';

const handleDeleteRun = async (runId: string) => {
  if (!window.confirm('Are you sure you want to delete this run?')) {
    return;
  }

  try {
    await deleteScheduledRun(runId, userId, accessLevel);
    toast.success('Run deleted successfully');
    // Refresh runs list
    refetch();
  } catch (error) {
    console.error('Error deleting run:', error);
    
    // ========== NEW: CSRF ERROR HANDLING ==========
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if this is a CSRF error
    if (errorMessage.includes('CSRF_TOKEN_MISSING') || 
        errorMessage.includes('CSRF_VALIDATION_FAILED')) {
      
      console.log('🔒 CSRF validation failed - forcing re-login');
      
      // Show user-friendly error
      toast.error('Your session has expired. Please log in again.');
      
      // Force logout and redirect to login
      await supabase.auth.signOut();
      
      // Clear all session data
      sessionStorage.clear();
      localStorage.clear();
      
      // Reload page to show login screen
      window.location.reload();
      
      return; // Exit early - don't show generic error
    }
    // ========== END: CSRF ERROR HANDLING ==========
    
    // Show generic error for non-CSRF failures
    toast.error(errorMessage || 'Failed to delete run');
  }
};
```

**Key Changes:**
1. Detect CSRF-specific errors (prefixed with `CSRF_`)
2. Show user-friendly message
3. Force logout via `supabase.auth.signOut()`
4. Clear all session data
5. Reload page to show login screen

**Verification:**
- Import added correctly
- Error handling doesn't break existing flow
- Generic errors still show normally

---

## Step 3: Add User Feedback During Validation

### Action: Show loading state during CSRF validation

**Optional enhancement** - Add loading state to improve UX:

```typescript
const [isDeleting, setIsDeleting] = useState(false);

const handleDeleteRun = async (runId: string) => {
  if (!window.confirm('Are you sure you want to delete this run?')) {
    return;
  }

  setIsDeleting(true); // Show loading state
  
  try {
    await deleteScheduledRun(runId, userId, accessLevel);
    toast.success('Run deleted successfully');
    refetch();
  } catch (error) {
    // ... existing error handling ...
  } finally {
    setIsDeleting(false); // Hide loading state
  }
};
```

And disable delete button while deleting:

```typescript
<button 
  onClick={() => handleDeleteRun(run.id)}
  disabled={isDeleting}
  className={isDeleting ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isDeleting ? 'Deleting...' : 'Delete'}
</button>
```

**Note:** This is optional - focus on CSRF validation first, UX improvements later.

---

## Step 4: Testing Phase 3

### Pre-Test Checklist

Before testing, verify:
- [ ] Phase 1 complete (token generated on login)
- [ ] Phase 2 complete (validation tested and working)
- [ ] Logged in as admin or LIRF
- [ ] Can see scheduled runs
- [ ] Have a test run you can delete

---

### Manual Test 1: Delete Run with Valid Token ✅

**Expected: Deletion succeeds**

1. **Log in as admin/LIRF**
2. **Navigate to View Scheduled Runs**
3. **Create a test run** (or use existing)
4. **Click delete** on the test run
5. **Confirm deletion** in dialog

**Expected Console Output:**
```
🔒 Validating CSRF token for delete operation...
✅ CSRF token validated successfully for user: [user-id]
✅ CSRF token validated - proceeding with deletion
✅ Run deleted successfully: [run-id]
```

**Expected UI:**
- ✅ Run deleted from list
- ✅ Toast: "Run deleted successfully"
- ✅ No errors

**Result:** PASS ✅ / FAIL ❌

---

### Manual Test 2: Delete Run with Missing Token ❌

**Expected: Deletion fails, forces re-login**

1. **While logged in, open console**
2. **Clear CSRF token:** `sessionStorage.removeItem('csrf_token')`
3. **Try to delete a run**

**Expected Console Output:**
```
🔒 Validating CSRF token for delete operation...
❌ CSRF validation failed: No token found
❌ Error deleting run: CSRF_TOKEN_MISSING: Your session has expired...
🔒 CSRF validation failed - forcing re-login
```

**Expected UI:**
- ❌ Run NOT deleted
- ✅ Toast: "Your session has expired. Please log in again."
- ✅ Automatically logged out
- ✅ Login screen appears

**Result:** PASS ✅ / FAIL ❌

---

### Manual Test 3: Delete Run with Invalid Token ❌

**Expected: Deletion fails, forces re-login**

1. **While logged in, open console**
2. **Set invalid token:** `sessionStorage.setItem('csrf_token', 'invalid-token-123')`
3. **Try to delete a run**

**Expected Console Output:**
```
🔒 Validating CSRF token for delete operation...
⚠️ CSRF validation failed: Invalid token format
❌ CSRF validation failed: Invalid security token format...
❌ Error deleting run: CSRF_VALIDATION_FAILED: Invalid security token format...
🔒 CSRF validation failed - forcing re-login
```

**Expected UI:**
- ❌ Run NOT deleted
- ✅ Toast: "Your session has expired. Please log in again."
- ✅ Automatically logged out
- ✅ Login screen appears

**Result:** PASS ✅ / FAIL ❌

---

### Manual Test 4: Delete Run After Fresh Login ✅

**Expected: Deletion succeeds with new token**

1. **Log out completely**
2. **Log in again** (generates new token)
3. **Create a test run**
4. **Delete the test run**

**Expected:**
- ✅ Deletion succeeds normally
- ✅ New CSRF token validated
- ✅ Run deleted successfully

**Result:** PASS ✅ / FAIL ❌

---

### Manual Test 5: Multiple Deletions in Sequence ✅

**Expected: All deletions succeed with same token**

1. **Log in**
2. **Create 3 test runs**
3. **Delete all 3 runs** (one after another, without refreshing)

**Expected:**
- ✅ First deletion: Succeeds (validates token)
- ✅ Second deletion: Succeeds (reuses same token)
- ✅ Third deletion: Succeeds (reuses same token)

**Result:** PASS ✅ / FAIL ❌

---

## Step 5: Commit Changes

### Git Commands

```bash
# Stage changes
git add src/modules/admin/services/scheduledRunsService.ts
git add src/modules/admin/components/ViewScheduledRuns.tsx

# Commit
git commit -m "feat: protect delete run operation with CSRF validation (Phase 3)

- Add CSRF validation to deleteScheduledRun service
- Validate token before allowing deletion
- Force re-login on CSRF validation failure
- Add user-friendly error messages
- Clear all session data on CSRF failure

Part of CSRF protection implementation (Phase 3/5)"

# Push
git push origin master
```

---

## Success Criteria

Phase 3 is complete when:

- ✅ All 5 manual tests pass
- ✅ Valid token allows deletion
- ✅ Invalid token prevents deletion and forces re-login
- ✅ Missing token prevents deletion and forces re-login
- ✅ Fresh login generates new token that works
- ✅ Multiple deletions work with same token
- ✅ No breaking changes to other functionality

---

## Troubleshooting

### Issue 1: Deletion fails even with valid token

**Debug Steps:**
```javascript
// In console, check token
const token = sessionStorage.getItem('csrf_token');
console.log('Token:', token);

// Check if it's a valid UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log('Valid UUID?', uuidRegex.test(token));
```

**Check database:**
```sql
SELECT csrf_token, user_id 
FROM active_sessions 
WHERE user_id = 'YOUR_USER_ID';
```

**Solution:** 
- If token doesn't match database, log out and log in again
- If still fails, check Phase 1/2 implementations

---

### Issue 2: Deletion works without token (validation not enforced)

**Cause:** CSRF validation not actually being called

**Check:**
- Verify import statement exists
- Verify `validateCsrfToken` is actually called
- Check console for validation logs

**Solution:** Review Step 1 implementation

---

### Issue 3: Force logout doesn't work

**Cause:** `supabase.auth.signOut()` might fail silently

**Debug:**
```typescript
try {
  await supabase.auth.signOut();
  console.log('✅ Logout successful');
} catch (error) {
  console.error('❌ Logout failed:', error);
}
```

**Solution:** Ensure supabase import is correct

---

### Issue 4: Gets stuck in re-login loop

**Cause:** Token not being regenerated after re-login

**Check:** Phase 1 login flow - should generate new token

**Solution:** Verify Phase 1 implementation still working

---

## Rollback Plan

If Phase 3 breaks delete functionality:

### Option A: Disable CSRF for delete (temporary)
```typescript
// In deleteScheduledRun, comment out CSRF validation
/*
const csrfToken = getCsrfToken();
if (!csrfToken) { ... }
const validation = await validateCsrfToken(csrfToken, userId);
if (!validation.isValid) { ... }
*/
console.log('⚠️ CSRF validation temporarily disabled');
```

### Option B: Git revert
```bash
git revert HEAD
git push origin master
```

---

## What's Next: Phase 4 Preview

After Phase 3 succeeds, Phase 4 will protect:
1. Create Run (LIRF/admin)
2. Book Run (all members)
3. Cancel Booking (all members)
4. Update Profile (all members)
5. Admin operations (admin only)

**Estimated Phase 4 Time:** 2-3 days (multiple operations)

**Do not proceed to Phase 4 until Phase 3 is fully tested and working.**

---

## Security Impact

After Phase 3 completion:

**Protected Operations:**
- ✅ Delete Run (CSRF protected)

**Attack Prevention:**
- ✅ Malicious site cannot delete runs on behalf of admin/LIRF
- ✅ CSRF attacks on deletion blocked

**Remaining Vulnerabilities:**
- ⚠️ Create Run (not protected yet)
- ⚠️ Booking operations (not protected yet)
- ⚠️ Admin operations (not protected yet)

These will be addressed in Phase 4.

---

## Questions or Issues?

If you encounter:
- **Deletion fails with valid token:** Share console output + database query
- **Validation not running:** Share service function code
- **Force logout not working:** Share error handling code
- **Tests failing:** Share which test and what you see

Report back with all 5 test results! 🚀
