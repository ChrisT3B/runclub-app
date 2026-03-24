# Run Alert Feature

## Overview

A new notification type `run_alert` that allows LIRFs to send notifications to **all active club members** about a specific run they are assigned to lead. This sits between the existing `run_specific` (booked members only) and `general` (admin-only) notification types.

## Use Case

A LIRF needs to communicate about a run to the wider club, not just those already booked. Examples:
- "Tonight's run is moved to the park due to flooding"
- "Spaces still available on Thursday's 5k"
- "New route this week - bring trail shoes"

## How It Works

| Notification Type | Who Can Send | Recipients | Run Linked |
|---|---|---|---|
| `run_specific` | LIRF / Admin | Booked members only | Yes |
| **`run_alert`** | **LIRF / Admin** | **All active members** | **Yes** |
| `general` | Admin only | All active members | No |
| `urgent` | Admin only | All active members | No |

### LIRF Workflow
1. Navigate to Communications > Create Notification
2. Select **"Run Alert"** from the notification type dropdown
3. Select the run from the assigned runs list (same as run_specific)
4. Write the message - recipients will see the run details (title, date, time) attached
5. Toggle email notifications on/off as needed
6. Send

### Security
- LIRFs must be assigned to the run (`assigned_lirf_1`, `_2`, or `_3`)
- Enforced server-side via Supabase RLS policy on the `notifications` table
- `run_id` is required (cannot send a run_alert without selecting a run)

## Changes Made

### Database (Supabase)
**RLS Policy update required** - run the script `supabase_run_alert_policy_update.sql` in the Supabase SQL editor.

This updates `notifications_insert_policy` to allow LIRFs to insert rows where `type = 'run_alert'` (previously only `'run_specific'` was permitted for LIRFs). The same run assignment check applies.

### Frontend Files Modified

| File | Change |
|---|---|
| `src/styles/04-pages/communications.css` | Added `.type-badge--run-alert` class |
| `src/modules/communications/services/NotificationService.ts` | Added `run_alert` to type unions, new recipient branch (all active members), email run details support |
| `src/modules/communications/services/EmailService.ts` | Added `run_alert` to type union and emoji map |
| `src/modules/communications/components/CreateNotificationForm.tsx` | New dropdown option, run selector for run_alert, active member count display |
| `src/modules/communications/components/CommunicationsDashboard.tsx` | Icon and badge mappings |
| `src/shared/components/ui/NotificationModal.tsx` | Icon and badge display |
| `src/modules/dashboard/components/DashboardContent.tsx` | Icon mapping |

### No Changes Required
- No database schema changes (notifications table already supports text type and nullable run_id)
- No changes to `notification_recipients` table or its RLS policy (already permits admin/LIRF inserts)

## Deployment Checklist

1. Run `supabase_run_alert_policy_update.sql` in Supabase SQL editor
2. Deploy frontend code
3. Verify a LIRF can see the "Run Alert" option in the notification form
4. Verify a LIRF can send a run_alert for an assigned run
5. Verify all active members receive the notification with run details
6. Verify a LIRF cannot send a run_alert for a run they are not assigned to (RLS should block)
