# Week 1 Work Package: Admin Reporting & Member Invitation System

**Project:** Run Alcester App  
**Target Completion:** November 15th, 2025  
**Developer:** Claude Code  

---

## Overview

This work package implements critical features for the Run Alcester app launch:

1. **Admin Reporting Dashboard** - Real-time metrics and 7-day LIRF assignment look-ahead ✅ COMPLETE
2. **Member Pre-Population & Invitation System** - Import 70 paid members, generate invitation tokens, quick invitations
3. **Video Help Page** - Public page with embedded YouTube training videos

---

## Current Status

**✅ COMPLETED:**
- Task 2: Admin Reporting Dashboard (with enhancements)

**❌ OUTSTANDING:**
- Task 1: Database Schema Changes
- Task 3: Member Invitation System (including quick invitations)
- Task 4: Video Help Page
- Task 5: Testing
- Task 6: Documentation

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
    accepted_at TIMESTAMPTZ,
    guest_booking_id UUID REFERENCES bookings(id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_pending_invitations_token ON public.pending_invitations(token);
CREATE INDEX idx_pending_invitations_status ON public.pending_invitations(status);
CREATE INDEX idx_pending_invitations_email ON public.pending_invitations(email);
CREATE INDEX idx_pending_invitations_guest_booking ON public.pending_invitations(guest_booking_id);

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

-- All authenticated users can INSERT (for quick invitations)
CREATE POLICY "Authenticated users can create invitations"
ON public.pending_invitations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- All authenticated users can SELECT (to check for duplicates)
CREATE POLICY "Authenticated users can read invitations"
ON public.pending_invitations
FOR SELECT
TO authenticated
USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.pending_invitations IS 'Stores invited members with pre-populated data before registration';
COMMENT ON COLUMN public.pending_invitations.guest_booking_id IS 'Links invitation to guest booking - tracks conversion from guest to registered member';
```

### 1.2 Add Tracking Fields to Profiles

```sql
-- Add invited_at timestamp to track which users came from invitations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.invited_at IS 'Timestamp when user was invited via pre-population system';
```

---

## Task 2: Admin Reporting Dashboard ✅ COMPLETE

Already implemented with:
- 7-Day LIRF Assignment Look-Ahead
- Active User Metrics (with guest exclusion)
- Recent Registration Statistics
- Pending Invitations section (UI ready, awaiting database table)
- Dashboard LIRF widget
- Guest user tracking
- Scroll-to-run functionality

---

## Task 3: Member Invitation System

### 3.1 Create Import Script

**File:** `scripts/import-invitations.ts`

Create a Node.js script that:
1. Reads CSV file with member data
2. Generates unique tokens for each member
3. Inserts records into `pending_invitations` table
4. Outputs confirmation with token list

**CSV Format:**
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
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
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
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => members.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${members.length} members to import`);
  
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
      console.log(`✓ Imported ${member.email}`);
      results.push({ 
        email: member.email, 
        success: true, 
        token,
        invitationLink: `${process.env.VITE_APP_URL}/register?token=${token}`
      });
    }
  }
  
  const outputPath = `import-results-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✓ Import complete!`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Results saved to: ${outputPath}`);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: npx ts-node scripts/import-invitations.ts <path-to-csv>');
  process.exit(1);
}

importInvitations(csvPath).catch(console.error);
```

### 3.2 Update Registration Flow

**File:** `src/pages/Register.tsx`

Modify registration to:
1. Check for `?token=` query parameter
2. If token exists, fetch invitation data and pre-fill form
3. After successful registration, mark invitation as 'accepted'

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
      toast.error('Invalid or expired invitation link');
      return;
    }
    
    if (new Date(data.expires_at) < new Date()) {
      toast.error('This invitation has expired. Please contact the club.');
      return;
    }
    
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
      
      <input 
        type="email" 
        value={formData.email}
        disabled={!!invitationData}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />
      
      {/* ... other fields ... */}
    </form>
  );
}
```

### 3.3 Create Invitation Email Template

**File:** `src/utils/emailTemplates.ts`

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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export async function sendAllInvitations() {
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
      
      // Rate limiting
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

### 3.5 Create Invitation Helper Functions (for Quick Invitations)

**File:** `src/utils/invitationHelpers.ts`

Create reusable functions for one-off invitations (used by sidebar form and guest member flow):

```typescript
import { createClient } from '@supabase/supabase-js';
import { generateInvitationEmail } from './emailTemplates';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Send a quick invitation to a new member
 * Handles duplicate checking and appropriate actions:
 * - Already registered: Sends password reset
 * - Already pending: Sends reminder
 * - New: Creates invitation and sends email
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
  
  if (!fullName || !email) {
    return { success: false, message: 'Name and email are required' };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = fullName.trim();

  // Check if already registered
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password` }
    );

    if (resetError) {
      return { 
        success: false, 
        message: `${email} is already registered, but password reset email failed.` 
      };
    }

    return { 
      success: true, 
      message: `${email} is already registered! We've sent them a password reset link.`,
      action: 'password_reset'
    };
  }

  // Check if already has pending invitation
  const { data: existingInvitation } = await supabase
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
      return { success: false, message: `Failed to send reminder: ${emailError.message}` };
    }
  }

  // Create new invitation
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
    return { success: false, message: `Failed to create invitation: ${insertError.message}` };
  }

  // Send invitation email
  const { subject, html } = generateInvitationEmail(trimmedName, token, import.meta.env.VITE_APP_URL);

  try {
    await sendEmailFn(normalizedEmail, subject, html);
    return { 
      success: true, 
      message: `Invitation sent to ${email}!`,
      action: 'invitation_sent',
      invitationId: newInvitation.id
    };
  } catch (emailError) {
    // Delete invitation if email fails
    await supabase.from('pending_invitations').delete().eq('id', newInvitation.id);
    return { success: false, message: `Failed to send email: ${emailError.message}` };
  }
}

/**
 * Generate a cryptographically secure token (browser-compatible)
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

### 3.6 Add Sidebar Invitation Form

**File:** `src/components/SendInvitationModal.tsx`

Create modal component for quick one-off invitations (available to all users):

```typescript
import { useState } from 'react';
import { sendQuickInvitation } from '../utils/invitationHelpers';
import { sendEmail } from '../services/emailService';

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
    
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });

    if (result.success) {
      setFullName('');
      setEmail('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Send Invitation</h2>
          <button onClick={() => { setFullName(''); setEmail(''); setMessage(null); onClose(); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Send a registration invitation to a new member.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" placeholder="John Smith" disabled={loading} />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" placeholder="john@example.com" disabled={loading} />
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => onClose()} className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50" disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Add to Sidebar/Navigation:**

```typescript
// In src/components/Sidebar.tsx or Navigation component
import { useState } from 'react';
import SendInvitationModal from './SendInvitationModal';

// Add state
const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);

// Add menu item for all authenticated users
<button onClick={() => setIsInvitationModalOpen(true)} className="sidebar-item">
  <span>✉️</span> Send Invitation
</button>

// Add modal
<SendInvitationModal isOpen={isInvitationModalOpen} onClose={() => setIsInvitationModalOpen(false)} />
```

### 3.7 Add Guest Member Invitation Option

**File:** Modify existing `AddGuestMemberForm.tsx` or equivalent

Add checkbox to invite guest members during attendance marking:

```typescript
import { useState } from 'react';
import { sendQuickInvitation } from '../utils/invitationHelpers';
import { sendEmail } from '../services/emailService';
import { supabase } from '../lib/supabase';

function AddGuestMemberForm({ runId, onGuestAdded, onClose }) {
  const [guestName, setGuestName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [sendInvitation, setSendInvitation] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Add guest member to attendance
    const { data: guestBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        run_id: runId,
        guest_name: guestName,
        emergency_contact_name: emergencyContact || null,
        emergency_contact_phone: emergencyPhone || null,
        is_guest: true,
        attended: true
      })
      .select()
      .single();

    if (bookingError) {
      alert('Failed to add guest member');
      setLoading(false);
      return;
    }

    alert(`${guestName} added as guest member!`);

    // If checkbox ticked, send invitation
    if (sendInvitation && email) {
      const result = await sendQuickInvitation(guestName, email, sendEmail);
      
      if (result.success) {
        alert(result.message);
        
        // Link guest booking to invitation
        if (result.invitationId) {
          await supabase
            .from('pending_invitations')
            .update({ guest_booking_id: guestBooking.id })
            .eq('id', result.invitationId);
        }
      } else {
        alert(`Guest added, but invitation failed: ${result.message}`);
      }
    }

    // Clear form
    setGuestName('');
    setEmergencyContact('');
    setEmergencyPhone('');
    setEmail('');
    setSendInvitation(false);
    setLoading(false);
    if (onGuestAdded) onGuestAdded(guestBooking);
    if (onClose) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Guest Name *</label>
        <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} required className="w-full px-3 py-2 border rounded-md" placeholder="John Smith" disabled={loading} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
        <input type="text" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Jane Smith" disabled={loading} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
        <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="07123456789" disabled={loading} />
      </div>

      {/* INVITATION CHECKBOX */}
      <div className="border-t pt-4">
        <label className="flex items-start cursor-pointer">
          <input type="checkbox" checked={sendInvitation} onChange={(e) => setSendInvitation(e.target.checked)} className="mt-1 mr-3" disabled={loading} />
          <div>
            <span className="text-sm font-medium text-gray-700 block">Send registration invitation email</span>
            <span className="text-xs text-gray-500">Invite this person to create a full account</span>
          </div>
        </label>
      </div>

      {sendInvitation && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={sendInvitation} className="w-full px-3 py-2 border rounded-md" placeholder="john@example.com" disabled={loading} />
          <p className="text-xs text-gray-600 mt-2">We'll send them a link to complete their registration</p>
        </div>
      )}

      <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
        {loading ? 'Adding...' : 'Add Guest Member'}
      </button>
    </form>
  );
}
```

### 3.8 Add Resend Invitation Feature to Admin Dashboard

**File:** `src/pages/AdminReports.tsx` (add to existing Pending Invitations section)

```typescript
async function resendInvitation(invitationId: string) {
  const { data: invitation } = await supabase
    .from('pending_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();
  
  if (!invitation) return;
  
  // Generate new token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const newToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
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
  
  await sendEmail(invitation.email, subject, html);
  
  toast.success(`Invitation resent to ${invitation.email}`);
}

// In JSX - add Resend button to pending invitations table
<button onClick={() => resendInvitation(inv.id)}>
  Resend
</button>
```

---

## Task 4: Video Help Page

### 4.1 Create Help Page

**File:** `src/pages/HelpVideos.tsx`

```typescript
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
    youtubeId: 'YOUTUBE_ID_1',
    description: 'Learn how to create your account and get started.',
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
    title: 'Managing Your Profile',
    youtubeId: 'YOUTUBE_ID_3',
    description: 'Keep your details up to date.',
    category: 'member'
  },
  {
    id: '4',
    title: 'Understanding Credits and Payments',
    youtubeId: 'YOUTUBE_ID_4',
    description: 'How the payment system works.',
    category: 'member'
  },
  // LIRF videos
  {
    id: '5',
    title: 'How to View and Schedule Runs',
    youtubeId: 'YOUTUBE_ID_5',
    description: 'LIRF guide to managing run schedules.',
    category: 'lirf'
  },
  {
    id: '6',
    title: 'How to Assign Yourself to a Run',
    youtubeId: 'YOUTUBE_ID_6',
    description: 'Step-by-step LIRF assignments.',
    category: 'lirf'
  },
  {
    id: '7',
    title: 'Viewing Bookings and Marking Attendance',
    youtubeId: 'YOUTUBE_ID_7',
    description: 'Manage bookings and track attendance.',
    category: 'lirf'
  },
  {
    id: '8',
    title: 'Troubleshooting Common Issues',
    youtubeId: 'YOUTUBE_ID_8',
    description: 'Solutions to frequent questions.',
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
      <p className="text-gray-600 mb-8">Watch these short tutorials to get the most out of the app.</p>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">For Members</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {memberVideos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </section>
      
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

function VideoCard({ video }) {
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

### 4.2 Add Route (Public Access)

```typescript
// In App.tsx or routing config
<Route path="/help/videos" element={<HelpVideos />} />
```

### 4.3 Add Navigation Link

```typescript
<NavLink to="/help/videos">📹 Help Videos</NavLink>
```

---

## Task 5: Testing Checklist

### 5.1 Admin Dashboard Testing (Already Complete)
- [x] Navigate to `/admin/reports` as admin user
- [x] Verify non-admin users cannot access
- [x] 7-day LIRF look-ahead works correctly

### 5.2 Invitation System Testing
- [ ] Run import script with test CSV (2-3 members)
- [ ] Verify records created in `pending_invitations` table
- [ ] Tokens are unique
- [ ] Registration link works: `/register?token=<TOKEN>`
- [ ] Form pre-fills with invitation data
- [ ] Email field is locked
- [ ] After registration, invitation status = 'accepted'
- [ ] Invalid token shows error
- [ ] Expired token shows error

### 5.3 Resend Invitation Testing
- [ ] Pending invitations table shows on admin dashboard
- [ ] Resend button generates new token
- [ ] Expiry date resets to +30 days
- [ ] Email sends successfully
- [ ] Old token no longer works
- [ ] New token works for registration

### 5.4 Quick Invitation - Sidebar Form Testing
- [ ] Sidebar menu item appears for all authenticated users
- [ ] Modal opens and closes correctly
- [ ] Form validates required fields (name, email)
- [ ] New email: Creates invitation, sends email, shows success
- [ ] Already registered email: Sends password reset
- [ ] Already pending email: Sends reminder
- [ ] Form clears and modal auto-closes after success
- [ ] Loading states work correctly

### 5.5 Quick Invitation - Guest Member Testing
- [ ] Checkbox appears on Add Guest form
- [ ] Email field shows/hides based on checkbox
- [ ] Guest added successfully without invitation (checkbox off)
- [ ] Guest added + invitation sent (checkbox on, new email)
- [ ] Guest added + password reset sent (checkbox on, registered email)
- [ ] Guest added + reminder sent (checkbox on, pending email)
- [ ] guest_booking_id links correctly in database

### 5.6 Video Page Testing
- [ ] Navigate to `/help/videos` without logging in (public)
- [ ] Member videos always visible
- [ ] LIRF videos hidden when not logged in
- [ ] Log in as LIRF - LIRF videos visible
- [ ] YouTube embeds load correctly

---

## Task 6: Documentation Updates

### 6.1 Environment Variables

```bash
# .env.example
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
VITE_APP_URL=https://app.runalcester.co.uk
```

### 6.2 Usage Instructions

**Bulk Import:**
```bash
npx ts-node scripts/import-invitations.ts ./members.csv
```

**Send All Invitations:**
```bash
npm run send-invitations
```

---

## Deliverables Summary

1. ✅ **Admin Dashboard** - COMPLETE

2. ⬜ **Invitation System** including:
   - `pending_invitations` database table with guest_booking_id tracking
   - CSV import script for bulk invitations
   - Updated registration flow with token validation
   - Email templates
   - Resend functionality from admin dashboard
   - Quick invitation helper functions (duplicate detection, password reset, reminders)
   - Sidebar invitation form (available to all users)
   - Guest member invitation (checkbox during attendance marking)

3. ⬜ **Video Help Page** at `/help/videos` with:
   - Public access
   - Role-based LIRF content visibility
   - YouTube embeds

4. ⬜ **Testing & Documentation**

---

## Recommended Execution Order

1. **Task 1: Database Schema** - Must be done first
2. **Task 3.1-3.4: Core Invitation System** - Depends on Task 1
3. **Task 3.5-3.7: Quick Invitations** - Depends on 3.1-3.4
4. **Task 3.8: Resend Feature** - Can be done alongside 3.5-3.7
5. **Task 4: Video Help Page** - Independent, can be done anytime
6. **Task 5-6: Testing & Docs** - Final step

---

## Notes for Chris

### CSV Format Confirmation Needed
```
full_name,email,phone,emergency_contact_name,emergency_contact_phone
```

### YouTube Video IDs
After recording and uploading videos as "Unlisted", update the `youtubeId` values in `HelpVideos.tsx`.

### Timeline Reminder
- **By November 15th**: All features complete
- **November 16th-23rd**: Record videos
- **December 2nd**: Phase 1 launch (LIRFs)
- **January 1st**: Phase 2 launch (Members)

Good luck! 🚀
