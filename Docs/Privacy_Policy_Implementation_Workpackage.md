# Work Package: Privacy Policy Implementation

**Project:** Run Alcester Booking App  
**Priority:** HIGH - Required for launch compliance  
**Estimated Effort:** 4-6 hours  
**Due Date:** Before March 3, 2026 launch

---

## Overview

Create a digital privacy policy page for the Run Alcester booking app and integrate privacy acceptance into authentication flows. The privacy page will cover digital-specific data handling and reference the existing Run Alcester Privacy Notice PDF.

---

## Objectives

1. Create a `/privacy` route with comprehensive digital privacy information
2. Add privacy acceptance checkbox to registration form
3. Add privacy policy links to sign-in and sign-up pages
4. Track privacy policy acceptance in database
5. Ensure GDPR compliance for digital data collection

---

## Prerequisites

- Existing Run Alcester Privacy Notice PDF is available at `/documents/privacy-notice.pdf` (or confirm actual location)
- Access to Supabase database for schema changes
- Understanding of current authentication flow (sign-in, sign-up, registration)

---

## Task 1: Create Privacy Policy Page Component

### File to Create
`src/pages/PrivacyPolicy.tsx` (or appropriate location in your routing structure)

### Requirements

#### Page Structure
- Clean, readable layout with proper typography
- Responsive design (mobile-friendly)
- Use existing app styling (CSS variables from `main.css`)
- Page header using `PageHeader` component with title "Privacy Policy"
- Last updated date displayed prominently: "Last Updated: March 1, 2026"
- Link back to home/sign-in at top

#### Content Sections (in order)

**1. Introduction**
```markdown
This page explains how we handle your personal data in our digital booking application.

For our complete club privacy policy covering membership and club activities, please see our 
[Run Alcester Privacy Notice (PDF)](/documents/privacy-notice.pdf).

This digital privacy information should be read alongside our main Privacy Notice.
```

**2. Quick Summary** (bullet points)
- We store your data securely in encrypted EU-based databases
- We send automated emails for bookings and reminders  
- We maintain security logs to protect your account
- Your session expires after 8 hours of inactivity
- You have full control over your data

**3. What Digital Data We Collect**

*Account Security:*
- Login email address and encrypted password
- Session tokens for authentication
- Device fingerprints (for security and fraud prevention)
- Security logs (login attempts, timestamps, IP fingerprints)

*Application Usage:*
- Run booking history and attendance records
- Session voucher purchases and usage
- Payment transaction records
- Notification preferences

*Emergency Information:*
- Emergency contact name, relationship, and phone number (for safety during runs)

**4. How We Use Your Digital Data**

*System Operation:*
- Authenticating your login and maintaining your session
- Processing run bookings and managing session vouchers
- Sending automated emails (booking confirmations, reminders, password resets)
- Generating attendance reports for LIRFs and administrators

*Security & Fraud Prevention:*
- Detecting suspicious login activity
- Preventing unauthorized account access
- Monitoring system abuse or fraudulent bookings
- Account lockout after 5 failed login attempts (15-minute lockout period)
- Session hijacking detection through device fingerprinting

**5. Digital Storage & Hosting**

Your data is stored securely using:

- **Supabase** - PostgreSQL database hosted in AWS EU data centers (GDPR compliant)
- **Vercel** - Application hosting with EU data processing (GDPR compliant)
- **Encryption** - All data encrypted in transit (HTTPS) and at rest
- **Backups** - Regular automated encrypted backups stored securely

**6. Automated Communications**

You will receive automated emails for:
- Run booking confirmations and cancellations
- LIRF assignment notifications (if you're a run leader)
- Password reset requests
- Important system updates and club announcements

You can manage your email notification preferences in your account settings.

**7. Security Measures**

We protect your account with:
- **Password Requirements** - Minimum 8 characters with complexity requirements
- **Session Security** - 8-hour session expiry with automatic logout
- **Device Fingerprinting** - Detects session hijacking attempts
- **Account Lockout** - 15-minute lockout after 5 failed login attempts
- **Security Monitoring** - All login attempts logged for security review
- **Regular Audits** - Ongoing security reviews and vulnerability assessments

**8. Session Management & Progressive Web App**

Our app functions as a Progressive Web App (PWA):
- Can be installed on your device's home screen for app-like experience
- Limited data cached locally for faster performance
- No personal data stored permanently on your device
- Session expires after 8 hours of inactivity
- Automatic logout if device fingerprint changes

**9. Third-Party Services**

The app uses the following GDPR-compliant services:

- **Supabase** - Database and authentication (EU hosting, GDPR compliant)
- **Vercel** - Application hosting (EU data centers, GDPR compliant)  
- **Gmail SMTP** - Email delivery service (Google Workspace, GDPR compliant)

All third-party processors have appropriate data processing agreements in place.

**10. Data Retention**

- **Active account data** - Retained while you're a member plus 1 year
- **Booking history** - Retained for 3 years for attendance records
- **Payment records** - Retained for 6 years (legal requirement)
- **Security logs** - Login attempts: 7 days, Security events: 30 days
- **Account deletion** - When you leave the club, your account is deactivated within 30 days and all non-essential data deleted within 1 year

**11. Your Rights Under GDPR**

You have the following rights regarding your personal data:

- **Right to Access** - Request a copy of all data we hold about you
- **Right to Rectification** - Ask us to correct inaccurate information
- **Right to Erasure** - Request deletion of your data (subject to legal requirements)
- **Right to Restrict Processing** - Ask us to limit how we use your data
- **Right to Data Portability** - Receive your data in a portable format
- **Right to Object** - Object to certain types of processing
- **Right to Withdraw Consent** - Withdraw consent for processing (e.g., marketing emails)

To exercise any of these rights, please contact us at [insert club contact email].

We will respond within one month of your request.

For full details of your rights, please see our [Run Alcester Privacy Notice (PDF)](/documents/privacy-notice.pdf).

**12. Children's Privacy**

Members under 18 require parental/guardian consent:
- Parents/guardians must provide consent during registration
- Parents/guardians can access and manage their child's information
- Parents/guardians are the primary contact for all communications

**13. Changes to This Policy**

We may update this privacy information to reflect:
- Changes in data protection law
- New features in the booking app
- Improvements to our security practices

We will notify members of significant changes by:
- Email to all members
- Notice on app homepage
- Announcement in Facebook group

**14. Questions or Concerns**

If you have questions about how we handle your data:

**Email:** [insert club contact email]  
**Response Time:** Within 5 working days

**Making a Complaint:**

If you're unhappy with how we've handled your data:

1. Contact us first at the email above
2. If unsatisfied, contact the **Information Commissioner's Office (ICO)**:
   - Website: [ico.org.uk](https://ico.org.uk)
   - Phone: 0303 123 1113

**15. Acceptance**

By creating an account and using the Run Alcester booking app, you confirm that:
- You have read and understood this privacy information
- You consent to the collection and use of your information as described
- You understand your rights regarding your personal data

---

**Last Updated:** March 1, 2026  
**Version:** 1.0

---

#### Styling Requirements

Use existing app CSS patterns:
- `.card` class for main content container
- `.card-content` for inner padding
- `.card-title` for section headings (h2)
- Subheadings as h3 with consistent styling
- Paragraphs with proper line-height for readability
- Bullet points using standard `<ul>` and `<li>` elements
- Links styled consistently with app theme (use `<a>` with appropriate classes)
- Responsive padding and margins for mobile devices
- Max-width constraint for optimal reading (e.g., 800px)

#### Component Structure Example

```tsx
import React from 'react';
import PageHeader from '../shared/components/PageHeader';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div>
      <PageHeader title="Privacy Policy" />
      
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-content">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Last Updated: March 1, 2026 | Version 1.0
          </p>

          {/* Introduction Section */}
          <section style={{ marginBottom: '32px' }}>
            <h2 className="card-title">Introduction</h2>
            <p>
              This page explains how we handle your personal data in our digital booking application.
            </p>
            <p>
              For our complete club privacy policy covering membership and club activities, please see our{' '}
              <a href="/documents/privacy-notice.pdf" target="_blank" rel="noopener noreferrer">
                Run Alcester Privacy Notice (PDF)
              </a>.
            </p>
            {/* ... rest of content ... */}
          </section>

          {/* Additional sections following same pattern */}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Link to="/login" className="btn btn-secondary">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
```

---

## Task 2: Add Privacy Route

### File to Modify
`src/App.tsx` (or wherever routes are defined)

### Changes Required

Add the privacy policy route:

```tsx
import PrivacyPolicy from './pages/PrivacyPolicy';

// Inside your Routes component:
<Route path="/privacy" element={<PrivacyPolicy />} />
```

Ensure the route is accessible without authentication (public route).

---

## Task 3: Update Registration Form

### File to Modify
`src/modules/auth/pages/Register.tsx` (or wherever registration form is located)

### Changes Required

**1. Add State for Privacy Acceptance**

```tsx
const [privacyAccepted, setPrivacyAccepted] = useState(false);
```

**2. Add Privacy Checkbox Before Submit Button**

Place this just above the submit button in the form:

```tsx
<div style={{ marginBottom: '24px' }}>
  <label
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      cursor: 'pointer',
    }}
  >
    <input
      type="checkbox"
      checked={privacyAccepted}
      onChange={(e) => setPrivacyAccepted(e.target.checked)}
      required
      style={{ marginTop: '4px' }}
    />
    <span style={{ fontSize: '14px' }}>
      I have read and agree to the{' '}
      <a 
        href="/privacy" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'var(--blue-primary)', textDecoration: 'underline' }}
      >
        Digital App Privacy Policy
      </a>
      {' '}and{' '}
      <a 
        href="/documents/privacy-notice.pdf" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'var(--blue-primary)', textDecoration: 'underline' }}
      >
        Run Alcester Privacy Notice
      </a>
    </span>
  </label>
</div>
```

**3. Update Submit Button to Require Checkbox**

Disable submit button if privacy not accepted:

```tsx
<button
  type="submit"
  className="btn btn-primary"
  disabled={loading || !privacyAccepted}
>
  {loading ? 'Creating Account...' : 'Create Account'}
</button>
```

**4. Add Helper Text if Checkbox Not Checked**

```tsx
{!privacyAccepted && (
  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
    You must accept the privacy policy to create an account
  </p>
)}
```

---

## Task 4: Update Member Invitation Registration Form

### File to Modify
`src/modules/auth/pages/InvitationRegister.tsx` (or wherever invitation-based registration is handled)

### Changes Required

Apply the same privacy acceptance checkbox as in Task 3 above. Ensure that:
- Privacy checkbox is required
- Both privacy policy and main privacy notice are linked
- Submit button is disabled until checkbox is checked

---

## Task 5: Add Privacy Link to Sign In Page

### File to Modify
`src/modules/auth/pages/Login.tsx` (or wherever sign-in form is located)

### Changes Required

Add privacy policy link below the sign-in form (after the submit button):

```tsx
<div style={{ textAlign: 'center', marginTop: '16px' }}>
  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
    By signing in, you agree to our{' '}
    <a 
      href="/privacy" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: 'var(--blue-primary)', textDecoration: 'underline' }}
    >
      Privacy Policy
    </a>
  </p>
</div>
```

---

## Task 6: Database Schema Updates

### File to Create/Modify
Create a new migration file or document the SQL changes needed

### Schema Changes Required

**Add Privacy Policy Acceptance Tracking to Members Table:**

```sql
-- Add columns to track privacy policy acceptance
ALTER TABLE members
ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(10) DEFAULT '1.0';

-- Add index for querying members who haven't accepted latest version
CREATE INDEX IF NOT EXISTS idx_members_privacy_accepted 
ON members(privacy_policy_accepted_at);

-- Comment the columns for documentation
COMMENT ON COLUMN members.privacy_policy_accepted_at IS 'Timestamp when user accepted privacy policy during registration';
COMMENT ON COLUMN members.privacy_policy_version IS 'Version of privacy policy accepted (e.g., 1.0, 1.1)';
```

### Update Registration Service

**File to Modify:** Registration service where new members are created

**Changes Required:**

When creating a new member record, include:

```tsx
privacy_policy_accepted_at: new Date().toISOString(),
privacy_policy_version: '1.0'
```

Example in registration handler:

```tsx
const { data: member, error: memberError } = await supabase
  .from('members')
  .insert({
    // ... existing fields ...
    privacy_policy_accepted_at: new Date().toISOString(),
    privacy_policy_version: '1.0'
  })
  .select()
  .single();
```

---

## Task 7: Update Affiliated Member Application Form

### File to Modify
`src/modules/membership/components/AffiliatedMemberApplicationForm.tsx`

### Changes Required

**Update Existing Privacy Declaration:**

Find the existing privacy declaration checkbox (currently says "Personal information will not be disclosed...") and update it to:

```tsx
<label
  style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
  }}
>
  <input
    type="checkbox"
    name="declaration_data_privacy"
    checked={formData.declaration_data_privacy}
    onChange={handleInputChange}
    style={{ marginTop: '4px' }}
  />
  <span style={{ fontSize: '14px' }}>
    I have read and agree to the{' '}
    <a 
      href="/privacy" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: 'var(--blue-primary)', textDecoration: 'underline' }}
    >
      Digital App Privacy Policy
    </a>
    {' '}and{' '}
    <a 
      href="/documents/privacy-notice.pdf" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: 'var(--blue-primary)', textDecoration: 'underline' }}
    >
      Run Alcester Privacy Notice
    </a>
    . I understand that personal information will not be disclosed to any third party with the exception of England Athletics for affiliation or registration purposes.
  </span>
</label>
```

---

## Task 8: Verify Privacy Notice PDF Location

### Action Required

1. Confirm that the Run Alcester Privacy Notice PDF exists at `/public/documents/privacy-notice.pdf`
2. If it's in a different location, update all links in the above tasks accordingly
3. Ensure the PDF is accessible via the app's public URL

**If PDF needs to be added:**
- Place PDF in `/public/documents/` directory
- Verify it's accessible at `https://app.runalcester.co.uk/documents/privacy-notice.pdf`

---

## Task 9: Testing Checklist

### Manual Testing Required

**Privacy Policy Page:**
- [ ] Navigate to `/privacy` and verify page renders correctly
- [ ] Verify all content sections are present and readable
- [ ] Check mobile responsiveness (test on phone screen width)
- [ ] Verify link to PDF privacy notice works
- [ ] Verify "Back to Sign In" link works
- [ ] Check all section headings are properly styled

**Registration Form:**
- [ ] Verify privacy acceptance checkbox appears
- [ ] Confirm both privacy links work (open in new tab)
- [ ] Verify submit button is disabled when checkbox unchecked
- [ ] Verify form submits successfully when checkbox is checked
- [ ] Check that `privacy_policy_accepted_at` timestamp is recorded in database
- [ ] Check that `privacy_policy_version` is set to '1.0' in database

**Invitation Registration Form:**
- [ ] Same tests as registration form above
- [ ] Verify invitation token still works with new privacy checkbox

**Sign In Page:**
- [ ] Verify privacy policy link appears below sign-in button
- [ ] Verify link works (opens in new tab)
- [ ] Verify text is styled correctly and readable

**Affiliated Member Application:**
- [ ] Verify updated privacy declaration checkbox
- [ ] Verify both privacy links work
- [ ] Verify form submission works with new checkbox

**Database Verification:**
- [ ] Create test account and verify privacy fields are populated
- [ ] Query database to confirm schema changes applied correctly:
  ```sql
  SELECT privacy_policy_accepted_at, privacy_policy_version 
  FROM members 
  WHERE email = 'test@example.com';
  ```

---

## Task 10: Documentation Updates

### Update Project Documentation

Create or update the following documentation:

**1. Privacy Policy Change Log**

Create `docs/privacy-policy-changelog.md`:

```markdown
# Privacy Policy Change Log

## Version 1.0 - March 1, 2026
- Initial digital privacy policy created
- Added to app at `/privacy` route
- Integrated into registration and sign-in flows
- Database tracking implemented for acceptance
```

**2. Admin Guide Update**

Add section to admin documentation about privacy policy:
- How to view which members have accepted privacy policy
- How to handle privacy-related member queries
- Process for updating privacy policy version in future

---

## Deployment Checklist

Before deploying to production:

- [ ] Run Supabase migrations to add database columns
- [ ] Verify PDF privacy notice is accessible at correct URL
- [ ] Test all privacy links work in production environment
- [ ] Verify privacy page renders correctly on production domain
- [ ] Test registration flow end-to-end on production
- [ ] Confirm database fields are populated correctly on production
- [ ] Update any environment-specific URLs if needed

---

## Rollback Plan

If issues arise after deployment:

1. **Database rollback** is NOT recommended (would lose tracking data)
2. **Quick fix:** Comment out privacy checkbox requirement temporarily:
   ```tsx
   // disabled={loading || !privacyAccepted}
   disabled={loading}
   ```
3. **Proper rollback:** Revert commits for Tasks 3-5 (keep privacy page live, just remove requirement)
4. Database columns can remain (they won't cause issues if not used)

---

## Success Criteria

This work package is complete when:

✅ Privacy policy page is live at `/privacy` with all required content  
✅ Registration forms require privacy acceptance before submission  
✅ Sign-in page displays privacy policy reference  
✅ Database tracks privacy acceptance timestamp and version  
✅ All links work correctly (privacy page and PDF)  
✅ Mobile experience is smooth and readable  
✅ All testing checklist items pass  
✅ Changes deployed to production successfully  

---

## Notes for Implementation

- Use existing component patterns and styling throughout
- Maintain consistency with current app design language
- Ensure accessibility (proper heading hierarchy, link contrast)
- Test on multiple browsers (Chrome, Safari, Firefox, Edge)
- Test on multiple devices (desktop, tablet, phone)
- Keep content clear and member-friendly (avoid legal jargon where possible)
- Ensure GDPR compliance throughout implementation

---

## Questions to Resolve Before Starting

1. **Confirm PDF location:** Where is the Run Alcester Privacy Notice PDF currently hosted?
2. **Contact email:** What email should be used for privacy-related queries in the privacy policy content?
3. **Existing registration service:** Which file contains the member creation logic that needs updating?
4. **Route structure:** Confirm the routing setup (React Router? Which version?)

---

## Estimated Time Breakdown

- Task 1 (Privacy Page): 2 hours
- Task 2 (Route): 15 minutes  
- Task 3 (Registration Form): 45 minutes
- Task 4 (Invitation Form): 30 minutes
- Task 5 (Sign In Link): 15 minutes
- Task 6 (Database): 30 minutes
- Task 7 (Affiliated Form): 30 minutes
- Task 8 (PDF Verification): 15 minutes
- Task 9 (Testing): 1.5 hours
- Task 10 (Documentation): 30 minutes

**Total: ~6.5 hours**

---

**Work Package Created:** February 15, 2026  
**Target Completion:** Before March 3, 2026 launch  
**Assigned To:** Claude Code / Development Team
