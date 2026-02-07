# Notifications - EA Affiliated Members Filter Enhancement

## Overview
Add option to send notifications to EA affiliated members only in the Create Notification form. This allows admins to target communications specifically to paying members.

---

## Files to Modify

1. `src/modules/communications/components/CreateNotificationForm.tsx`
2. `src/modules/communications/services/NotificationService.ts`

---

## PART 1: Update Create Notification Form

### File: `src/modules/communications/components/CreateNotificationForm.tsx`

**Add new field to form data interface:**

```typescript
interface NotificationFormData {
  title: string;
  message: string;
  type: 'general' | 'run_specific' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  run_id?: string;
  expires_at?: string;
  send_email?: boolean;
  affiliated_only?: boolean; // NEW FIELD
}
```

**Add state for affiliated members only:**

```typescript
const [formData, setFormData] = useState<NotificationFormData>({
  title: '',
  message: '',
  type: 'general',
  priority: 'normal',
  run_id: undefined,
  expires_at: '',
  send_email: true,
  affiliated_only: false, // NEW DEFAULT
});
```

**Add checkbox in the Recipient section:**

Insert this AFTER the "Notification Type" section and BEFORE the "Email Notification Option" section:

```tsx
{/* EA Affiliated Members Filter */}
{(formData.type === 'general' || formData.type === 'urgent') && (
  <div className="form-group">
    <div style={{
      padding: '16px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <input
          type="checkbox"
          id="affiliated_only"
          name="affiliated_only"
          checked={formData.affiliated_only || false}
          onChange={handleInputChange}
          style={{
            marginTop: '2px',
            width: '18px',
            height: '18px',
            cursor: 'pointer'
          }}
        />
        <div style={{ flex: 1 }}>
          <label 
            htmlFor="affiliated_only" 
            style={{
              fontWeight: '500',
              color: 'var(--gray-900)',
              cursor: 'pointer',
              display: 'block',
              marginBottom: '4px'
            }}
          >
            🏃 EA Affiliated Members Only
          </label>
          <div style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.4' }}>
            Send this notification only to current EA affiliated members (is_paid_member = true).
            Uncheck to send to all active members.
          </div>
        </div>
      </div>

      {/* Show count of affiliated members */}
      {affiliatedMembersCount !== null && (
        <div style={{
          padding: '8px 12px',
          background: '#ffffff',
          border: '1px solid #d1fae5',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#166534'
        }}>
          {formData.affiliated_only ? (
            <>
              📊 Will send to {affiliatedMembersCount} EA affiliated member{affiliatedMembersCount !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              📊 Will send to all {activeMembersCount} active member{activeMembersCount !== 1 ? 's' : ''}
            </>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

**Add state for member counts:**

```typescript
const [affiliatedMembersCount, setAffiliatedMembersCount] = useState<number | null>(null);
const [activeMembersCount, setActiveMembersCount] = useState<number | null>(null);
```

**Load member counts on component mount:**

```typescript
useEffect(() => {
  loadMemberCounts();
}, []);

const loadMemberCounts = async () => {
  try {
    // Get all active members count
    const { count: activeCount, error: activeError } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('membership_status', 'active');

    if (!activeError && activeCount !== null) {
      setActiveMembersCount(activeCount);
    }

    // Get affiliated members count
    const { count: affiliatedCount, error: affiliatedError } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('membership_status', 'active')
      .eq('is_paid_member', true);

    if (!affiliatedError && affiliatedCount !== null) {
      setAffiliatedMembersCount(affiliatedCount);
    }
  } catch (error) {
    console.error('Failed to load member counts:', error);
  }
};
```

**Update form submission to include affiliated_only:**

The `handleSubmit` function should already pass all formData fields to the service, but verify it includes:

```typescript
const notificationData = {
  title: formData.title,
  message: formData.message,
  type: formData.type,
  priority: formData.priority,
  run_id: formData.run_id,
  expires_at: formData.expires_at || undefined,
  send_email: formData.send_email,
  affiliated_only: formData.affiliated_only, // Make sure this is included
};
```

---

## PART 2: Update Notification Service

### File: `src/modules/communications/services/NotificationService.ts`

**Update CreateNotificationData interface:**

```typescript
interface CreateNotificationData {
  title: string;
  message: string;
  type: 'general' | 'run_specific' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  run_id?: string;
  expires_at?: string;
  send_email?: boolean;
  affiliated_only?: boolean; // NEW FIELD
}
```

**Update `getRecipientIds` method:**

Modify the method to accept `affiliated_only` parameter:

```typescript
private static async getRecipientIds(
  type: 'general' | 'run_specific' | 'urgent',
  runId?: string,
  affiliatedOnly?: boolean // NEW PARAMETER
): Promise<string[]> {
  console.log('🔍 Determining recipients for:', { type, runId, affiliatedOnly });
  
  if (type === 'general' || type === 'urgent') {
    // Build query for active members
    let query = supabase
      .from('members')
      .select('id')
      .eq('membership_status', 'active');

    // Filter for affiliated members if requested
    if (affiliatedOnly) {
      query = query.eq('is_paid_member', true);
      console.log('🏃 Filtering for EA affiliated members only');
    }

    const { data: members, error } = await query;

    if (error) {
      console.error('Failed to get members:', error);
      return [];
    }

    console.log('📧 Found', members.length, affiliatedOnly ? 'affiliated' : 'active', 'members for notification');
    return members.map(member => member.id);
  }

  if (type === 'run_specific' && runId) {
    // Send to members booked on the specific run
    // Note: Run-specific notifications ignore affiliated_only filter
    // as they target specific run participants
    const { data: bookings, error } = await supabase
      .from('run_bookings')
      .select('member_id')
      .eq('run_id', runId)
      .is('cancelled_at', null); // Only active bookings

    if (error) {
      console.error('Failed to get run bookings:', error);
      return [];
    }

    console.log('🏃‍♂️ Found', bookings.length, 'active bookings for run:', runId);
    return bookings.map(booking => booking.member_id);
  }

  console.log('⚠️ No recipients determined for type:', type);
  return [];
}
```

**Update `createNotification` method call to `getRecipientIds`:**

Find where `getRecipientIds` is called and pass the `affiliated_only` parameter:

```typescript
// Get recipient IDs based on notification type
const recipientIds = await this.getRecipientIds(
  data.type, 
  data.run_id,
  data.affiliated_only // ADD THIS PARAMETER
);
```

---

## Visual Layout in Form

The new checkbox section should appear in this order:

```
1. Notification Type (general/run_specific/urgent)
2. [If run_specific: Run dropdown]
3. [NEW] EA Affiliated Members Only checkbox (if general or urgent)
4. Email Notification Option checkbox
5. Rest of form...
```

---

## Behavior

### When "EA Affiliated Members Only" is CHECKED:
- Notification sent only to members where `is_paid_member = true`
- Shows count: "Will send to X EA affiliated members"
- Console log: "🏃 Filtering for EA affiliated members only"

### When "EA Affiliated Members Only" is UNCHECKED (default):
- Notification sent to all active members
- Shows count: "Will send to all X active members"
- Console log: "📧 Found X active members for notification"

### For Run-Specific Notifications:
- Checkbox is hidden (not applicable)
- Always sends to all booked members regardless of affiliation status
- Run participants might not be affiliated, and that's okay

---

## Testing Checklist

### Form Display:
- [ ] Checkbox visible for "general" notification type
- [ ] Checkbox visible for "urgent" notification type
- [ ] Checkbox hidden for "run_specific" notification type
- [ ] Checkbox unchecked by default
- [ ] Label and description text clear and accurate
- [ ] Green styling consistent with design system

### Member Counts:
- [ ] Loads affiliated members count on mount
- [ ] Loads active members count on mount
- [ ] Shows correct count when checkbox checked
- [ ] Shows correct count when checkbox unchecked
- [ ] Updates display when toggling checkbox
- [ ] Handles zero affiliated members gracefully

### Notification Sending:
- [ ] Sends to only affiliated members when checked
- [ ] Sends to all active members when unchecked
- [ ] Run-specific notifications ignore this setting
- [ ] Console logs show correct recipient filtering
- [ ] Correct number of recipients created in database
- [ ] In-app notifications delivered correctly
- [ ] Email notifications respect the filter (if send_email = true)

### Edge Cases:
- [ ] Works when zero affiliated members
- [ ] Works when all members are affiliated
- [ ] Works when switching between notification types
- [ ] Form validation still works correctly
- [ ] Submit button behavior unchanged

---

## Database Queries for Verification

### Check affiliated members count:
```sql
SELECT COUNT(*) 
FROM members 
WHERE membership_status = 'active' 
  AND is_paid_member = true;
```

### Check all active members count:
```sql
SELECT COUNT(*) 
FROM members 
WHERE membership_status = 'active';
```

### Verify notification recipients after sending:
```sql
SELECT 
  n.title,
  n.type,
  COUNT(nr.id) as recipient_count,
  COUNT(CASE WHEN m.is_paid_member = true THEN 1 END) as affiliated_count,
  COUNT(CASE WHEN m.is_paid_member = false OR m.is_paid_member IS NULL THEN 1 END) as non_affiliated_count
FROM notifications n
JOIN notification_recipients nr ON nr.notification_id = n.id
JOIN members m ON m.id = nr.member_id
WHERE n.id = 'notification-id-here'
GROUP BY n.id, n.title, n.type;
```

---

## Notes

- The filter only applies to "general" and "urgent" notifications
- Run-specific notifications always go to all booked participants (affiliation status irrelevant)
- The default is unchecked (send to all), so existing behavior is preserved
- Member counts help admins understand the reach of their communication
- This feature is useful for:
  - Club business/financial updates (affiliated members only)
  - Member-exclusive events or benefits
  - EA-related communications
  - Marathon ballot announcements

---

## Future Enhancements (Not in Scope)

- Filter by membership type (1st claim vs 2nd claim)
- Filter by membership year (current year only)
- Combine filters (e.g., "Affiliated members who are also LIRFs")
- Save recipient groups for reuse
- Schedule notifications for future delivery
