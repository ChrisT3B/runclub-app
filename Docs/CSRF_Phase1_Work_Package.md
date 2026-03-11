# CSRF Protection Implementation - Phase 1: Database & Token Generation

## Overview
This is Phase 1 of 5 for implementing CSRF protection. This phase sets up the foundation: database schema and token generation during login.

**Estimated Time:** 2-3 hours  
**Risk Level:** LOW (no existing functionality affected)  
**Rollback:** Easy - can be reverted without impact

---

## Objectives
1. Add `csrf_token` column to `active_sessions` table
2. Generate CSRF token on successful login
3. Store token in both database and sessionStorage
4. Verify token is created correctly

**What NOT to do yet:**
- ❌ Don't add token validation to service functions
- ❌ Don't modify any DELETE/INSERT/UPDATE operations
- ❌ Don't update frontend components (except login flow)

---

## Step 1: Database Migration

### Task: Add CSRF token column to active_sessions table

**Location:** Supabase SQL Editor

**SQL to execute:**

```sql
-- Add csrf_token column to active_sessions table
ALTER TABLE active_sessions 
ADD COLUMN IF NOT EXISTS csrf_token VARCHAR(255);

-- Add index for faster CSRF token lookups
CREATE INDEX IF NOT EXISTS idx_active_sessions_csrf 
ON active_sessions(user_id, csrf_token);

-- Add comment for documentation
COMMENT ON COLUMN active_sessions.csrf_token IS 
  'CSRF token for validating state-changing requests. Generated on login, cleared on logout.';
```

**Verification:**
After running, verify the column exists:

```sql
-- Check column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'active_sessions' 
  AND column_name = 'csrf_token';

-- Should return:
-- column_name  | data_type
-- csrf_token   | character varying
```

**Expected Output:** Column added successfully with index created.

---

## Step 2: Update Authentication Types

### Task: Add CSRF token to type definitions

**File:** `src/modules/auth/types/index.ts`

**Action:** Add CSRF token to the AuthResponse and related types

**Find this interface:**
```typescript
export interface AuthResponse<T = any> {
  data: T | null;
  error: AuthError | null;
}
```

**Add new interface below it:**
```typescript
export interface AuthResponse<T = any> {
  data: T | null;
  error: AuthError | null;
  csrfToken?: string;  // ← ADD THIS LINE
}

// ADD THIS NEW INTERFACE
export interface CsrfTokenValidation {
  isValid: boolean;
  error?: string;
}
```

**Verification:** TypeScript compilation should succeed with no errors.

---

## Step 3: Create CSRF Utility Module

### Task: Create utility functions for CSRF token management

**File:** `src/utils/csrfProtection.ts` (NEW FILE)

**Create this file with the following content:**

```typescript
// src/utils/csrfProtection.ts
// CSRF Token Management Utilities

import { supabase } from '../services/supabase';

/**
 * Generate a cryptographically secure CSRF token
 * Uses crypto.randomUUID() for strong randomness
 */
export const generateCsrfToken = (): string => {
  // Generate a UUID v4 token
  const token = crypto.randomUUID();
  console.log('🔐 Generated CSRF token:', token.substring(0, 8) + '...');
  return token;
};

/**
 * Store CSRF token in sessionStorage
 * sessionStorage is used (not localStorage) because:
 * - Automatically cleared when browser tab closes
 * - Not accessible to other tabs
 * - More secure than localStorage
 */
export const storeCsrfToken = (token: string): void => {
  try {
    sessionStorage.setItem('csrf_token', token);
    console.log('✅ CSRF token stored in sessionStorage');
  } catch (error) {
    console.error('❌ Failed to store CSRF token:', error);
    throw new Error('Failed to store security token');
  }
};

/**
 * Retrieve CSRF token from sessionStorage
 */
export const getCsrfToken = (): string | null => {
  try {
    const token = sessionStorage.getItem('csrf_token');
    if (!token) {
      console.warn('⚠️ No CSRF token found in sessionStorage');
    }
    return token;
  } catch (error) {
    console.error('❌ Failed to retrieve CSRF token:', error);
    return null;
  }
};

/**
 * Clear CSRF token from sessionStorage (on logout)
 */
export const clearCsrfToken = (): void => {
  try {
    sessionStorage.removeItem('csrf_token');
    console.log('🧹 CSRF token cleared from sessionStorage');
  } catch (error) {
    console.error('❌ Failed to clear CSRF token:', error);
  }
};

/**
 * Validate CSRF token against database
 * This will be implemented in Phase 2
 * For now, just a placeholder that returns true
 */
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

/**
 * Store CSRF token in database active_sessions table
 */
export const storeCsrfTokenInDatabase = async (
  userId: string,
  csrfToken: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .update({ csrf_token: csrfToken })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to store CSRF token in database:', error);
      throw new Error('Failed to store security token in database');
    }

    console.log('✅ CSRF token stored in database for user:', userId);
  } catch (error) {
    console.error('❌ Error storing CSRF token in database:', error);
    throw error;
  }
};

/**
 * Clear CSRF token from database (on logout)
 */
export const clearCsrfTokenFromDatabase = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('active_sessions')
      .update({ csrf_token: null })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to clear CSRF token from database:', error);
      // Don't throw - logout should proceed even if this fails
    } else {
      console.log('🧹 CSRF token cleared from database for user:', userId);
    }
  } catch (error) {
    console.error('❌ Error clearing CSRF token from database:', error);
    // Don't throw - logout should proceed even if this fails
  }
};
```

**Verification:** 
- File should be created successfully
- No TypeScript errors
- Imports should resolve correctly

---

## Step 4: Update Login Flow to Generate CSRF Token

### Task: Modify loginUser function to generate and store CSRF token

**File:** `src/modules/auth/services/authService.ts`

**Find the loginUser function** (around line 150-200). It should look like this:

```typescript
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('🔐 Starting enhanced secure login...');
    
    // ... existing login code ...
    
    // If login successful, add session security tracking
    const { data: { session } } = await supabase.auth.getSession();
    if (session && result.data) {
      // Register session with security tracking
      await SessionSecurityService.registerSession(result.data.id, session.access_token);
      
      // ... rest of login code ...
    }
    
    return result;
  } catch (error) {
    // ... error handling ...
  }
};
```

**Modify it to include CSRF token generation:**

**Step 4a: Add import at the top of the file**

```typescript
// ADD THIS IMPORT at the top with other imports
import { 
  generateCsrfToken, 
  storeCsrfToken, 
  storeCsrfTokenInDatabase 
} from '../../../utils/csrfProtection';
```

**Step 4b: Update the loginUser function**

Find this section:
```typescript
// If login successful, add session security tracking
const { data: { session } } = await supabase.auth.getSession();
if (session && result.data) {
  // Register session with security tracking
  await SessionSecurityService.registerSession(result.data.id, session.access_token);
```

**Replace with:**
```typescript
// If login successful, add session security tracking
const { data: { session } } = await supabase.auth.getSession();
if (session && result.data) {
  // Register session with security tracking
  await SessionSecurityService.registerSession(result.data.id, session.access_token);
  
  // ========== NEW: CSRF TOKEN GENERATION ==========
  try {
    // Generate CSRF token
    const csrfToken = generateCsrfToken();
    
    // Store in sessionStorage (client-side)
    storeCsrfToken(csrfToken);
    
    // Store in database (server-side)
    await storeCsrfTokenInDatabase(result.data.id, csrfToken);
    
    console.log('✅ CSRF token generated and stored for user:', result.data.id);
    
    // Add token to response (for future use)
    result.csrfToken = csrfToken;
  } catch (csrfError) {
    // Don't fail login if CSRF token creation fails
    // Log error but allow login to proceed
    console.error('⚠️ Failed to create CSRF token (non-critical):', csrfError);
  }
  // ========== END: CSRF TOKEN GENERATION ==========
```

**Verification:**
- TypeScript compilation succeeds
- No import errors
- Login flow still works (test after deployment)

---

## Step 5: Update Logout Flow to Clear CSRF Token

### Task: Modify logoutUser function to clear CSRF token

**File:** `src/modules/auth/services/authService.ts`

**Find the logoutUser function** (around line 250-300). It should look like this:

```typescript
export const logoutUser = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Clean up session from database
      await SessionSecurityService.cleanupSession(user.id, /* ... */);
      
      // ... rest of logout code ...
    }
    
    await supabase.auth.signOut();
    localStorage.removeItem('device_fingerprint');
    // ... other cleanup ...
  } catch (error) {
    // ... error handling ...
  }
};
```

**Step 5a: Add import at the top (if not already added)**

```typescript
// ADD THIS IMPORT at the top with other imports
import { clearCsrfToken, clearCsrfTokenFromDatabase } from '../../../utils/csrfProtection';
```

**Step 5b: Update the logoutUser function**

Find this section:
```typescript
await supabase.auth.signOut();
localStorage.removeItem('device_fingerprint');
localStorage.removeItem('session_fingerprint');
localStorage.removeItem('last_activity');
sessionStorage.removeItem('redirectAfterLogin');
```

**Add CSRF cleanup:**
```typescript
await supabase.auth.signOut();
localStorage.removeItem('device_fingerprint');
localStorage.removeItem('session_fingerprint');
localStorage.removeItem('last_activity');
sessionStorage.removeItem('redirectAfterLogin');

// ========== NEW: CSRF TOKEN CLEANUP ==========
// Clear CSRF token from sessionStorage
clearCsrfToken();

// Clear CSRF token from database
if (user) {
  await clearCsrfTokenFromDatabase(user.id);
}
console.log('✅ CSRF token cleared on logout');
// ========== END: CSRF TOKEN CLEANUP ==========
```

**Verification:**
- TypeScript compilation succeeds
- Logout flow still works (test after deployment)

---

## Step 6: Testing Instructions

### Manual Testing Checklist

**Test 1: Login Flow**
1. Open browser DevTools → Console
2. Clear sessionStorage: `sessionStorage.clear()`
3. Log in to the application
4. **Expected in Console:**
   ```
   🔐 Generated CSRF token: abcd1234...
   ✅ CSRF token stored in sessionStorage
   ✅ CSRF token stored in database for user: [user-id]
   ✅ CSRF token generated and stored for user: [user-id]
   ```
5. **Verify sessionStorage:**
   - Run in console: `sessionStorage.getItem('csrf_token')`
   - Should return a UUID string (e.g., `"a1b2c3d4-e5f6-..."`)

**Test 2: Database Verification**
1. Log in successfully
2. Go to Supabase → Table Editor → `active_sessions`
3. Find your user's session
4. **Expected:** `csrf_token` column should contain a UUID value

**Test 3: Logout Flow**
1. Log in (verify token created)
2. Log out
3. **Expected in Console:**
   ```
   🧹 CSRF token cleared from sessionStorage
   🧹 CSRF token cleared from database for user: [user-id]
   ✅ CSRF token cleared on logout
   ```
4. **Verify sessionStorage:**
   - Run in console: `sessionStorage.getItem('csrf_token')`
   - Should return `null`
5. **Verify database:**
   - Check `active_sessions` table
   - `csrf_token` column should be `NULL` for your session

**Test 4: Token Persistence**
1. Log in
2. Note the CSRF token: `sessionStorage.getItem('csrf_token')`
3. Navigate to different pages (Dashboard, View Runs, etc.)
4. Check token again: `sessionStorage.getItem('csrf_token')`
5. **Expected:** Same token persists across navigation

**Test 5: New Tab Behavior**
1. Log in to app in Tab 1
2. Open new tab (Tab 2) and go to app
3. **Expected in Tab 2:** Should need to log in again (sessionStorage not shared between tabs)

---

## Verification Queries

### Check CSRF tokens in database

```sql
-- View all active sessions with CSRF tokens
SELECT 
  user_id,
  csrf_token,
  created_at,
  expires_at
FROM active_sessions
WHERE csrf_token IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Count sessions with vs without CSRF tokens
SELECT 
  COUNT(*) FILTER (WHERE csrf_token IS NOT NULL) as with_csrf,
  COUNT(*) FILTER (WHERE csrf_token IS NULL) as without_csrf
FROM active_sessions;
```

---

## Commit & Deploy

### Git Commands

```bash
# Stage all changes
git add src/modules/auth/services/authService.ts
git add src/modules/auth/types/index.ts
git add src/utils/csrfProtection.ts

# Commit with descriptive message
git commit -m "feat: implement CSRF token generation (Phase 1)

- Add csrf_token column to active_sessions table
- Create CSRF protection utility module
- Generate CSRF token on login
- Store token in sessionStorage and database
- Clear token on logout
- Add TypeScript types for CSRF

Part of CSRF protection implementation (Phase 1/5)"

# Push to trigger deployment
git push origin master
```

### Post-Deployment Checklist

After Vercel deploys:
- [ ] Promote to production
- [ ] Test login flow
- [ ] Verify token in sessionStorage
- [ ] Verify token in database
- [ ] Test logout flow
- [ ] Verify token cleared
- [ ] Check for any console errors

---

## Success Criteria

Phase 1 is complete when:
- ✅ `csrf_token` column exists in `active_sessions` table
- ✅ Login generates unique CSRF token
- ✅ Token stored in both sessionStorage and database
- ✅ Token persists across page navigation
- ✅ Logout clears token from both locations
- ✅ No TypeScript compilation errors
- ✅ No broken functionality (login/logout work normally)
- ✅ Console logs show CSRF token lifecycle

---

## Rollback Plan

If something breaks:

### Option A: Disable CSRF token creation
```typescript
// In authService.ts, comment out CSRF generation:
/*
try {
  const csrfToken = generateCsrfToken();
  // ... rest of CSRF code
} catch (csrfError) {
  // ...
}
*/
```

### Option B: Revert commit
```bash
git revert HEAD
git push origin master
```

### Option C: Remove database column (if needed)
```sql
ALTER TABLE active_sessions DROP COLUMN IF EXISTS csrf_token;
```

---

## What's Next: Phase 2 Preview

After Phase 1 is complete and tested, Phase 2 will:
1. Implement CSRF token validation function
2. Create error handling for invalid tokens
3. Add validation to test endpoint (non-critical feature)
4. Test validation before rolling out to critical operations

**Estimated Phase 2 Time:** 1-2 days

---

## Questions or Issues?

If you encounter:
- **TypeScript errors:** Share the error message
- **Database errors:** Share the SQL error
- **Runtime errors:** Share console output
- **Token not generating:** Check console for error logs
- **Token not persisting:** Check sessionStorage in DevTools

Report back with test results and we'll proceed to Phase 2! 🚀
