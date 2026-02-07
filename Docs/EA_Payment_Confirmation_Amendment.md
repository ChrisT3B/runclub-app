# EA Applications - Admin Confirmation UI Amendment

## Overview
Change both treasurer payment confirmation (Tab 1) and membership secretary EA registration confirmation (Tab 2) from modal-based to inline checkbox-based for faster processing of multiple applications.

---

## Changes Required

### Current Implementation (TO CHANGE):
- **Tab 1:** "✓ Confirm Payment" button opens a modal with payment date and notes inputs
- **Tab 2:** "✓ Confirm EA" button opens a modal with EA URN and notes inputs

### New Implementation (REQUIRED):
- **Tab 1:** Uses inline checkbox with expandable row for quick payment confirmation
- **Tab 2:** Uses inline checkbox with expandable row for quick EA registration confirmation

---

## Implementation Details

### File to Modify:
`src/modules/admin/components/AffiliatedApplicationsManagement.tsx`

### Tab 1: Pending Payment - New Layout

**Table Structure:**

| ✓ | Name | Email | Type | Fee | Payment Ref | Applied | Actions |
|---|------|-------|------|-----|-------------|---------|---------|

**Changes:**

1. **Add checkbox column at start:**
   - Unchecked checkbox for each application
   - No label needed
   - Width: ~40px

2. **Remove "✓ Confirm Payment" button from Actions column**
   - Keep "👁️ View Details" button
   - Keep "❌ Cancel" button

3. **Add expandable row functionality:**

**State Management:**
```typescript
const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
const [paymentData, setPaymentData] = useState<{
  date: string;
  notes: string;
}>({
  date: new Date().toISOString().split('T')[0], // Today's date
  notes: ''
});
```

**Checkbox Handler:**
```typescript
const handleCheckboxChange = (applicationId: string, isChecked: boolean) => {
  if (isChecked) {
    setExpandedRowId(applicationId);
    // Reset payment data to defaults
    setPaymentData({
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  } else {
    setExpandedRowId(null);
  }
};
```

**Row Rendering Pattern:**
```tsx
{applications.map((app) => (
  <React.Fragment key={app.id}>
    {/* Main row */}
    <tr className="member-table__row">
      <td className="member-table__cell">
        <input
          type="checkbox"
          checked={expandedRowId === app.id}
          onChange={(e) => handleCheckboxChange(app.id, e.target.checked)}
          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
        />
      </td>
      <td className="member-table__cell">{app.full_name}</td>
      <td className="member-table__cell">{app.email}</td>
      {/* ... other columns ... */}
      <td className="member-table__cell">
        <button onClick={() => viewDetails(app)}>👁️ View</button>
        <button onClick={() => cancelApp(app)}>❌ Cancel</button>
      </td>
    </tr>
    
    {/* Expanded row (conditionally rendered) */}
    {expandedRowId === app.id && (
      <tr className="payment-confirmation-row">
        <td colSpan={8} style={{
          backgroundColor: 'var(--gray-50)',
          padding: '16px 24px',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            {/* Payment Date */}
            <div style={{ flex: '0 0 200px' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>
                Payment Date
              </label>
              <input
                type="date"
                value={paymentData.date}
                onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                className="form-input"
              />
            </div>
            
            {/* Payment Notes */}
            <div style={{ flex: '1' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>
                Notes (optional)
              </label>
              <input
                type="text"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about payment..."
                className="form-input"
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleConfirmPayment(app.id)}
                style={{ whiteSpace: 'nowrap' }}
              >
                Confirm Payment
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setExpandedRowId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

**Confirm Payment Handler:**
```typescript
const handleConfirmPayment = async (applicationId: string) => {
  try {
    setIsLoading(true);
    
    await confirmPayment(
      applicationId,
      currentUserId, // From auth context
      {
        payment_date: paymentData.date,
        payment_notes: paymentData.notes || undefined
      }
    );
    
    // Show success message
    alert('Payment confirmed successfully'); // Or use your toast notification system
    
    // Collapse row
    setExpandedRowId(null);
    
    // Refresh applications list
    await refreshApplications();
    
  } catch (error) {
    console.error('Failed to confirm payment:', error);
    alert('Failed to confirm payment. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## CSS Updates (if needed)

Add to your CSS file (or inline styles):

```css
/* Smooth transition for checkbox */
input[type="checkbox"] {
  transition: all 0.2s ease;
}

/* Payment confirmation expanded row */
.payment-confirmation-row td {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## TAB 2: Pending EA Registration (Membership Secretary)

### Table Structure:

| ✓ | Name | Email | Type | Payment Confirmed | Actions |
|---|------|-------|------|-------------------|---------|

### Changes:

1. **Add checkbox column at start:**
   - Unchecked checkbox for each application
   - No label needed
   - Width: ~40px

2. **Remove "✓ Confirm EA" button from Actions column**
   - Keep "👁️ View Details" button

3. **Add expandable row functionality:**

**State Management:**
```typescript
const [expandedEARowId, setExpandedEARowId] = useState<string | null>(null);
const [eaData, setEAData] = useState<{
  urn: string;
  notes: string;
}>({
  urn: '',
  notes: ''
});
```

**Checkbox Handler:**
```typescript
const handleEACheckboxChange = (applicationId: string, isChecked: boolean, currentURN?: string) => {
  if (isChecked) {
    setExpandedEARowId(applicationId);
    // Pre-fill URN if application already has one
    setEAData({
      urn: currentURN || '',
      notes: ''
    });
  } else {
    setExpandedEARowId(null);
  }
};
```

**Row Rendering Pattern:**
```tsx
{applications.map((app) => (
  <React.Fragment key={app.id}>
    {/* Main row */}
    <tr className="member-table__row">
      <td className="member-table__cell">
        <input
          type="checkbox"
          checked={expandedEARowId === app.id}
          onChange={(e) => handleEACheckboxChange(app.id, e.target.checked, app.ea_urn_at_application)}
          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
        />
      </td>
      <td className="member-table__cell">{app.full_name}</td>
      <td className="member-table__cell">{app.email}</td>
      <td className="member-table__cell">
        {app.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim'}
      </td>
      <td className="member-table__cell">
        {formatDate(app.payment_confirmed_at)}
        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
          by {app.payment_confirmed_by_name}
        </div>
      </td>
      <td className="member-table__cell">
        <button onClick={() => viewDetails(app)}>👁️ View</button>
      </td>
    </tr>
    
    {/* Expanded row (conditionally rendered) */}
    {expandedEARowId === app.id && (
      <tr className="ea-confirmation-row">
        <td colSpan={6} style={{
          backgroundColor: 'var(--gray-50)',
          padding: '16px 24px',
          borderTop: '1px solid var(--gray-200)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            {/* EA URN */}
            <div style={{ flex: '0 0 250px' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>
                EA URN <span style={{ color: 'var(--red-primary)' }}>*</span>
              </label>
              <input
                type="text"
                value={eaData.urn}
                onChange={(e) => setEAData(prev => ({ ...prev, urn: e.target.value }))}
                placeholder="e.g., RA12345"
                className="form-input"
                required
              />
            </div>
            
            {/* EA Confirmation Notes */}
            <div style={{ flex: '1' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>
                Notes (optional)
              </label>
              <input
                type="text"
                value={eaData.notes}
                onChange={(e) => setEAData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about EA registration..."
                className="form-input"
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleConfirmEA(app.id)}
                disabled={!eaData.urn.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                Confirm EA Registration
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setExpandedEARowId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
))}
```

**Confirm EA Registration Handler:**
```typescript
const handleConfirmEA = async (applicationId: string) => {
  // Validate EA URN is provided
  if (!eaData.urn.trim()) {
    alert('EA URN is required');
    return;
  }

  try {
    setIsLoading(true);
    
    await confirmEARegistration(
      applicationId,
      currentUserId, // From auth context
      {
        new_ea_urn: eaData.urn.trim(),
        ea_confirmation_notes: eaData.notes || undefined
      }
    );
    
    // Show success message - emphasize that member profile is auto-updated
    alert('EA Registration confirmed successfully!\n\nMember profile has been automatically updated with EA affiliation status.');
    
    // Collapse row
    setExpandedEARowId(null);
    
    // Refresh applications list
    await refreshApplications();
    
  } catch (error) {
    console.error('Failed to confirm EA registration:', error);
    alert('Failed to confirm EA registration. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## User Flows

### Tab 1 User Flow (Treasurer):

### Tab 1 User Flow (Treasurer):

1. Treasurer sees list of pending payment applications
2. Checks payment received in their bank statement
3. **Ticks checkbox** for that application ✓
4. Row expands showing:
   - Payment date (defaults to today)
   - Optional notes field
   - "Confirm Payment" and "Cancel" buttons
5. Treasurer adjusts date if needed, adds notes if desired
6. Clicks "Confirm Payment"
7. Row collapses, application moves to Tab 2 (Pending EA Registration)
8. Success message shown
9. Repeat for next application

### Tab 2 User Flow (Membership Secretary):

1. Membership secretary sees list of payment-confirmed applications
2. Uploads member details to EA portal and receives EA URN
3. **Ticks checkbox** for that application ✓
4. Row expands showing:
   - EA URN input field (required) - pre-filled if member had URN from renewal
   - Optional notes field
   - "Confirm EA Registration" and "Cancel" buttons
5. Secretary enters/verifies EA URN, adds notes if desired
6. Clicks "Confirm EA Registration"
7. Row collapses, application moves to Tab 3 (Completed)
8. Success message confirms member profile auto-updated
9. Repeat for next application

---

## Benefits

### Tab 1 (Payment Confirmation):
- ✅ **Faster processing:** No modal popup delays
- ✅ **Better UX:** See all applications while confirming
- ✅ **Quick workflow:** Tick → Date → Confirm → Next
- ✅ **Keyboard friendly:** Tab through fields easily
- ✅ **Visual feedback:** Expanded row clearly shows active confirmation

### Tab 2 (EA Registration):
- ✅ **Consistent interface:** Same pattern as Tab 1
- ✅ **Fast data entry:** Enter URN without modal interruption
- ✅ **Pre-filled URN:** Shows existing URN for renewals
- ✅ **Required field validation:** Button disabled until URN entered
- ✅ **Clear feedback:** Success message confirms automatic profile update

### Overall:
- ✅ **Easy cancellation:** Uncheck checkbox or click Cancel on either tab
- ✅ **One at a time:** Only one row can be expanded at a time
- ✅ **Consistent UX:** Same interaction pattern across both approval steps

---

## Testing Checklist

### Tab 1 (Payment Confirmation):
- [ ] Checkbox unchecked by default
- [ ] Clicking checkbox expands row
- [ ] Expanded row shows payment date (defaults to today)
- [ ] Expanded row shows notes field
- [ ] Can edit payment date
- [ ] Can add optional notes
- [ ] "Confirm Payment" button works
- [ ] Success message shows on confirmation
- [ ] Row collapses after confirmation
- [ ] Application moves to Tab 2
- [ ] "Cancel" button collapses row
- [ ] Unchecking checkbox collapses row
- [ ] Only one row can be expanded at a time

### Tab 2 (EA Registration):
- [ ] Checkbox unchecked by default
- [ ] Clicking checkbox expands row
- [ ] Expanded row shows EA URN input field
- [ ] EA URN field is required (button disabled if empty)
- [ ] EA URN pre-filled if renewal application has existing URN
- [ ] Expanded row shows notes field (optional)
- [ ] Can enter EA URN
- [ ] Can add optional notes
- [ ] "Confirm EA Registration" button works (only when URN provided)
- [ ] Success message shows on confirmation with auto-update notice
- [ ] Row collapses after confirmation
- [ ] Application moves to Tab 3
- [ ] Member profile automatically updated (is_paid_member=true, ea_urn, etc.)
- [ ] "Cancel" button collapses row
- [ ] Unchecking checkbox collapses row
- [ ] Only one row can be expanded at a time

### General:
- [ ] Form inputs use existing CSS classes
- [ ] Smooth animation when expanding/collapsing
- [ ] Consistent styling across Tab 1 and Tab 2
- [ ] No conflicts between Tab 1 and Tab 2 expanded states

---

## Keep Unchanged

- Tab 3 (Completed & Cancelled) - **No changes**
- View Details modal - **No changes** (used for viewing full application details)
- Cancel application functionality - **No changes**
- Settings modal - **No changes**
- All service layer functions - **No changes**
- Member application form - **No changes**
- Dashboard integration - **No changes**

---

## Notes

- These are purely UI changes to Tab 1 and Tab 2
- The underlying service functions `confirmPayment()` and `confirmEARegistration()` remain the same
- All other functionality stays as originally implemented
- Modal code for payment and EA confirmation can be removed
- Keep the View Details modal - that's for viewing full applications, not for confirmations
- Both tabs use the same interaction pattern for consistency
