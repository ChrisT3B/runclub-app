# CSRF Protection - Phase 2: Validation Layer & Testing

## Overview
This is Phase 2 of 5 for implementing CSRF protection. This phase implements the actual CSRF token validation and tests it on a **non-critical endpoint** before rolling out to critical operations.

**Estimated Time:** 2-3 hours  
**Risk Level:** LOW-MEDIUM (testing on non-critical feature first)  
**Prerequisites:** Phase 1 complete and tested ✅

---

## What Phase 2 Does

### Phase 1 Recap (Already Done ✅)
- ✅ Generate CSRF token on login
- ✅ Store token in sessionStorage + database
- ✅ Clear token on logout

### Phase 2 Objectives
- ✅ Implement CSRF token validation function
- ✅ Create error handling for invalid tokens
- ✅ Test validation on a **safe, non-critical operation**
- ✅ Verify validation works before rolling out to critical operations

**What we're NOT doing yet:**
- ❌ Not protecting delete operations (Phase 3)
- ❌ Not protecting booking operations (Phase 3)
- ❌ Not protecting admin operations (Phase 4)

---

## Step 1: Implement CSRF Validation Function

### Action: Update `src/utils/csrfProtection.ts`

**Find the `validateCsrfToken` function** (currently a placeholder that returns true):

```typescript
export const validateCsrfToken = async (
  token: string | null, 
  userId: string
): Promise<{ isValid: boolean; error?: string }> => {
  // PHASE 1: Not implemented yet - always return true
  // PHASE 2: Will add actual validation
  console.log('ℹ️ CSRF validation not yet implemented (Phase 2)');
  
  if (!token) {
    return { isValid: false, error: 'CSRF token is required' };
  }
  
  // Placeholder - will be implemented in Phase 2
  return { isValid: true };
};
```

**Replace with full implementation:**

```typescript
/**
 * Validate CSRF token against database
 * @param token - The CSRF token from the client request
 * @param userId - The user ID making the request
 * @returns Object with isValid boolean and optional error message
 */
export const validateCsrfToken = async (
  token: string | null, 
  userId: string
): Promise<{ isValid: boolean; error?: string }> => {
  // Validation Step 1: Check if token exists
  if (!token) {
    console.warn('⚠️ CSRF validation failed: No token provided');
    return { 
      isValid: false, 
      error: 'Security token is required. Please refresh and try again.' 
    };
  }

  // Validation Step 2: Basic format check (should be a UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    console.warn('⚠️ CSRF validation failed: Invalid token format');
    return { 
      isValid: false, 
      error: 'Invalid security token format. Please log in again.' 
    };
  }

  try {
    // Validation Step 3: Query database for matching token
    const { data, error } = await supabase
      .from('active_sessions')
      .select('csrf_token, user_id, expires_at')
      .eq('user_id', userId)
      .eq('csrf_token', token)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors if not found

    // Check for database errors
    if (error) {
      console.error('❌ CSRF validation database error:', error);
      return { 
        isValid: false, 
        error: 'Security verification failed. Please try again.' 
      };
    }

    // Validation Step 4: Check if token exists in database
    if (!data) {
      console.warn('⚠️ CSRF validation failed: Token not found in database');
      return { 
        isValid: false, 
        error: 'Security token not found. Please log in again.' 
      };
    }

    // Validation Step 5: Verify token belongs to the correct user
    if (data.user_id !== userId) {
      console.warn('⚠️ CSRF validation failed: Token user mismatch');
      return { 
        isValid: false, 
        error: 'Security token mismatch. Please log in again.' 
      };
    }

    // Validation Step 6: Check if session has expired
    if (data.expires_at) {
      const expirationDate = new Date(data.expires_at);
      const now = new Date();
      
      if (expirationDate < now) {
        console.warn('⚠️ CSRF validation failed: Session expired');
        return { 
          isValid: false, 
          error: 'Your session has expired. Please log in again.' 
        };
      }
    }

    // All validations passed!
    console.log('✅ CSRF token validated successfully for user:', userId);
    return { isValid: true };

  } catch (error) {
    console.error('❌ CSRF validation error:', error);
    return { 
      isValid: false, 
      error: 'Security verification error. Please try again.' 
    };
  }
};
```

**Verification:**
- Function should have proper error handling
- Returns user-friendly error messages
- Logs validation steps for debugging

---

## Step 2: Create CSRF Error Handler Utility

### Action: Create helper function for consistent error handling

**In the same file** (`src/utils/csrfProtection.ts`), **add this function at the end:**

```typescript
/**
 * Handle CSRF validation errors with user-friendly messaging
 * @param error - Error message from validation
 * @param showToast - Whether to show a toast notification (default: true)
 */
export const handleCsrfError = (error: string, showToast: boolean = true): void => {
  console.error('🔒 CSRF validation failed:', error);
  
  // You can integrate with your toast/notification system here
  // For now, just log the error
  if (showToast) {
    // TODO: Integrate with your toast notification system
    // toast.error(error);
    console.log('📢 User should see error:', error);
  }
};

/**
 * Check if error is CSRF-related
 * @param error - Error object or message
 * @returns true if error is CSRF-related
 */
export const isCsrfError = (error: any): boolean => {
  if (typeof error === 'string') {
    return error.toLowerCase().includes('csrf') || 
           error.toLowerCase().includes('security token');
  }
  
  if (error?.message) {
    return error.message.toLowerCase().includes('csrf') || 
           error.message.toLowerCase().includes('security token');
  }
  
  return false;
};
```

**Verification:**
- Functions export correctly
- No TypeScript errors

---

## Step 3: Create Test Endpoint

We need a safe, non-critical operation to test CSRF validation. We'll create a simple "test CSRF" function that doesn't modify any real data.

### Action: Create test service

**File:** `src/services/csrfTestService.ts` (NEW FILE)

```typescript
// src/services/csrfTestService.ts
// Test service for CSRF validation - SAFE, does not modify real data

import { supabase } from './supabase';
import { validateCsrfToken, getCsrfToken } from '../utils/csrfProtection';

/**
 * Test CSRF validation without modifying any real data
 * This is a SAFE test that just validates the token
 * 
 * @returns Object with success status and message
 */
export const testCsrfProtection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: 'Not authenticated. Please log in.'
      };
    }

    // Get CSRF token from sessionStorage
    const csrfToken = getCsrfToken();
    
    if (!csrfToken) {
      return {
        success: false,
        message: 'No CSRF token found. Please log in again.'
      };
    }

    // Validate CSRF token
    const validation = await validateCsrfToken(csrfToken, user.id);
    
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || 'CSRF validation failed',
        details: { validationResult: validation }
      };
    }

    // Success! CSRF validation passed
    return {
      success: true,
      message: '✅ CSRF protection is working correctly!',
      details: {
        userId: user.id,
        tokenPresent: true,
        validationPassed: true
      }
    };

  } catch (error) {
    console.error('Error testing CSRF protection:', error);
    return {
      success: false,
      message: 'Error testing CSRF protection',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};
```

**Verification:**
- File created successfully
- No TypeScript errors
- Function returns proper response format

---

## Step 4: Create Test UI Component

### Action: Create a simple test component to trigger CSRF validation

**File:** `src/components/CsrfTestButton.tsx` (NEW FILE)

```typescript
// src/components/CsrfTestButton.tsx
// Developer tool for testing CSRF protection

import React, { useState } from 'react';
import { testCsrfProtection } from '../services/csrfTestService';

const CsrfTestButton: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult('Testing CSRF protection...');
    
    try {
      const response = await testCsrfProtection();
      
      if (response.success) {
        setResult(`✅ ${response.message}`);
        console.log('CSRF Test Result:', response.details);
      } else {
        setResult(`❌ ${response.message}`);
        console.error('CSRF Test Failed:', response.details);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#f7fafc'
    }}>
      <h3 style={{ marginBottom: '10px', color: '#2d3748' }}>
        🔒 CSRF Protection Test
      </h3>
      <p style={{ marginBottom: '15px', color: '#4a5568', fontSize: '14px' }}>
        This tests CSRF token validation without modifying any data.
      </p>
      
      <button
        onClick={handleTest}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#cbd5e0' : '#4299e1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        {loading ? 'Testing...' : 'Test CSRF Protection'}
      </button>
      
      {result && (
        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: result.startsWith('✅') ? '#c6f6d5' : '#fed7d7',
          borderRadius: '6px',
          color: result.startsWith('✅') ? '#22543d' : '#742a2a',
          fontSize: '14px'
        }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default CsrfTestButton;
```

**Verification:**
- Component created successfully
- No TypeScript/React errors

---

## Step 5: Add Test Button to Dashboard (Temporary)

### Action: Add test button to dashboard for testing

**File:** `src/modules/dashboard/components/DashboardContent.tsx`

**Find the return statement** and add the test button **at the top of the dashboard** (temporarily):

```typescript
import CsrfTestButton from '../../../components/CsrfTestButton';

// ... existing code ...

return (
  <div className="dashboard-container">
    {/* TEMPORARY: CSRF Test Button - Remove after testing */}
    {process.env.NODE_ENV === 'development' && (
      <CsrfTestButton />
    )}
    
    {/* Existing dashboard content */}
    <div className="welcome-section">
      {/* ... rest of dashboard ... */}
    </div>
  </div>
);
```

**Note:** The `process.env.NODE_ENV === 'development'` check ensures the button only shows in development, not production.

**Verification:**
- Import added successfully
- Component renders without errors

---

## Step 6: Testing Phase 2

### Manual Test 1: Valid CSRF Token

1. **Log in to the application**
2. **Go to Dashboard** (should see CSRF Test button)
3. **Click "Test CSRF Protection"**
4. **Expected Result:**
   ```
   ✅ CSRF protection is working correctly!
   ```
5. **Check Console:**
   ```
   ✅ CSRF token validated successfully for user: [user-id]
   CSRF Test Result: { userId: '...', tokenPresent: true, validationPassed: true }
   ```

---

### Manual Test 2: Missing CSRF Token

1. **While logged in, open console**
2. **Manually clear token:** `sessionStorage.removeItem('csrf_token')`
3. **Click "Test CSRF Protection"**
4. **Expected Result:**
   ```
   ❌ No CSRF token found. Please log in again.
   ```

---

### Manual Test 3: Invalid CSRF Token

1. **While logged in, open console**
2. **Set invalid token:** `sessionStorage.setItem('csrf_token', 'invalid-token-123')`
3. **Click "Test CSRF Protection"**
4. **Expected Result:**
   ```
   ❌ Invalid security token format. Please log in again.
   ```

---

### Manual Test 4: Mismatched CSRF Token

1. **While logged in, open console**
2. **Set a different valid UUID:** `sessionStorage.setItem('csrf_token', '00000000-0000-0000-0000-000000000000')`
3. **Click "Test CSRF Protection"**
4. **Expected Result:**
   ```
   ❌ Security token not found. Please log in again.
   ```

---

### Manual Test 5: After Logout

1. **Log in** (test should pass)
2. **Log out**
3. **Log in again**
4. **Test again** (should pass with NEW token)

---

## Step 7: Commit Changes

### Git Commands

```bash
# Stage all changes
git add src/utils/csrfProtection.ts
git add src/services/csrfTestService.ts
git add src/components/CsrfTestButton.tsx
git add src/modules/dashboard/components/DashboardContent.tsx

# Commit
git commit -m "feat: implement CSRF validation layer (Phase 2)

- Implement full CSRF token validation in csrfProtection.ts
- Add error handling with user-friendly messages
- Create test service for safe CSRF testing
- Add temporary test button to dashboard
- Validate token format, database match, and expiration

Part of CSRF protection implementation (Phase 2/5)"

# Push
git push origin master
```

---

## Success Criteria

Phase 2 is complete when:

- ✅ CSRF validation function implemented
- ✅ All 5 manual tests pass
- ✅ Valid tokens pass validation
- ✅ Invalid tokens fail validation
- ✅ Missing tokens fail validation
- ✅ User-friendly error messages shown
- ✅ No breaking errors in console
- ✅ Existing functionality still works

---

## Troubleshooting

### Issue 1: "CSRF token not found in database" for valid token

**Cause:** Database query might not be finding the token

**Debug:**
```sql
-- Check if token exists in database
SELECT * FROM active_sessions 
WHERE user_id = 'YOUR_USER_ID' 
  AND csrf_token IS NOT NULL;
```

**Solution:** Verify Phase 1 is storing tokens correctly

---

### Issue 2: Validation always fails

**Cause:** Token format or database mismatch

**Debug in console:**
```javascript
// Check sessionStorage token
console.log('Token:', sessionStorage.getItem('csrf_token'));

// Check if it's a valid UUID format
const token = sessionStorage.getItem('csrf_token');
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log('Valid UUID?', uuidRegex.test(token));
```

---

### Issue 3: Test button doesn't appear

**Cause:** Component not imported or NODE_ENV check failing

**Solution 1:** Remove the NODE_ENV check temporarily:
```typescript
{/* Show button always for testing */}
<CsrfTestButton />
```

**Solution 2:** Check import path is correct

---

## Rollback Plan

If Phase 2 breaks something:

### Option A: Revert validation to always return true
```typescript
// In csrfProtection.ts - temporarily disable validation
export const validateCsrfToken = async (
  token: string | null, 
  userId: string
): Promise<{ isValid: boolean; error?: string }> => {
  console.log('⚠️ CSRF validation temporarily disabled');
  return { isValid: true }; // Always pass
};
```

### Option B: Git revert
```bash
git revert HEAD
git push origin master
```

---

## Next: Phase 3 Preview

After Phase 2 is complete, Phase 3 will:
1. Apply CSRF validation to **one critical operation** (e.g., delete run)
2. Test thoroughly with real operation
3. Only proceed if successful

**Do not proceed to Phase 3 until Phase 2 validation is working perfectly.**

---

## Questions or Issues?

If you encounter:
- **Validation always fails:** Share the database query results
- **Token format errors:** Share the token from sessionStorage
- **Console errors:** Share the full error message
- **Test button not showing:** Check console for import errors

Report back with all 5 test results and we'll proceed to Phase 3! 🚀
