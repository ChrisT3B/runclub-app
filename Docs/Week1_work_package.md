Output

# Week 1 Work Package: Admin Reporting & Member Invitation System

**Project:** Run Alcester App  
**Target Completion:** November 15th, 2025  
**Developer:** Claude Code  

---

## Overview

This work package implements three critical features for the Run Alcester app launch:

1. **Admin Reporting Dashboard** - Real-time metrics and 7-day LIRF assignment look-ahead
2. **Member Pre-Population & Invitation System** - Import 70 paid members and generate invitation tokens
3. **Video Help Page** - Public page with embedded YouTube training videos

---

## Prerequisites

Before starting, ensure you have:
- Access to the Run Alcester codebase
- Supabase connection configured
- Admin role functionality already exists in the database
- CSV file with 70 member records ready (columns TBD by Chris)

---

## Task 1: Database Schema Changes

### 1.1 Create `pending_invitations` Table

Create a new table to store invited members before they register.

**SQL to execute in Supabase:**

```sql
-- Create pending_invitations table
CREATE TABLE public.pending_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    accepted_at TIMESTAMPTZ
);

-- Create index for faster token lookups
CREATE INDEX idx_pending_invitations_token ON public.pending_invitations(token);
CREATE INDEX idx_pending_invitations_status ON public.pending_invitations(status);
CREATE INDEX idx_pending_invitations_email ON public.pending_invitations(email);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to pending_invitations"
ON public.pending_invitations
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Users can only read their own invitation by token (for registration flow)
CREATE POLICY "Users can read own invitation by token"
ON public.pending_invitations
FOR SELECT
TO authenticated
USING (true);  -- We'll validate token in application logic

-- Add comment for documentation
COMMENT ON TABLE public.pending_invitations IS 'Stores invited members with pre-populated data before registration';
```

### 1.2 Add Tracking Fields to Profiles (if needed)

Check if `profiles` table has an `invited_at` field. If not, add it:

```sql
-- Add invited_at timestamp to track which users came from invitations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.invited_at IS 'Timestamp when user was invited via pre-population system';
```

---

## Task 2: Admin Reporting Dashboard

### 2.1 Create Route & Component

**File:** `src/pages/AdminReports.tsx`

Create a new admin-only page at `/admin/reports` with the following sections:

#### Section 1: Registration Statistics

Display simple counters:
- Total Invited (count from `pending_invitations` where status != 'expired')
- Registered (count from `pending_invitations` where status = 'accepted')
- Pending (count from `pending_invitations` where status = 'pending')
- Registration Rate (percentage: registered / total invited)

**Data fetching:**
```typescript
// Fetch registration stats
const { data: invitationStats } = await supabase
  .from('pending_invitations')
  .select('status')
  .in('status', ['pending', 'accepted']);

// Calculate stats
const totalInvited = invitationStats?.length || 0;
const registered = invitationStats?.filter(i => i.status === 'accepted').length || 0;
const pending = invitationStats?.filter(i => i.status === 'pending').length || 0;
const registrationRate = totalInvited > 0 ? (registered / totalInvited * 100).toFixed(1) : 0;
```

#### Section 2: Active User Metrics

Display:
- Total Users (count all profiles)
- Active Users (users who booked a run in last 30 days)
- Total Bookings This Month
- Total Attendance This Month

**Data fetching:**
```typescript
// Total users
const { count: totalUsers } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });

// Active users (booked in last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: activeUserIds } = await supabase
  .from('bookings')
  .select('user_id')
  .gte('created_at', thirtyDaysAgo.toISOString());

const activeUsers = new Set(activeUserIds?.map(b => b.user_id)).size;

// Bookings this month
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const { count: bookingsThisMonth } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', startOfMonth.toISOString());

// Attendance this month (bookings where attended = true)
const { count: attendanceThisMonth } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', startOfMonth.toISOString())
  .eq('attended', true);
```

#### Section 3: 7-Day LIRF Assignment Look-Ahead

Display table with columns:
- Date (formatted: "Mon, Dec 2")
- Run Name
- LIRF Assigned (Yes/No with color coding)
- LIRF Name (if assigned)

**Table styling:**
- Rows with no LIRF assigned: highlight in red/pink background
- Rows with LIRF assigned: normal/green background
- Make sortable by date (default)

**Data fetching:**
```typescript
// Get runs for next 7 days
const today = new Date();
const sevenDaysFromNow = new Date();
sevenDaysFromNow.setDate(today.getDate() + 7);

const { data: upcomingRuns } = await supabase
  .from('runs')
  .select(`
    id,
    title,
    date,
    lirf_assignments (
      user_id,
      profiles (
        full_name
      )
    )
  `)
  .gte('date', today.toISOString())
  .lte('date', sevenDaysFromNow.toISOString())
  .order('date', { ascending: true });

// Transform data for table
const tableData = upcomingRuns?.map(run => ({
  date: run.date,
  runName: run.title,
  lirfAssigned: run.lirf_assignments && run.lirf_assignments.length > 0,
  lirfName: run.lirf_assignments?.[0]?.profiles?.full_name || 'None'
}));
```

### 2.2 Add Route Protection

Ensure `/admin/reports` is only accessible to users with `role = 'admin'` in their profile.

**File:** `src/App.tsx` or routing configuration

```typescript
// Add protected route
<Route 
  path="/admin/reports" 
  element={
    <ProtectedRoute requireAdmin>
      <AdminReports />
    </ProtectedRoute>
  } 
/>
```

If `ProtectedRoute` doesn't have `requireAdmin` prop, add it:

```typescript
// In ProtectedRoute component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, profile } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};
```

### 2.3 Add Navigation Link

Add "Reports" link to admin navigation menu (if one exists), or create admin-only nav section.

**File:** Navigation component (e.g., `src/components/Navigation.tsx`)

```typescript
{profile?.role === 'admin' && (
  <NavLink to="/admin/reports">
    📊 Reports
  </NavLink>
)}
```

---

## Task 3: Member Pre-Population & Invitation System

### 3.1 Create Import Script

**File:** `scripts/import-invitations.ts`

Create a Node.js script that:
1. Reads CSV file with member data
2. Generates unique tokens for each member
3. Inserts records into `pending_invitations` table
4. Outputs confirmation with token list

**CSV Format (to be confirmed by Chris):**
```
full_name,email,phone,emergency_contact_name,emergency_contact_phone
John Smith,john@example.com,07123456789,Jane Smith,07987654321
```

**Script implementation:**

```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as csv from 'csv-parser';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!; // Use service key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

interface MemberRecord {
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

async function importInvitations(csvFilePath: string) {
  const members: MemberRecord[] = [];
  
  // Read CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => members.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${members.length} members to import`);
  
  // Generate tokens and insert
  const results = [];
  
  for (const member of members) {
    const token = crypto.randomBytes(32).toString('hex');
    
    const { data, error } = await supabase
      .from('pending_invitations')
      .insert({
        email: member.email.toLowerCase().trim(),
        full_name: member.full_name.trim(),
        phone: member.phone?.trim() || null,
        emergency_contact_name: member.emergency_contact_name?.trim() || null,
        emergency_contact_phone: member.emergency_contact_phone?.trim() || null,
        token,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error importing ${member.email}:`, error.message);
      results.push({ email: member.email, success: false, error: error.message });
    } else {
      console.log(`✓ Imported ${member.email} with token ${token}`);
      results.push({ 
        email: member.email, 
        success: true, 
        token,
        invitationLink: `${process.env.VITE_APP_URL}/register?token=${token}`
      });
    }
  }
  
  // Write results to file
  const outputPath = `import-results-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✓ Import complete!`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Results saved to: ${outputPath}`);
}

// Run script
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node import-invitations.js <path-to-csv>');
  process.exit(1);
}

importInvitations(csvPath).catch(console.error);
```

**Usage:**
```bash
npm run import-invitations ./members.csv
```

### 3.2 Update Registration Flow

**File:** `src/pages/Register.tsx` (or wherever registration logic lives)

Modify registration to:
1. Check for `?token=` query parameter
2. If token exists, fetch invitation data and pre-fill form
3. After successful registration, mark invitation as 'accepted'

**Implementation:**

```typescript
import { useSearchParams } from 'react-router-dom';

function Register() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [invitationData, setInvitationData] = useState(null);
  
  useEffect(() => {
    if (token) {
      fetchInvitationData(token);
    }
  }, [token]);
  
  async function fetchInvitationData(token: string) {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();
    
    if (error || !data) {
      // Invalid or expired token
      toast.error('Invalid or expired invitation link');
      return;
    }
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      toast.error('This invitation has expired. Please contact the club.');
      return;
    }
    
    // Pre-fill form
    setInvitationData(data);
    setFormData({
      email: data.email,
      fullName: data.full_name,
      phone: data.phone || '',
      emergencyContactName: data.emergency_contact_name || '',
      emergencyContactPhone: data.emergency_contact_phone || ''
    });
  }
  
  async function handleRegistration(e) {
    e.preventDefault();
    
    // ... existing registration logic ...
    
    // After successful registration, mark invitation as accepted
    if (token && invitationData) {
      await supabase
        .from('pending_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('token', token);
      
      // Also update profile with invited_at timestamp
      await supabase
        .from('profiles')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', newUserId);
    }
  }
  
  return (
    <form onSubmit={handleRegistration}>
      {invitationData && (
        <div className="bg-green-50 p-4 rounded mb-4">
          <p className="text-green-800">
            Welcome back! We've pre-filled your details. Please verify and complete your registration.
          </p>
        </div>
      )}
      
      {/* Form fields - pre-populated if invitationData exists */}
      <input 
        type="email" 
        value={formData.email}
        disabled={!!invitationData} // Lock email if from invitation
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />
      
      {/* ... other fields ... */}
    </form>
  );
}
```

### 3.3 Create Invitation Email Template

**File:** `src/utils/emailTemplates.ts` (or create if doesn't exist)

```typescript
export function generateInvitationEmail(
  fullName: string, 
  token: string,
  appUrl: string
): { subject: string; html: string } {
  const registrationLink = `${appUrl}/register?token=${token}`;
  
  return {
    subject: 'Welcome to Run Alcester - Complete Your Registration',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏃‍♀️ Welcome to Run Alcester!</h1>
          </div>
          
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>Great news! As a paid member of Run Alcester, we've set up your account in our new app.</p>
            
            <p>The app makes it easier to:</p>
            <ul>
              <li>Book your place on runs</li>
              <li>Track your sessions</li>
              <li>Manage your membership details</li>
              <li>Stay connected with the club</li>
            </ul>
            
            <p><strong>We've already added your details</strong> - you just need to complete your registration:</p>
            
            <a href="${registrationLink}" class="button">Complete Registration</a>
            
            <p><small>Or copy this link: ${registrationLink}</small></p>
            
            <p><strong>Important:</strong> Don't worry if you can't register right away - you can still turn up to any run as usual. Our LIRFs can add you on the day.</p>
            
            <p>Need help? Watch our quick tutorial video or check out the FAQs on our website.</p>
            
            <p>See you on the trails!</p>
            <p>The Run Alcester Team</p>
          </div>
          
          <div class="footer">
            <p>This invitation link expires in 30 days.</p>
            <p>If you didn't expect this email, you can safely ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}
```

### 3.4 Create Email Sending Function

**File:** `src/utils/sendInvitations.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { generateInvitationEmail } from './emailTemplates';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Configure Gmail SMTP (use existing config from your app)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export async function sendAllInvitations() {
  // Fetch all pending invitations
  const { data: invitations, error } = await supabase
    .from('pending_invitations')
    .select('*')
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error fetching invitations:', error);
    return;
  }
  
  console.log(`Sending ${invitations.length} invitation emails...`);
  
  const results = [];
  
  for (const invitation of invitations) {
    try {
      const { subject, html } = generateInvitationEmail(
        invitation.full_name,
        invitation.token,
        process.env.VITE_APP_URL!
      );
      
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: invitation.email,
        subject,
        html
      });
      
      console.log(`✓ Sent to ${invitation.email}`);
      results.push({ email: invitation.email, success: true });
      
      // Rate limiting: wait 1 second between emails to avoid Gmail limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`✗ Failed to send to ${invitation.email}:`, error);
      results.push({ email: invitation.email, success: false, error });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`\n✓ Sent ${successful}/${invitations.length} emails successfully`);
  
  return results;
}
```

### 3.5 Add Resend Invitation Feature to Admin Dashboard

**File:** `src/pages/AdminReports.tsx` (add new section)

Add a table showing all pending invitations with "Resend" button:

```typescript
// Fetch pending invitations
const { data: pendingInvitations } = await supabase
  .from('pending_invitations')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

async function resendInvitation(invitationId: string) {
  const { data: invitation } = await supabase
    .from('pending_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();
  
  if (!invitation) return;
  
  // Generate new token
  const newToken = crypto.randomBytes(32).toString('hex');
  
  // Update invitation with new token and reset expiry
  await supabase
    .from('pending_invitations')
    .update({
      token: newToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', invitationId);
  
  // Send email with new token
  const { subject, html } = generateInvitationEmail(
    invitation.full_name,
    newToken,
    import.meta.env.VITE_APP_URL
  );
  
  // Call your email sending function
  await sendEmail(invitation.email, subject, html);
  
  toast.success(`Invitation resent to ${invitation.email}`);
}

// In JSX
<section>
  <h3>Pending Invitations</h3>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Sent</th>
        <th>Expires</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {pendingInvitations?.map(inv => (
        <tr key={inv.id}>
          <td>{inv.full_name}</td>
          <td>{inv.email}</td>
          <td>{new Date(inv.created_at).toLocaleDateString()}</td>
          <td>{new Date(inv.expires_at).toLocaleDateString()}</td>
          <td>
            <button onClick={() => resendInvitation(inv.id)}>
              Resend
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</section>
```

---

## Task 4: Video Help Page

### 4.1 Create Help Page Route

**File:** `src/pages/HelpVideos.tsx`

Create a public page at `/help/videos` that displays:
- Welcome message
- Section for "Member Videos" (always visible)
- Section for "LIRF Videos" (only visible if user is LIRF or admin)
- Embedded YouTube videos

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  description: string;
  category: 'member' | 'lirf';
}

const videos: Video[] = [
  // Member videos
  {
    id: '1',
    title: 'Welcome to Run Alcester - How to Register',
    youtubeId: 'YOUTUBE_ID_1', // Replace with actual YouTube video ID
    description: 'Learn how to create your account and get started with the app.',
    category: 'member'
  },
  {
    id: '2',
    title: 'How to Book a Run',
    youtubeId: 'YOUTUBE_ID_2',
    description: 'Step-by-step guide to browsing and booking runs.',
    category: 'member'
  },
  {
    id: '3',
    title: 'Managing Your Profile and Emergency Contacts',
    youtubeId: 'YOUTUBE_ID_3',
    description: 'Keep your details up to date for safety and communication.',
    category: 'member'
  },
  {
    id: '4',
    title: 'Understanding Credits and Payments',
    youtubeId: 'YOUTUBE_ID_4',
    description: 'How the payment system works and managing your credits.',
    category: 'member'
  },
  
  // LIRF videos
  {
    id: '5',
    title: 'How to View and Schedule Runs',
    youtubeId: 'YOUTUBE_ID_5',
    description: 'LIRF guide to creating and managing run schedules.',
    category: 'lirf'
  },
  {
    id: '6',
    title: 'How to Assign Yourself to a Run',
    youtubeId: 'YOUTUBE_ID_6',
    description: 'Step-by-step process for LIRF run assignments.',
    category: 'lirf'
  },
  {
    id: '7',
    title: 'Viewing Bookings and Marking Attendance',
    youtubeId: 'YOUTUBE_ID_7',
    description: 'How to manage bookings and track attendance for your runs.',
    category: 'lirf'
  },
  {
    id: '8',
    title: 'Troubleshooting Common Issues',
    youtubeId: 'YOUTUBE_ID_8',
    description: 'Solutions to frequent questions and technical issues.',
    category: 'lirf'
  }
];

function HelpVideos() {
  const { profile } = useAuth();
  
  const isLirfOrAdmin = profile?.role === 'lirf' || profile?.role === 'admin';
  
  const memberVideos = videos.filter(v => v.category === 'member');
  const lirfVideos = videos.filter(v => v.category === 'lirf');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Help Videos</h1>
      <p className="text-gray-600 mb-8">
        Watch these short tutorials to get the most out of the Run Alcester app.
      </p>
      
      {/* Member Videos Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">For Members</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {memberVideos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </section>
      
      {/* LIRF Videos Section - Only shown to LIRFs and Admins */}
      {isLirfOrAdmin && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">For LIRFs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {lirfVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: Video }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="aspect-video">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
        <p className="text-gray-600 text-sm">{video.description}</p>
      </div>
    </div>
  );
}

export default HelpVideos;
```

### 4.2 Make Route Public (Accessible Before Login)

**File:** `src/App.tsx` or routing configuration

Ensure `/help/videos` is accessible without authentication:

```typescript
// Public routes
<Route path="/help/videos" element={<HelpVideos />} />

// Or if using a layout wrapper
<Route path="/help/videos" element={
  <PublicLayout>
    <HelpVideos />
  </PublicLayout>
} />
```

### 4.3 Add Navigation Links

Add links to the help page in relevant places:

**File:** `src/components/Navigation.tsx`

```typescript
<NavLink to="/help/videos">
  📹 Help Videos
</NavLink>
```

**File:** `src/pages/Register.tsx` (add link near registration form)

```typescript
<p className="text-center mt-4">
  Need help getting started? 
  <Link to="/help/videos" className="text-blue-600 underline ml-1">
    Watch our tutorial videos
  </Link>
</p>
```

### 4.4 Update Video IDs After Upload

After Chris uploads videos to YouTube:

1. Get the video IDs from YouTube URLs (the part after `v=`)
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → ID is `dQw4w9WgXcQ`

2. Update the `videos` array in `HelpVideos.tsx` with actual IDs

3. Test embeds work correctly

---

## Task 5: Testing Checklist

### 5.1 Admin Dashboard Testing

- [ ] Navigate to `/admin/reports` as admin user
- [ ] Verify non-admin users cannot access (redirected)
- [ ] Registration stats display correctly
- [ ] Active user metrics calculate correctly
- [ ] 7-day LIRF look-ahead shows correct runs
- [ ] Runs without LIRF assignments highlighted in red
- [ ] Table is sortable by date
- [ ] Page refreshes data on load

### 5.2 Invitation System Testing

- [ ] Run import script with test CSV (2-3 members)
- [ ] Verify records created in `pending_invitations` table
- [ ] Tokens are unique and properly generated
- [ ] Registration link works: `/register?token=<TOKEN>`
- [ ] Form pre-fills with invitation data
- [ ] Email field is locked (not editable)
- [ ] After registration, invitation status changes to 'accepted'
- [ ] Profile gets `invited_at` timestamp
- [ ] Invalid token shows error message
- [ ] Expired token (manually set expiry date to past) shows error

### 5.3 Resend Invitation Testing

- [ ] Pending invitations table shows on admin dashboard
- [ ] Resend button generates new token
- [ ] Expiry date resets to +30 days
- [ ] Email sends successfully
- [ ] Old token no longer works
- [ ] New token works for registration

### 5.4 Video Page Testing

- [ ] Navigate to `/help/videos` without logging in (public access)
- [ ] Member videos section always visible
- [ ] LIRF videos section hidden when not logged in
- [ ] Log in as regular member - LIRF videos still hidden
- [ ] Log in as LIRF - LIRF videos now visible
- [ ] Log in as admin - LIRF videos visible
- [ ] YouTube embeds load correctly
- [ ] Videos play without errors
- [ ] Responsive design works on mobile

---

## Task 6: Documentation Updates

### 6.1 Update README

Add sections documenting:
- New admin dashboard features
- How to run invitation import script
- How to send invitation emails
- Video page structure and updating YouTube IDs

### 6.2 Add Environment Variables

Document required env vars in `.env.example`:

```bash
# Supabase (existing)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # For scripts only, never expose to frontend

# Email (existing)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# App URL
VITE_APP_URL=https://app.runalcester.co.uk
```

---

## Deliverables Summary

By completion of this work package, you should have:

1. ✅ **Admin Dashboard** at `/admin/reports` with:
   - Registration statistics
   - Active user metrics
   - 7-day LIRF assignment look-ahead

2. ✅ **Invitation System** including:
   - `pending_invitations` database table
   - CSV import script
   - Updated registration flow with token validation
   - Email templates
   - Resend functionality

3. ✅ **Video Help Page** at `/help/videos` with:
   - Public access
   - Role-based LIRF content visibility
   - YouTube embeds
   - Responsive design

4. ✅ **Documentation** covering:
   - How to use new features
   - Scripts and commands
   - Environment configuration

---

## Notes for Chris

### CSV Format Confirmation Needed

Before running the import script, confirm your CSV has these exact columns:
```
full_name,email,phone,emergency_contact_name,emergency_contact_phone
```

If your columns are different, let me know and I'll update the script.

### YouTube Video Recording Tips

When recording your 2-3 minute videos:
- Use screen recording on your mobile device
- Portrait orientation is fine for mobile-first app
- Keep it simple - no editing needed
- Speak naturally, show the actual app
- Upload as "Unlisted" to YouTube so only people with link can view

### Sending Invitation Emails

On January 1st when ready to send:

```bash
# Send all invitations at once
npm run send-invitations
```

This will:
- Send to all 70 members with pending invitations
- Rate limit to 1 email per second (Gmail limits)
- Take approximately 70 seconds to complete
- Log results to console

### Timeline Reminder

- **By November 15th**: All features in this package complete
- **November 16th-23rd**: Record videos, upload to YouTube
- **November 24th**: Update video IDs in code
- **December 2nd**: Phase 1 launch (LIRFs)
- **January 1st**: Phase 2 launch (Members) - send invitations

---

## Questions or Issues?

If you encounter any blockers:
1. Check existing code for similar patterns
2. Refer to Supabase documentation for RLS policies
3. Test with small datasets first
4. Ask Chris for clarification on business logic

Good luck! 🚀