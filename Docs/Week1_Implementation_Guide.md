# Week 1 Implementation Guide

## Overview

This guide documents the implementation of three major features for the Run Alcester app:
1. Admin Reporting Dashboard
2. Member Pre-Population & Invitation System
3. Video Help Page

All features have been successfully implemented and are ready for deployment.

---

## 1. Database Setup

### Step 1: Run Database Migration

Execute the SQL migration script in your Supabase SQL editor:

**File:** `database/migrations/001_pending_invitations.sql`

This will:
- Create the `pending_invitations` table
- Set up Row Level Security (RLS) policies
- Add indexes for performance
- Add `invited_at` column to `members` table

**Verification:**
```sql
-- Verify table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'pending_invitations';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'pending_invitations';

-- Check policies
SELECT policyname FROM pg_policies WHERE tablename = 'pending_invitations';
```

---

## 2. Environment Variables

### Required Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key  # For scripts only!

# Email (Gmail SMTP)
GMAIL_USER=runalcester@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App-specific password

# App URL
VITE_APP_URL=https://app.runalcester.co.uk

# API Endpoint
VITE_API_URL=https://runclub-app.vercel.app/api
```

### Important Notes

- **SUPABASE_SERVICE_KEY**: NEVER commit this to Git or expose in frontend code. Only use in Node.js scripts.
- **GMAIL_APP_PASSWORD**: Generate from Google Account > Security > 2-Step Verification > App Passwords

---

## 3. Installing Dependencies

The scripts require `tsx` and `csv-parse` packages:

```bash
npm install --save-dev tsx csv-parse
```

All other dependencies are already included in package.json.

---

## 4. Member Invitation System

### Step 1: Prepare CSV File

Create a CSV file with member data. Required columns:
- `full_name` (required)
- `email` (required)
- `phone` (optional)
- `emergency_contact_name` (optional)
- `emergency_contact_phone` (optional)

**Example CSV (`members.csv`):**
```csv
full_name,email,phone,emergency_contact_name,emergency_contact_phone
John Smith,john@example.com,07123456789,Jane Smith,07987654321
Sarah Jones,sarah@example.com,07234567890,Mike Jones,07345678901
```

### Step 2: Import Members

Run the import script:

```bash
npm run import-invitations ./members.csv
```

**What it does:**
1. Reads the CSV file
2. Generates unique tokens for each member
3. Inserts records into `pending_invitations` table
4. Creates a JSON file with results and invitation links

**Output:**
```
📋 Run Alcester - Member Invitation Import
========================================

✓ Found 70 members to import

Starting import...

✓ Imported: john@example.com
✓ Imported: sarah@example.com
...

========================================
📊 Import Summary
========================================
✓ Successful: 70
✗ Failed: 0
📁 Results saved to: import-results-2025-01-15T10-30-00-000Z.json

📧 Sample Invitation Links (first 3):

john@example.com:
https://app.runalcester.co.uk/register?token=abc123...

sarah@example.com:
https://app.runalcester.co.uk/register?token=def456...
```

The results JSON file contains all invitation links for distribution.

### Step 3: Send Invitation Emails

When ready to send emails (e.g., January 1st):

```bash
npm run send-invitations
```

**Options:**
- Add `--no-confirm` flag to skip the 5-second confirmation delay
- The script will send emails to all pending invitations
- Rate limited to 1 email per second to avoid Gmail limits
- Takes approximately 70 seconds for 70 members

**What recipients see:**
- Professional HTML email with club branding
- "Complete Registration" button
- Pre-populated registration link
- Reminder that they can still attend runs without registering

### Step 4: Monitor Progress

Admins can track invitation status at: **Dashboard > Reports**

The Reports page shows:
- Total Invited
- Registered
- Pending
- Registration Rate %

---

## 5. Admin Reports Dashboard

### Accessing

1. Log in as admin user
2. Navigate to **Reports** in the sidebar

### Features

**Section 1: Registration Statistics**
- Total Invited
- Registered
- Pending
- Registration Rate

**Section 2: Active User Metrics**
- Total Users
- Active Users (booked in last 30 days)
- Bookings This Month
- Attendance This Month

**Section 3: 7-Day LIRF Assignment Look-Ahead**
- Table of upcoming runs
- Shows which runs have LIRF assigned
- Highlights unassigned runs in red

**Section 4: Pending Invitations Management**
- List of all pending invitations
- "Resend" button to generate new token and extend expiry
- "Copy Link" button to copy invitation URL

### Resending Invitations

If a member loses their invitation email:

1. Go to Reports page
2. Find the member in "Pending Invitations" table
3. Click "Resend" to generate new token and send email
4. Or click "Copy Link" to manually share the URL

---

## 6. Video Help Page

### Accessing

Available to all users (even before login) at: **Help Videos** in sidebar

Or direct URL: `https://app.runalcester.co.uk/help-videos`

### Content Structure

**For Members (always visible):**
1. Welcome to Run Alcester - How to Register
2. How to Book a Run
3. Managing Your Profile and Emergency Contacts
4. Understanding Credits and Payments

**For LIRFs (visible to LIRF/Admin only):**
5. How to View and Schedule Runs
6. How to Assign Yourself to a Run
7. Viewing Bookings and Marking Attendance
8. Troubleshooting Common Issues

### Updating Video IDs

**File to edit:** `src/modules/help/pages/HelpVideos.tsx`

After uploading videos to YouTube:

1. Get the video ID from the URL:
   - URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - ID: `dQw4w9WgXcQ`

2. Update the `videos` array:
```typescript
const videos: Video[] = [
  {
    id: '1',
    title: 'Welcome to Run Alcester - How to Register',
    youtubeId: 'YOUR_ACTUAL_VIDEO_ID',  // Replace this
    description: 'Learn how to create your account...',
    category: 'member',
  },
  // ... other videos
]
```

3. Test by visiting `/help-videos` in the app

### YouTube Upload Recommendations

- Upload as "Unlisted" (only accessible with link)
- Portrait or landscape orientation both work
- Keep videos 2-3 minutes long
- Enable embedding in YouTube settings
- Use descriptive titles matching the app

---

## 7. Registration Flow Updates

### How It Works

1. User receives invitation email with link: `https://app.runalcester.co.uk/register?token=abc123...`
2. Registration form automatically:
   - Fetches invitation data from database
   - Pre-fills name, email, phone, emergency contacts
   - Locks email field (can't be changed)
   - Shows welcome banner
3. After successful registration:
   - Invitation status changes to "accepted"
   - Email verification sent as usual
   - Member record will be linked to invitation

### Testing

1. Create test invitation:
```bash
echo "full_name,email,phone,emergency_contact_name,emergency_contact_phone
Test User,test@example.com,07123456789,Emergency Contact,07987654321" > test.csv

npm run import-invitations ./test.csv
```

2. Copy the invitation link from the output
3. Open link in browser (incognito mode recommended)
4. Verify form is pre-filled
5. Complete registration
6. Check Reports page - invitation should show as "accepted"

---

## 8. Navigation Updates

New navigation items added:

**All Users:**
- Help Videos (📹)

**Admins Only:**
- Reports (📊)

Navigation automatically shows/hides based on user permissions.

---

## 9. File Structure

```
runclub-app/
├── database/
│   └── migrations/
│       └── 001_pending_invitations.sql
├── scripts/
│   ├── import-invitations.ts       # CSV import
│   └── send-invitations.ts         # Email sending
├── src/
│   ├── modules/
│   │   ├── admin/
│   │   │   └── pages/
│   │   │       └── AdminReports.tsx
│   │   ├── auth/
│   │   │   └── components/
│   │   │       └── RegisterForm.tsx  # Updated
│   │   ├── communications/
│   │   │   └── utils/
│   │   │       └── emailTemplates.ts
│   │   └── help/
│   │       └── pages/
│   │           └── HelpVideos.tsx
│   ├── AppContent.tsx              # Updated
│   └── shared/
│       └── components/
│           └── navigation/
│               └── Sidebar.tsx     # Updated
├── Docs/
│   ├── Week1_work_package.md
│   └── Week1_Implementation_Guide.md
├── .env.example
└── package.json                    # Updated
```

---

## 10. Testing Checklist

### Admin Dashboard
- [ ] Navigate to `/admin-reports` as admin user
- [ ] Verify non-admin users cannot access
- [ ] Registration stats display correctly
- [ ] Active user metrics calculate correctly
- [ ] 7-day LIRF look-ahead shows correct runs
- [ ] Runs without LIRF assignments highlighted in red
- [ ] Refresh button updates data

### Invitation System
- [ ] Import test CSV with 2-3 members
- [ ] Verify records created in `pending_invitations` table
- [ ] Registration link works
- [ ] Form pre-fills correctly
- [ ] Email field is locked
- [ ] After registration, status changes to 'accepted'
- [ ] Invalid token shows error
- [ ] Expired token shows error (test by manually updating expires_at)
- [ ] Resend button generates new token
- [ ] Copy link button copies URL to clipboard

### Video Page
- [ ] Navigate to `/help-videos` without logging in
- [ ] Member videos section always visible
- [ ] LIRF videos hidden when not logged in
- [ ] Log in as regular member - LIRF videos still hidden
- [ ] Log in as LIRF - LIRF videos now visible
- [ ] Log in as admin - LIRF videos visible
- [ ] YouTube embeds load correctly (after adding real video IDs)

---

## 11. Troubleshooting

### Import Script Fails

**Error: "Missing environment variables"**
- Ensure `.env.local` has all required variables
- Verify `SUPABASE_SERVICE_KEY` is set

**Error: "File not found"**
- Check CSV file path is correct
- Use absolute path if relative doesn't work

**Error: "duplicate key value violates unique constraint"**
- Email already exists in pending_invitations table
- Check for duplicate emails in CSV

### Email Sending Fails

**Error: "Invalid login: 535-5.7.8 Username and Password not accepted"**
- Gmail app password is incorrect
- Regenerate app password in Google Account settings
- Ensure 2FA is enabled on Google account

**Error: "Daily sending quota exceeded"**
- Gmail has rate limits (500 emails/day for free accounts)
- Wait 24 hours or upgrade to Google Workspace

### Registration Link Not Working

**"Invalid or expired invitation"**
- Token might be incorrect
- Invitation might already be accepted
- Check `pending_invitations` table in Supabase

**Form not pre-filling**
- Check browser console for errors
- Verify RLS policies are set correctly
- Test with anonymous policy enabled

---

## 12. Deployment Checklist

Before deploying to production:

1. **Database**
   - [ ] Run migration script in production Supabase
   - [ ] Verify RLS policies are enabled
   - [ ] Test with sample invitation

2. **Environment Variables**
   - [ ] Set all env vars in Vercel/hosting platform
   - [ ] NEVER commit SUPABASE_SERVICE_KEY to Git
   - [ ] Verify VITE_APP_URL points to production domain

3. **CSV Data**
   - [ ] Prepare production member CSV
   - [ ] Verify all email addresses are correct
   - [ ] Test with small batch (5-10 members) first

4. **Email**
   - [ ] Test Gmail credentials work
   - [ ] Send test invitation to yourself
   - [ ] Verify email deliverability (check spam)

5. **Videos**
   - [ ] Upload all videos to YouTube
   - [ ] Set as "Unlisted"
   - [ ] Update video IDs in HelpVideos.tsx
   - [ ] Deploy code with updated IDs
   - [ ] Test embeds work

6. **Testing**
   - [ ] Complete full testing checklist above
   - [ ] Test on mobile devices
   - [ ] Test in different browsers

---

## 13. Launch Timeline

Based on work package requirements:

**November 15th** ✅
- All features implemented
- Code deployed

**November 16th-23rd**
- Record tutorial videos
- Upload to YouTube
- Get video IDs

**November 24th**
- Update HelpVideos.tsx with real video IDs
- Deploy updated code

**December 2nd**
- Phase 1 launch (LIRFs)
- Monitor for issues

**January 1st**
- Phase 2 launch (Members)
- Import member CSV: `npm run import-invitations ./production-members.csv`
- Send invitations: `npm run send-invitations`
- Monitor Reports dashboard

---

## 14. Support & Maintenance

### Monitoring Registrations

Check Reports dashboard daily during launch:
- Track registration rate
- Identify users who haven't registered
- Resend invitations as needed

### Common Support Questions

**Q: "I didn't receive my invitation email"**
1. Check spam folder
2. Verify email is correct in Reports > Pending Invitations
3. Click "Resend" to send new invitation

**Q: "My invitation link says expired"**
1. Go to Reports > Pending Invitations
2. Click "Resend" to generate new link with fresh 30-day expiry

**Q: "Can I change my email address?"**
- Email is locked from invitation for data consistency
- If absolutely needed, create new invitation with correct email

### Updating Content

**Add new video:**
1. Edit `src/modules/help/pages/HelpVideos.tsx`
2. Add new video object to `videos` array
3. Deploy updated code

**Modify email template:**
1. Edit `src/modules/communications/utils/emailTemplates.ts`
2. Update HTML and text content
3. Test with sample email
4. Deploy updated code

---

## 15. Security Notes

### Service Key Protection

The `SUPABASE_SERVICE_KEY` has full database access. **NEVER:**
- Commit it to Git
- Expose it in frontend code
- Share it in documentation
- Use it in client-side JavaScript

**Only use in:**
- Node.js scripts (import-invitations, send-invitations)
- Backend API routes
- Server-side functions

### Row Level Security

All tables have RLS enabled:
- `pending_invitations`: Admins can read/write all, users can read with token
- `members`: Existing policies maintained
- Registration flow validates tokens in application logic

### Email Security

- Gmail app passwords are safer than account passwords
- Enable 2FA on Google account
- Rotate app passwords regularly
- Monitor sent emails in Gmail

---

## Support

For issues or questions:
- Check Troubleshooting section above
- Review work package: `Docs/Week1_work_package.md`
- Contact: runalcester@gmail.com

---

**Implementation Status:** ✅ Complete - Ready for Deployment

**Last Updated:** January 8, 2025
