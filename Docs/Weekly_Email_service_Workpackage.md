# LIRF Reminder Scheduler Activation - Work Package

## Objective
Enable the automatic LIRF weekly reminder scheduler in the production application so that emails are sent every Friday to all LIRF and Admin users listing runs requiring LIRF assignment in the next 7 days.

## Context
The LIRF reminder system has been fully implemented and tested:
- ✅ `LirfReminderService.ts` - Email generation and sending logic
- ✅ `LirfReminderScheduler.ts` - Scheduler that checks every hour for Friday
- ✅ Test page confirms system works correctly in production
- ❌ Scheduler not yet activated in the main application

## Requirements

### 1. Import the Scheduler
**File:** `src/App.tsx`

Add the following import at the top of the file with other imports:
```typescript
import LirfReminderScheduler from './modules/communications/schedulers/LirfReminderScheduler';
```

### 2. Start the Scheduler on App Mount
**File:** `src/App.tsx`

Inside the main `App` function component, add a new `useEffect` hook that:
- Starts the LIRF reminder scheduler when the app mounts
- Logs that the scheduler has started (for debugging)
- Returns a cleanup function that stops the scheduler when the app unmounts

The useEffect should look like this:
```typescript
useEffect(() => {
  // Start the LIRF reminder scheduler
  console.log('🔄 Starting LIRF reminder scheduler...');
  LirfReminderScheduler.start();

  // Cleanup on unmount
  return () => {
    LirfReminderScheduler.stop();
  };
}, []);
```

**Placement:** Add this useEffect near other initialization useEffects in the App component, after any existing setup logic but before the return statement.

## Technical Notes

### How the Scheduler Works
- Checks every hour if today is Friday
- Only sends emails once per Friday (prevents duplicates)
- Sends to all active LIRF and Admin users regardless of email preferences
- Uses existing `/api/send-email` endpoint (already working in production)
- Tracks sent status in localStorage with key `lirf_reminder_sent_YYYY-MM-DD`

### What Gets Sent
- All runs in next 7 days that have LIRF vacancies
- Individual links to each run for easy LIRF assignment
- Both HTML and plain text email versions
- Subject: "🏃‍♂️ LIRF Reminder: X runs need assignment" or "✅ LIRF Reminder: All runs covered"

## Verification Steps

After implementation, verify:

1. **Console Check:**
   - Open browser console in production
   - Should see: `🔄 Starting LIRF reminder scheduler...`
   - Should see: `✅ LIRF reminder scheduler started (checking hourly)`

2. **Status Check:**
   - Navigate to the test page (🧪 Test LIRF Reminder in sidebar)
   - Check "System Status" section
   - "Scheduler Active" should show "✅ Running"

3. **Wait for Friday:**
   - On Friday, check console for: `🚀 Triggering weekly LIRF reminder...`
   - Verify emails sent: `✅ LIRF reminder sent successfully to X recipients`
   - Confirm LIRF users receive emails

## Rollback Plan

If issues occur, remove the scheduler by:
1. Comment out or remove the import
2. Comment out or remove the useEffect
3. Commit and push

## Success Criteria

- ✅ Import added without TypeScript errors
- ✅ useEffect added without breaking existing functionality  
- ✅ Console shows scheduler started message
- ✅ No build errors in production deployment
- ✅ App functions normally with scheduler running in background
- ✅ (Wait for Friday) Emails sent successfully to all LIRF/Admin users

## Files to Modify

- `src/App.tsx` - Add import and useEffect (primary change)

## Files NOT to Modify

- Do not modify `LirfReminderService.ts`
- Do not modify `LirfReminderScheduler.ts`  
- Do not modify any email templates
- Do not modify test page components

## Additional Context

The scheduler is designed to be:
- **Lightweight:** Only checks once per hour
- **Safe:** Prevents duplicate sends automatically
- **Non-blocking:** Runs in background without affecting UI
- **Production-ready:** Already tested with real emails in production

## Post-Deployment

After successful deployment:
1. Monitor browser console for scheduler messages
2. Wait for next Friday to verify emails are sent
3. Check with LIRF users that emails arrived
4. If successful, remove the test page in a follow-up task