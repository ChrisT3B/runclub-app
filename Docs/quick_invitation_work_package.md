# Work Package: Quick Invitation Feature

**Project:** Run Alcester App  
**Target Completion:** Before Phase 2 Launch (pre-January 1st, 2026)  
**Developer:** Claude Code  
**Dependencies:** Week 1 Work Package (admin dashboard, invitation system must be complete)

---

## Overview

This work package adds two user-friendly ways to send individual invitations without CSV imports:

1. **Sidebar Invitation Form** - Quick invite from anywhere in the app (available to all authenticated users)
2. **Guest Member Invitation** - Invite guest members during attendance marking (LIRF feature)

### Use Cases

**Sidebar Form:**
- New prospective member inquiries
- Friends/family asking to join the club
- Quick one-off invitations without admin dashboard

**Guest Member Flow:**
- Someone walks up to a run without booking
- They enjoy the run and want to join permanently
- LIRF can immediately send them registration invitation

---

## Prerequisites

Before starting, ensure:
- Week 1 work package is complete:
  - `pending_invitations` table exists
  - Email templates and sending functions work
  - Registration flow with token validation works
- Existing email service is functional
- Guest member attendance marking feature exists

---

## Task 1: Create Invitation Utility Functions

### 1.1 Create Helper File

**File:** `src/utils/invitationHelpers.ts`

This creates reusable logic for checking duplicates and sending invitations.

```typescript
import { createClient } from '@supabase/supabase-js';
import { generateInvitationEmail } from './emailTemplates';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Send a quick invitation to a new member
 * Handles duplicate checking and appropriate actions
 * 
 * @param fullName - Full name of the person to invite
 * @param email - Email address to send invitation to
 * @param sendEmailFn - Function to send emails (pass your existing email service)
 * @returns Result object with success status and message
 */
export async function sendQuickInvitation(
  fullName: string,
  email: string,
  sendEmailFn: (to: string, subject: string, html: string) => Promise<void>
): Promise<{ 
  success: boolean; 
  message: string; 
  action?: 'invitation_sent' | 'password_reset' | 'reminder_sent';
  invitationId?: string;
}> {
  
  // Validate inputs
  if (!fullName || !email) {
    return { 
      success: false, 
      message: 'Name and email are required' 
    };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = fullName.trim();

  // STEP 1: Check if already registered
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    // User already registered - send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`
      }
    );

    if (resetError) {
      return { 
        success: false, 
        message: `${email} is already registered, but password reset email failed to send.` 
      };
    }

    return { 
      success: true, 
      message: `${email} is already registered! We've sent them a password reset link.`,
      action: 'password_reset'
    };
  }

  // STEP 2: Check if already has pending invitation
  const { data: existingInvitation, error: invitationError } = await supabase
    .from('pending_invitations')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvitation) {
    // Resend existing invitation as reminder
    const { subject, html } = generateInvitationEmail(
      existingInvitation.full_name,
      existingInvitation.token,
      import.meta.env.VITE_APP_URL
    );

    try {
      await sendEmailFn(normalizedEmail, subject, html);
      
      return { 
        success: true, 
        message: `${email} already has a pending invitation. We've sent them a reminder.`,
        action: 'reminder_sent',
        invitationId: existingInvitation.id
      };
    } catch (emailError) {
      return {
        success: false,
        message: `Failed to send reminder email: ${emailError.message}`
      };
    }
  }

  // STEP 3: Create new invitation
  const token = generateSecureToken();
  
  const { data: newInvitation, error: insertError } = await supabase
    .from('pending_invitations')
    .insert({
      email: normalizedEmail,
      full_name: trimmedName,
      token,
      status: 'pending',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (insertError) {
    return { 
      success: false, 
      message: `Failed to create invitation: ${insertError.message}` 
    };
  }

  // STEP 4: Send invitation email
  const { subject, html } = generateInvitationEmail(
    trimmedName,
    token,
    import.meta.env.VITE_APP_URL
  );

  try {
    await sendEmailFn(normalizedEmail, subject, html);
    
    return { 
      success: true, 
      message: `Invitation sent to ${email}!`,
      action: 'invitation_sent',
      invitationId: newInvitation.id
    };
  } catch (emailError) {
    // Invitation created but email failed
    // Delete the invitation to keep data clean
    await supabase
      .from('pending_invitations')
      .delete()
      .eq('id', newInvitation.id);
    
    return { 
      success: false, 
      message: `Failed to send invitation email: ${emailError.message}` 
    };
  }
}

/**
 * Generate a cryptographically secure token
 */
function generateSecureToken(): string {
  // Browser-compatible secure random token generation
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

### 1.2 Export from Utils Index

**File:** `src/utils/index.ts` (or create if doesn't exist)

```typescript
export { sendQuickInvitation } from './invitationHelpers';
export { generateInvitationEmail } from './emailTemplates';
// ... other exports
```

---

## Task 2: Sidebar Invitation Form Component

### 2.1 Create Component

**File:** `src/components/SendInvitationModal.tsx`

Create a reusable modal component for sending invitations:

```typescript
import { useState } from 'react';
import { sendQuickInvitation } from '../utils/invitationHelpers';
import { sendEmail } from '../services/emailService'; // Your existing email service

interface SendInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SendInvitationModal({ isOpen, onClose }: SendInvitationModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await sendQuickInvitation(fullName, email, sendEmail);
    
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    if (result.success) {
      // Clear form on success
      setFullName('');
      setEmail('');
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Send Invitation</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            type="button"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Send a registration invitation to a new member. They'll receive an email with a link to complete their registration.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Smith"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
              disabled={loading}
            />
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 2.2 Add to Sidebar Navigation

**File:** `src/components/Sidebar.tsx` (or your navigation component)

Add the invitation menu item and modal trigger:

```typescript
import { useState } from 'react';
import SendInvitationModal from './SendInvitationModal';
import { useAuth } from '../hooks/useAuth';

function Sidebar() {
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <nav className="sidebar">
        {/* Existing menu items */}
        <a href="/dashboard">Dashboard</a>
        <a href="/runs">Your Runs</a>
        
        {user && (
          <button
            onClick={() => setIsInvitationModalOpen(true)}
            className="sidebar-item"
          >
            <span className="icon">✉️</span>
            <span>Send Invitation</span>
          </button>
        )}
        
        {/* Rest of menu items */}
      </nav>

      <SendInvitationModal 
        isOpen={isInvitationModalOpen}
        onClose={() => setIsInvitationModalOpen(false)}
      />
    </>
  );
}
```

**Styling note:** Adapt the className to match your existing sidebar styling patterns.

---

## Task 3: Guest Member Invitation Integration

### 3.1 Update Guest Member Form

**File:** `src/components/AddGuestMemberForm.tsx` (or wherever your guest member logic lives)

Modify the existing Add Guest Member form to include invitation option:

```typescript
import { useState } from 'react';
import { sendQuickInvitation } from '../utils/invitationHelpers';
import { sendEmail } from '../services/emailService';
import { supabase } from '../lib/supabase';

interface AddGuestMemberFormProps {
  runId: string;
  onGuestAdded: (guestBooking: any) => void;
  onClose?: () => void;
}

export default function AddGuestMemberForm({ runId, onGuestAdded, onClose }: AddGuestMemberFormProps) {
  const [guestName, setGuestName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [sendInvitation, setSendInvitation] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // STEP 1: Add guest member to this run's attendance
      const { data: guestBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          run_id: runId,
          guest_name: guestName,
          emergency_contact_name: emergencyContact || null,
          emergency_contact_phone: emergencyPhone || null,
          is_guest: true,
          attended: true, // Marking as attended since they showed up
          booked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Failed to add guest: ${bookingError.message}`);
      }

      // Success notification for guest addition
      alert(`${guestName} added as guest member!`);

      // STEP 2: If "Send Invitation" was checked, send invitation email
      if (sendInvitation && email) {
        const invitationResult = await sendQuickInvitation(
          guestName,
          email,
          sendEmail
        );

        // Show invitation result
        if (invitationResult.success) {
          alert(invitationResult.message);

          // Optional: Link the guest booking to the invitation for tracking
          if (invitationResult.action === 'invitation_sent' && invitationResult.invitationId) {
            await supabase
              .from('pending_invitations')
              .update({ guest_booking_id: guestBooking.id })
              .eq('id', invitationResult.invitationId);
          }
        } else {
          alert(`Guest added, but invitation failed: ${invitationResult.message}`);
        }
      }

      // Clear form
      setGuestName('');
      setEmergencyContact('');
      setEmergencyPhone('');
      setEmail('');
      setSendInvitation(false);

      // Notify parent component
      if (onGuestAdded) {
        onGuestAdded(guestBooking);
      }

      // Close modal/form if provided
      if (onClose) {
        onClose();
      }

    } catch (error) {
      alert(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Guest Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="John Smith"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emergency Contact Name
        </label>
        <input
          type="text"
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="Jane Smith"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emergency Contact Phone
        </label>
        <input
          type="tel"
          value={emergencyPhone}
          onChange={(e) => setEmergencyPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="07123456789"
          disabled={loading}
        />
      </div>

      {/* INVITATION SECTION */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            checked={sendInvitation}
            onChange={(e) => setSendInvitation(e.target.checked)}
            className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={loading}
          />
          <div>
            <span className="text-sm font-medium text-gray-700 block">
              Send registration invitation email
            </span>
            <span className="text-xs text-gray-500">
              Invite this person to create a full account
            </span>
          </div>
        </label>
      </div>

      {/* Email field (only shows if checkbox is ticked) */}
      {sendInvitation && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={sendInvitation}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="john@example.com"
            disabled={loading}
          />
          <p className="text-xs text-gray-600 mt-2">
            We'll send them a link to complete their registration with pre-filled details
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Adding Guest Member...' : 'Add Guest Member'}
      </button>
    </form>
  );
}
```

### 3.2 Optional: Add Tracking Column to Database

If you want to track which invitations came from guest members (for conversion metrics):

```sql
-- Add optional column to link invitations to guest bookings
ALTER TABLE public.pending_invitations 
ADD COLUMN IF NOT EXISTS guest_booking_id UUID REFERENCES bookings(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_invitations_guest_booking 
ON public.pending_invitations(guest_booking_id);

-- Add comment
COMMENT ON COLUMN public.pending_invitations.guest_booking_id IS 
'Links invitation to the guest booking that triggered it - useful for tracking conversion from guest to registered member';
```

This is optional but useful for analytics:
- Which LIRFs are best at converting guests to members?
- What percentage of guest members eventually register?
- How long does it take from first guest attendance to registration?

---

## Task 4: Email Service Integration

### 4.1 Verify Email Service Exists

Ensure you have an email sending service that the utility functions can use.

**Expected interface:**

```typescript
// src/services/emailService.ts
export async function sendEmail(
  to: string, 
  subject: string, 
  html: string
): Promise<void> {
  // Your existing email sending logic
  // Should throw error if fails
}
```

If this doesn't exist, create it using your existing Gmail SMTP configuration from the bulk invitation sending script.

### 4.2 Handle Rate Limiting

For the sidebar form (one-off invitations), rate limiting is less critical. But consider adding:

```typescript
// Simple client-side rate limiting to prevent spam
const RATE_LIMIT_DELAY = 5000; // 5 seconds between invitations
let lastInvitationTime = 0;

export async function sendQuickInvitation(...args) {
  const now = Date.now();
  const timeSinceLastInvitation = now - lastInvitationTime;
  
  if (timeSinceLastInvitation < RATE_LIMIT_DELAY) {
    return {
      success: false,
      message: 'Please wait a few seconds before sending another invitation'
    };
  }
  
  lastInvitationTime = now;
  
  // ... rest of function
}
```

---

## Task 5: Testing Checklist

### 5.1 Sidebar Invitation Form Testing

**Basic Functionality:**
- [ ] Sidebar menu item appears for all authenticated users
- [ ] Modal opens when menu item clicked
- [ ] Modal closes when X button clicked
- [ ] Modal closes when Cancel button clicked
- [ ] Form validates required fields (name, email)
- [ ] Form validates email format

**Invitation Scenarios:**
- [ ] New email: Creates invitation, sends email, shows success message
- [ ] Already registered email: Sends password reset, shows appropriate message
- [ ] Already pending email: Sends reminder, shows appropriate message
- [ ] Invalid email format: Shows validation error
- [ ] Empty name: Shows validation error
- [ ] Network error: Shows error message appropriately

**UX/Polish:**
- [ ] Form clears after successful submission
- [ ] Modal auto-closes after 2 seconds on success
- [ ] Loading state disables buttons and inputs
- [ ] Success message is green with checkmark
- [ ] Error message is red with warning icon
- [ ] Can't submit form while loading
- [ ] Keyboard navigation works (Tab, Enter, Esc)

### 5.2 Guest Member Invitation Testing

**Guest Addition:**
- [ ] Can add guest with just name (minimum required)
- [ ] Can add guest with emergency contact details
- [ ] Guest appears in attendance list immediately
- [ ] Guest booking marked as attended=true

**Invitation Checkbox:**
- [ ] Checkbox appears on form
- [ ] Email field hidden by default
- [ ] Email field appears when checkbox ticked
- [ ] Email field disappears when checkbox unticked
- [ ] Email field required when checkbox ticked
- [ ] Email field not required when checkbox unticked

**Combined Flow:**
- [ ] Guest added successfully without invitation (checkbox off)
- [ ] Guest added + invitation sent (checkbox on, new email)
- [ ] Guest added + password reset sent (checkbox on, registered email)
- [ ] Guest added + reminder sent (checkbox on, pending email)
- [ ] Both success messages show for guest + invitation
- [ ] Guest added even if invitation fails
- [ ] Error message clear if invitation fails

**Edge Cases:**
- [ ] Rapid clicking doesn't create duplicate guests
- [ ] Rapid clicking doesn't send duplicate invitations
- [ ] Form clears after successful submission
- [ ] Works on mobile devices
- [ ] Non-ASCII characters in names handled correctly
- [ ] Very long names don't break UI

### 5.3 Database & Email Testing

**Database:**
- [ ] Invitations created with correct status='pending'
- [ ] Tokens are unique and secure (32 characters, random)
- [ ] Expiry dates set to +30 days
- [ ] guest_booking_id linked correctly (if implemented)
- [ ] No duplicate emails in pending_invitations
- [ ] Emails normalized to lowercase

**Email Delivery:**
- [ ] Emails arrive in inbox (not spam)
- [ ] Email formatting looks correct
- [ ] Registration links work
- [ ] Password reset links work
- [ ] Email content includes correct name
- [ ] Unsubscribe link present (if required)

### 5.4 Integration Testing

**End-to-End Scenarios:**

**Scenario 1: New member from sidebar**
1. User clicks "Send Invitation" in sidebar
2. Enters name and email
3. Submits form
4. Success message appears
5. Email received
6. Clicks link in email
7. Registration form pre-filled
8. Completes registration
9. Can log in successfully

**Scenario 2: Guest converts to member**
1. LIRF marks attendance
2. Adds guest member (John Smith)
3. Checks "Send invitation"
4. Enters email
5. Submits form
6. Guest appears in attendance
7. Email received
8. Clicks link in email
9. Registration form pre-filled with John Smith
10. Completes registration
11. Next run, John books through app (not guest)

**Scenario 3: Already registered**
1. User tries to invite existing@member.com
2. System detects already registered
3. Sends password reset instead
4. Shows message: "Already registered, sent password reset"
5. Existing member receives password reset email
6. Can reset password and log in

**Scenario 4: Duplicate prevention**
1. User sends invitation to pending@example.com
2. Later, someone else tries to invite same email
3. System detects pending invitation
4. Sends reminder instead of creating duplicate
5. Shows message: "Already invited, sent reminder"

---

## Task 6: Documentation

### 6.1 Update User Documentation

Add to your help videos or FAQ:

**For All Users:**
- How to invite someone using the sidebar form
- When to use quick invite vs CSV import

**For LIRFs:**
- How to invite guest members during attendance marking
- Best practices for converting guests to members

### 6.2 Update Technical Documentation

**File:** `README.md` or `docs/INVITATIONS.md`

Add section:

```markdown
## Quick Invitation Feature

### Sidebar Invitation Form

Available to all authenticated users. Allows sending individual invitations without admin dashboard access.

**Usage:**
1. Click "Send Invitation" in sidebar
2. Enter name and email
3. System handles duplicates automatically:
   - Already registered → Sends password reset
   - Already pending → Sends reminder
   - New → Creates invitation and sends email

### Guest Member Invitation

Available to LIRFs during attendance marking.

**Usage:**
1. Navigate to "Manage Attendance" for your run
2. Click "Add Guest Member"
3. Enter guest details
4. Check "Send invitation email"
5. Enter email address
6. Submit - guest is added AND invitation sent

**Tracking:**
Guest bookings can be linked to invitations via `guest_booking_id` for conversion analytics.
```

### 6.3 Add Code Comments

Ensure the `invitationHelpers.ts` file has clear JSDoc comments explaining:
- What each function does
- Parameters and return types
- Error handling behavior
- Examples of usage

---

## Deliverables Summary

By completion of this work package, you should have:

1. ✅ **Invitation Helper Functions** (`invitationHelpers.ts`)
   - Duplicate detection logic
   - Password reset for registered emails
   - Reminder for pending invitations
   - Secure token generation

2. ✅ **Sidebar Invitation Form**
   - Modal component
   - Available to all authenticated users
   - Full validation and error handling
   - Success/error messaging

3. ✅ **Guest Member Invitation**
   - Checkbox in Add Guest form
   - Conditional email field
   - Combined guest addition + invitation flow
   - Optional database tracking

4. ✅ **Testing Coverage**
   - Unit tests for helper functions (optional)
   - Manual testing checklist completed
   - End-to-end scenarios verified

5. ✅ **Documentation**
   - User guides updated
   - Technical documentation updated
   - Code comments added

---

## Post-Implementation Notes

### Monitoring After Launch

Track these metrics:
- Number of invitations sent via sidebar vs guest member flow
- Conversion rate from guest to registered member
- Most common error messages (indicates UX issues)
- Time from invitation sent to registration completed

### Potential Enhancements (Future)

Consider adding later:
- Bulk invite via sidebar (multiple emails at once)
- Invitation history page ("Who did I invite?")
- Custom invitation messages
- SMS invitation option (for members without email)
- Auto-invite after X guest attendances
- LIRF leaderboard (most successful at converting guests)

---

## Timeline

**Estimated Time:** 1-2 days

**Day 1:**
- Task 1: Helper functions (2-3 hours)
- Task 2: Sidebar form (2-3 hours)

**Day 2:**
- Task 3: Guest member integration (3-4 hours)
- Task 4: Email service verification (1 hour)
- Task 5: Testing (2-3 hours)
- Task 6: Documentation (1 hour)

---

## Questions or Issues?

If you encounter blockers:
1. Check Week 1 work package is fully complete
2. Verify email service is working
3. Test with small datasets first
4. Review Supabase RLS policies if permission errors occur

Good luck! 🚀
