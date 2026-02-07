# Member Invitation System - Implementation Guide

## Overview
This document contains step-by-step instructions to implement a member invitation system for Run Alcester. The system allows admins and LIRFs to invite new members via email, with three main features:

1. **Admin Bulk Invitation Dashboard** - Upload CSV or manually enter emails to send batch invitations
2. **Sidebar Quick Invitation** - Send individual invitations from any page
3. **Guest Member Invitation** - Option to invite guest members when adding them to runs

## Important Notes
- Database table `pending_invitations` has already been created via SQL migration
- DO NOT modify existing authentication flow or registration logic
- Follow existing code patterns and security practices
- Test each feature on a development branch before merging to main

---

## Task 1: Add TypeScript Database Types

### File: `src/types/database.ts`

**Instructions:** 
If this file doesn't exist, create it. If it exists, add the PendingInvitation interface to it.

Add this TypeScript interface for the new `pending_invitations` table:

```typescript
export interface PendingInvitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'registered' | 'expired';
  invited_by: string | null;
  invited_at: string;
  registered_at: string | null;
  expires_at: string;
  invitation_sent: boolean;
  email_sent_at: string | null;
  guest_member_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**Verification:**
- TypeScript should recognize the new type
- No compilation errors
- Autocomplete should work in your IDE

---

## Task 2: Create Invitation Service

### File: `src/services/invitationService.ts`

Create this new file with the complete invitation service logic:

```typescript
import { supabase } from './supabase';
import { GmailSMTP } from '../utils/GmailSMTP';
import { InputSanitizer } from '../utils/inputSanitizer';
import { SQLSecurityValidator } from '../utils/sqlSecurityValidator';

export interface InvitationResult {
  success: boolean;
  message: string;
  action?: 'invitation_sent' | 'password_reset' | 'reminder_sent' | 'already_registered';
  invitationId?: string;
}

export class InvitationService {
  private static readonly APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

  /**
   * Generate a cryptographically secure token
   */
  private static generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate email format
   */
  private static validateEmail(email: string): { valid: boolean; clean: string; error?: string } {
    const validation = SQLSecurityValidator.validateEmailForDB(email);
    return {
      valid: validation.isValid,
      clean: validation.clean,
      error: validation.error
    };
  }

  /**
   * Check if email already exists in the system
   */
  private static async checkExistingUser(email: string): Promise<{
    existsInMembers: boolean;
    existsInPending: boolean;
    hasInvitation: boolean;
    invitationData?: any;
  }> {
    const cleanEmail = email.toLowerCase().trim();

    // Check members table
    const { data: memberData } = await supabase
      .from('members')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    // Check pending_members table
    const { data: pendingData } = await supabase
      .from('pending_members')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    // Check pending_invitations table
    const { data: invitationData } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .maybeSingle();

    return {
      existsInMembers: !!memberData,
      existsInPending: !!pendingData,
      hasInvitation: !!invitationData,
      invitationData
    };
  }

  /**
   * Send a single invitation email
   */
  public static async sendInvitation(
    email: string,
    invitedById?: string
  ): Promise<InvitationResult> {
    try {
      // Validate email
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.valid) {
        return {
          success: false,
          message: emailValidation.error || 'Invalid email format'
        };
      }

      const cleanEmail = emailValidation.clean;

      // Check for existing users
      const existing = await this.checkExistingUser(cleanEmail);

      // If already a full member, send password reset
      if (existing.existsInMembers) {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${this.APP_URL}/reset-password`
        });

        return {
          success: true,
          message: `${cleanEmail} is already registered. Password reset email sent.`,
          action: 'password_reset'
        };
      }

      // If already has pending invitation, resend it
      if (existing.hasInvitation) {
        const token = existing.invitationData.token;
        await this.sendInvitationEmail(cleanEmail, token);

        return {
          success: true,
          message: `Reminder sent to ${cleanEmail}`,
          action: 'reminder_sent',
          invitationId: existing.invitationData.id
        };
      }

      // If in pending_members (registered but not verified), resend verification
      if (existing.existsInPending) {
        // Trigger Supabase to resend verification email
        await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail
        });

        return {
          success: true,
          message: `${cleanEmail} is pending email verification. Verification email resent.`,
          action: 'reminder_sent'
        };
      }

      // Create new invitation
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      const { data: invitation, error: createError } = await supabase
        .from('pending_invitations')
        .insert({
          email: cleanEmail,
          token,
          invited_by: invitedById || null,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create invitation:', createError);
        return {
          success: false,
          message: `Failed to create invitation: ${createError.message}`
        };
      }

      // Send invitation email
      await this.sendInvitationEmail(cleanEmail, token);

      // Update invitation as sent
      await supabase
        .from('pending_invitations')
        .update({
          invitation_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      // Log security event
      await supabase
        .from('security_events')
        .insert({
          event_type: 'invitation_sent',
          event_details: {
            email: cleanEmail,
            invited_by: invitedById,
            invitation_id: invitation.id
          },
          severity: 'info'
        });

      return {
        success: true,
        message: `Invitation sent to ${cleanEmail}`,
        action: 'invitation_sent',
        invitationId: invitation.id
      };

    } catch (error: any) {
      console.error('Error sending invitation:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Send invitation email via Gmail SMTP
   */
  private static async sendInvitationEmail(email: string, token: string): Promise<void> {
    const registrationLink = `${this.APP_URL}/register?token=${token}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
    .button { 
      display: inline-block; 
      padding: 14px 28px; 
      background: #dc2626; 
      color: white !important; 
      text-decoration: none; 
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🏃‍♀️ Welcome to Run Alcester!</h1>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; margin-bottom: 20px;"><strong>You're invited to join our running community!</strong></p>
      
      <p>As a member of Run Alcester, you'll be able to:</p>
      <ul>
        <li>📅 Book your place on runs</li>
        <li>📊 Track your running sessions</li>
        <li>👥 Connect with other club members</li>
        <li>📱 Manage your membership details</li>
        <li>🔔 Receive run updates and notifications</li>
      </ul>
      
      <p><strong>Getting started is easy:</strong></p>
      <p>Click the button below to complete your registration. You'll create your password and add your details securely.</p>
      
      <div style="text-align: center;">
        <a href="${registrationLink}" class="button">Complete Your Registration</a>
      </div>
      
      <p style="font-size: 13px; color: #666; margin-top: 20px;">
        Or copy this link into your browser:<br>
        <span style="word-break: break-all; color: #dc2626;">${registrationLink}</span>
      </p>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <strong>Can't register right away?</strong> No worries! You can still turn up to any run as usual, 
        and our LIRFs can mark your attendance on the day.
      </p>
      
      <p>See you on the trails!</p>
      <p style="margin-top: 20px;"><strong>The Run Alcester Team</strong></p>
    </div>
    
    <div class="footer">
      <p>This invitation link expires in 30 days.</p>
      <p>If you didn't expect this email, you can safely ignore it.</p>
      <p style="margin-top: 10px; color: #999;">Run Alcester | Making running accessible and enjoyable for all</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Welcome to Run Alcester!

You're invited to join our running community!

As a member, you'll be able to:
- Book your place on runs
- Track your running sessions
- Connect with other club members
- Manage your membership details
- Receive run updates and notifications

Complete your registration here:
${registrationLink}

Can't register right away? No worries! You can still turn up to any run as usual, and our LIRFs can mark your attendance on the day.

See you on the trails!
The Run Alcester Team

---
This invitation link expires in 30 days.
If you didn't expect this email, you can safely ignore it.
    `;

    await GmailSMTP.sendEmail({
      to: email,
      subject: '🏃‍♀️ Welcome to Run Alcester - Complete Your Registration',
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * Bulk send invitations with rate limiting (1 per second)
   */
  public static async sendBulkInvitations(
    emails: string[],
    invitedById?: string,
    progressCallback?: (current: number, total: number, email: string, result: InvitationResult) => void
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ email: string; result: InvitationResult }>;
  }> {
    const results: Array<{ email: string; result: InvitationResult }> = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      const result = await this.sendInvitation(email, invitedById);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      results.push({ email, result });

      // Progress callback
      if (progressCallback) {
        progressCallback(i + 1, emails.length, email, result);
      }

      // Rate limiting: 1 email per second (well within Gmail's limits)
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Log bulk send event
    await supabase
      .from('security_events')
      .insert({
        event_type: 'bulk_invitations_sent',
        event_details: {
          total: emails.length,
          successful,
          failed,
          invited_by: invitedById
        },
        severity: 'info'
      });

    return {
      total: emails.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Validate invitation token and get invitation data
   */
  public static async validateToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    invitationId?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: 'Invalid or expired invitation link'
        };
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        // Update status to expired
        await supabase
          .from('pending_invitations')
          .update({ status: 'expired' })
          .eq('id', data.id);

        return {
          valid: false,
          error: 'This invitation has expired. Please contact the club for a new invitation.'
        };
      }

      return {
        valid: true,
        email: data.email,
        invitationId: data.id
      };
    } catch (error: any) {
      console.error('Error validating token:', error);
      return {
        valid: false,
        error: 'Failed to validate invitation'
      };
    }
  }

  /**
   * Mark invitation as registered (called after successful registration)
   */
  public static async markAsRegistered(token: string): Promise<void> {
    try {
      await supabase
        .from('pending_invitations')
        .update({
          status: 'registered',
          registered_at: new Date().toISOString()
        })
        .eq('token', token);

      console.log('✅ Invitation marked as registered');
    } catch (error) {
      console.error('Error marking invitation as registered:', error);
      // Don't throw - registration already succeeded
    }
  }
}
```

---

## Task 3: Update Registration Flow to Handle Invitation Tokens

### File: `src/modules/auth/components/RegisterForm.tsx`

**Instructions:**
1. Add token validation on component mount
2. Pre-fill email from validated invitation
3. Mark invitation as registered after successful registration
4. Show appropriate UI feedback for invitation-based registrations

**Changes to make:**

Add these imports at the top:
```typescript
import { InvitationService } from '../../../services/invitationService';
import { useSearchParams } from 'react-router-dom';
```

Add state for invitation handling (after existing state declarations):
```typescript
const [searchParams] = useSearchParams();
const invitationToken = searchParams.get('token');
const [invitationData, setInvitationData] = useState<{ email: string; invitationId: string } | null>(null);
const [invitationError, setInvitationError] = useState<string>('');
const [validatingInvitation, setValidatingInvitation] = useState(false);
```

Add invitation validation effect (after existing useEffect hooks):
```typescript
// Validate invitation token if present
useEffect(() => {
  async function validateInvitation() {
    if (!invitationToken) return;

    setValidatingInvitation(true);
    const validation = await InvitationService.validateToken(invitationToken);

    if (!validation.valid) {
      setInvitationError(validation.error || 'Invalid invitation link');
      setValidatingInvitation(false);
      return;
    }

    // Pre-fill email from invitation
    setInvitationData({
      email: validation.email!,
      invitationId: validation.invitationId!
    });

    setFormData(prev => ({
      ...prev,
      email: validation.email!
    }));

    setValidatingInvitation(false);
  }

  validateInvitation();
}, [invitationToken]);
```

Update the handleSubmit function to mark invitation as registered. Find the existing `handleSubmit` function and add this code after successful registration (after the existing `register(cleanFormData)` call):

```typescript
// If registration successful and we have an invitation token, mark it as registered
if (invitationToken) {
  try {
    await InvitationService.markAsRegistered(invitationToken);
    console.log('✅ Invitation marked as registered');
  } catch (invError) {
    console.error('Error updating invitation status:', invError);
    // Don't fail the registration if we can't update the invitation
  }
}
```

Add invitation UI feedback in the form JSX. Add this block **before** the existing form fields:

```typescript
{/* Invitation Status Banner */}
{validatingInvitation && (
  <div style={{
    padding: '16px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  }}>
    <p style={{ margin: 0, color: '#6b7280' }}>
      ✓ Validating invitation...
    </p>
  </div>
)}

{invitationError && (
  <div style={{
    padding: '16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '20px'
  }}>
    <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
      <strong>⚠️ Invitation Error:</strong> {invitationError}
    </p>
    <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '13px' }}>
      Please contact the club for assistance or register without an invitation link.
    </p>
  </div>
)}

{invitationData && !invitationError && (
  <div style={{
    padding: '16px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    marginBottom: '20px'
  }}>
    <p style={{ margin: 0, color: '#166534', fontSize: '14px' }}>
      <strong>✓ Valid Invitation</strong>
    </p>
    <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '13px' }}>
      You've been invited to join Run Alcester! Complete the form below to create your account.
    </p>
  </div>
)}
```

Disable email field if invitation is present. Find the email input field and update it:
```typescript
<input
  type="email"
  id="email"
  name="email"
  value={formData.email}
  onChange={handleInputChange}
  required
  disabled={!!invitationData} // Add this line
  className="auth-input"
  placeholder="your.email@example.com"
/>
```

---

## Task 4: Create Admin Bulk Invitation Page

### File: `src/modules/admin/pages/BulkInvitations.tsx`

Create this new file for the admin bulk invitation dashboard:

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvitationService, InvitationResult } from '../../../services/invitationService';
import { useAuth } from '../../../modules/auth/hooks/useAuth';
import '../../../styles/pages.css';

interface ProcessedResult {
  email: string;
  result: InvitationResult;
}

const BulkInvitations: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Check if user is admin
  const isAdmin = state.member?.access_level === 'admin';

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Access Denied</h1>
        </div>
        <div className="card">
          <div className="card-content">
            <p>You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const parseEmails = (text: string): string[] => {
    // Split by newlines, commas, or semicolons
    const emails = text
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));

    // Remove duplicates
    return Array.from(new Set(emails));
  };

  const handleTextInput = () => {
    const emails = parseEmails(emailInput);
    setParsedEmails(emails);
    setShowResults(false);
    setResults([]);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = parseEmails(text);
      setParsedEmails(emails);
      setShowResults(false);
      setResults([]);
    };

    reader.readAsText(file);
  };

  const handleSendInvitations = async () => {
    if (parsedEmails.length === 0) return;

    setSending(true);
    setProgress({ current: 0, total: parsedEmails.length });
    setResults([]);
    setShowResults(true);

    const bulkResults = await InvitationService.sendBulkInvitations(
      parsedEmails,
      state.user?.id,
      (current, total, email, result) => {
        setProgress({ current, total });
        setResults(prev => [...prev, { email, result }]);
      }
    );

    setSending(false);
    console.log('Bulk send complete:', bulkResults);
  };

  const handleClear = () => {
    setEmailInput('');
    setCsvFile(null);
    setParsedEmails([]);
    setResults([]);
    setShowResults(false);
    setProgress({ current: 0, total: 0 });
  };

  const getResultIcon = (result: InvitationResult) => {
    if (!result.success) return '❌';
    switch (result.action) {
      case 'invitation_sent': return '✉️';
      case 'password_reset': return '🔑';
      case 'reminder_sent': return '🔔';
      default: return '✓';
    }
  };

  const getResultColor = (result: InvitationResult) => {
    if (!result.success) return '#dc2626';
    switch (result.action) {
      case 'invitation_sent': return '#059669';
      case 'password_reset': return '#2563eb';
      case 'reminder_sent': return '#d97706';
      default: return '#059669';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          onClick={() => navigate('/admin/reports')}
          className="btn btn-secondary"
          style={{ marginBottom: '12px' }}
        >
          ← Back to Admin
        </button>
        <h1 className="page-title">📧 Bulk Member Invitations</h1>
        <p className="page-description">
          Send registration invitations to multiple members at once. Paste emails or upload a CSV file.
        </p>
      </div>

      {/* Input Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Step 1: Add Email Addresses</h3>
        </div>
        <div className="card-content">
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Paste Email Addresses (one per line, or comma-separated):
            </label>
            <textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="john@example.com&#10;jane@example.com&#10;bob@example.com"
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}
              disabled={sending}
            />
            <button
              onClick={handleTextInput}
              className="btn btn-secondary"
              style={{ marginTop: '12px' }}
              disabled={sending || !emailInput.trim()}
            >
              Parse Emails from Text
            </button>
          </div>

          <div style={{
            padding: '12px',
            background: '#f3f4f6',
            borderRadius: '6px',
            textAlign: 'center',
            margin: '20px 0'
          }}>
            <strong>OR</strong>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Upload CSV File:
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvUpload}
              disabled={sending}
              style={{
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                width: '100%'
              }}
            />
            {csvFile && (
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                ✓ Loaded: {csvFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {parsedEmails.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Step 2: Review & Send ({parsedEmails.length} emails)</h3>
          </div>
          <div className="card-content">
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              {parsedEmails.map((email, idx) => (
                <div key={idx} style={{ padding: '4px 0', fontSize: '14px', fontFamily: 'monospace' }}>
                  {idx + 1}. {email}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSendInvitations}
                className="btn btn-primary"
                disabled={sending || parsedEmails.length === 0}
                style={{ flex: 1 }}
              >
                {sending ? `Sending... (${progress.current}/${progress.total})` : `Send ${parsedEmails.length} Invitations`}
              </button>
              <button
                onClick={handleClear}
                className="btn btn-secondary"
                disabled={sending}
              >
                Clear
              </button>
            </div>

            {sending && (
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                    height: '100%',
                    background: '#dc2626',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                  Processing: {progress.current} of {progress.total} emails
                  <br />
                  <small>Sending 1 email per second to comply with rate limits</small>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {showResults && results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Results ({results.length} processed)</h3>
          </div>
          <div className="card-content">
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {results.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{getResultIcon(item.result)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {item.email}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: getResultColor(item.result)
                    }}>
                      {item.result.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!sending && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px'
              }}>
                <p style={{ margin: 0, color: '#166534', fontWeight: '500' }}>
                  ✓ Bulk send complete!
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '14px' }}>
                  Successful: {results.filter(r => r.result.success).length} / {results.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkInvitations;
```

### Add Route for Bulk Invitations Page

**File: `src/App.tsx`**

Add the import at the top:
```typescript
import BulkInvitations from './modules/admin/pages/BulkInvitations';
```

Add the route (in the admin routes section):
```typescript
<Route path="/admin/bulk-invitations" element={<BulkInvitations />} />
```

### Add Link to Admin Dashboard

**File: `src/modules/admin/pages/AdminReports.tsx`**

Add a new card in the admin dashboard to link to bulk invitations. Add this after the existing admin cards:

```typescript
{/* Bulk Invitations Card */}
<div
  className="card clickable-card"
  onClick={() => navigate('/admin/bulk-invitations')}
  style={{ cursor: 'pointer' }}
>
  <div className="card-header">
    <h3 className="card-title">📧 Bulk Member Invitations</h3>
  </div>
  <div className="card-content">
    <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
      Send registration invitations to multiple members at once via CSV upload or manual entry.
    </p>
    <div style={{
      padding: '12px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '6px',
      fontSize: '14px',
      color: '#166534'
    }}>
      Perfect for onboarding your existing 70 paid members!
    </div>
  </div>
</div>
```

---

## Task 5: Create Sidebar Quick Invitation Modal

### File: `src/components/SendInvitationModal.tsx`

Create this new modal component for quick single invitations:

```typescript
import React, { useState } from 'react';
import { InvitationService } from '../services/invitationService';
import { useAuth } from '../modules/auth/hooks/useAuth';

interface SendInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SendInvitationModal: React.FC<SendInvitationModalProps> = ({ isOpen, onClose }) => {
  const { state } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await InvitationService.sendInvitation(email, state.user?.id);

    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    if (result.success) {
      setEmail('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    }

    setLoading(false);
  };

  const handleClose = () => {
    setEmail('');
    setMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
            📧 Send Invitation
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
          Send a registration invitation to a new member's email address.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="invitation-email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}
            >
              Email Address *
            </label>
            <input
              id="invitation-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="member@example.com"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: '12px',
                marginBottom: '20px',
                borderRadius: '6px',
                fontSize: '14px',
                background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: message.type === 'success' ? '#166534' : '#dc2626'
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '6px',
                background: loading ? '#9ca3af' : '#dc2626',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendInvitationModal;
```

### Add Invitation Button to Sidebar

**File: Find your main sidebar/navigation component** (likely `src/components/Sidebar.tsx` or `src/shared/components/navigation/Sidebar.tsx`)

Add the import:
```typescript
import { useState } from 'react';
import SendInvitationModal from './SendInvitationModal'; // Adjust path as needed
```

Add state:
```typescript
const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
```

Add the menu button (in the navigation items section, visible to Admin and LIRF users):
```typescript
{(state.member?.access_level === 'admin' || state.member?.access_level === 'lirf') && (
  <button
    onClick={() => setIsInvitationModalOpen(true)}
    className="sidebar-item" // Use your existing sidebar item class
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      padding: '12px 16px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      color: 'inherit'
    }}
  >
    <span style={{ fontSize: '18px' }}>📧</span>
    <span>Send Invitation</span>
  </button>
)}
```

Add the modal (at the bottom of the component, after the navigation items):
```typescript
<SendInvitationModal
  isOpen={isInvitationModalOpen}
  onClose={() => setIsInvitationModalOpen(false)}
/>
```

---

## Task 6: Add Guest Member Invitation Option

### File: `src/modules/activeruns/components/RunAttendance.tsx`

**Instructions:** Extend the existing "Add Runner" functionality to include an optional invitation checkbox.

Find the `addManualRunner` function and update it to handle invitations:

**Step 5.1:** Add state for invitation checkbox (add near the top of the component with other state):
```typescript
const [sendInvitationToGuest, setSendInvitationToGuest] = useState(false);
const [guestEmail, setGuestEmail] = useState('');
```

**Step 5.2:** Import the InvitationService at the top:
```typescript
import { InvitationService } from '../../../services/invitationService';
```

**Step 5.3:** Update the `addManualRunner` function. Replace the existing function with this enhanced version:

```typescript
const addManualRunner = async () => {
  if (!manualRunner.full_name || !state.user?.id) return;

  try {
    setSaving('adding-manual');
    setError('');

    // Validate email if sending invitation
    if (sendInvitationToGuest && !guestEmail) {
      setError('Email is required to send invitation');
      setSaving(null);
      return;
    }

    // Use real email if provided, otherwise temp email
    const emailToUse = sendInvitationToGuest && guestEmail 
      ? guestEmail.toLowerCase().trim()
      : `temp-${Date.now()}@runalcester.temp`;

    // Create a temporary member record for the manual runner
    const tempMember = {
      full_name: manualRunner.full_name,
      email: emailToUse,
      phone: manualRunner.phone || null,
      emergency_contact_name: manualRunner.emergency_contact_name || null,
      emergency_contact_phone: manualRunner.emergency_contact_phone || null,
      health_conditions: manualRunner.health_conditions || null,
      membership_status: 'guest',
      is_temp_runner: true,
      date_joined: new Date().toISOString().split('T')[0]
    };

    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert([tempMember])
      .select()
      .single();

    if (memberError) {
      console.error('Member creation error:', memberError);
      throw memberError;
    }

    // Add attendance record
    const attendanceData = {
      run_id: runId,
      member_id: newMember.id,
      marked_present: true,
      marked_at: new Date().toISOString(),
      marked_by: state.user.id,
      is_manual_addition: true
    };

    const { error: attendanceError } = await supabase
      .from('run_attendance')
      .insert([attendanceData]);
    
    if (attendanceError) {
      console.error('Attendance creation error:', attendanceError);
      throw attendanceError;
    }

    // Send invitation if requested
    if (sendInvitationToGuest && guestEmail) {
      try {
        const invitationResult = await InvitationService.sendInvitation(guestEmail, state.user.id);
        
        if (invitationResult.success) {
          // Link invitation to guest member
          if (invitationResult.invitationId) {
            await supabase
              .from('pending_invitations')
              .update({ guest_member_id: newMember.id })
              .eq('id', invitationResult.invitationId);
          }
          
          alert(`${manualRunner.full_name} added as guest! ${invitationResult.message}`);
        } else {
          alert(`${manualRunner.full_name} added as guest, but invitation failed: ${invitationResult.message}`);
        }
      } catch (invError) {
        console.error('Invitation error:', invError);
        alert(`${manualRunner.full_name} added as guest, but invitation sending failed.`);
      }
    } else {
      alert(`${manualRunner.full_name} added as guest member!`);
    }

    // Reload data
    await loadRunData();
    
    // Reset form
    setManualRunner({
      full_name: '',
      phone: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      health_conditions: ''
    });
    setGuestEmail('');
    setSendInvitationToGuest(false);
    setShowAddRunner(false);

  } catch (err: any) {
    console.error('Failed to add manual runner:', err);
    setError(err.message || 'Failed to add runner');
  } finally {
    setSaving(null);
  }
};
```

**Step 5.4:** Add invitation UI to the manual runner form. Find the manual runner form JSX (where `addRunnerType === 'manual'`) and add this **after** the health conditions field and **before** the submit button:

```typescript
{/* Invitation Checkbox Section */}
<div style={{
  marginTop: '20px',
  paddingTop: '20px',
  borderTop: '1px solid #e5e7eb'
}}>
  <label
    style={{
      display: 'flex',
      alignItems: 'start',
      cursor: 'pointer',
      gap: '12px'
    }}
  >
    <input
      type="checkbox"
      checked={sendInvitationToGuest}
      onChange={(e) => setSendInvitationToGuest(e.target.checked)}
      style={{
        marginTop: '4px',
        width: '18px',
        height: '18px',
        cursor: 'pointer'
      }}
    />
    <div style={{ flex: 1 }}>
      <span style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '4px'
      }}>
        📧 Send registration invitation
      </span>
      <span style={{
        display: 'block',
        fontSize: '13px',
        color: '#6b7280'
      }}>
        Invite this guest to create a full member account
      </span>
    </div>
  </label>

  {sendInvitationToGuest && (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '6px'
    }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#1e40af',
        marginBottom: '8px'
      }}>
        Email Address *
      </label>
      <input
        type="email"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        required={sendInvitationToGuest}
        placeholder="guest@example.com"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #93c5fd',
          borderRadius: '6px',
          fontSize: '14px',
          boxSizing: 'border-box'
        }}
      />
      <p style={{
        margin: '8px 0 0 0',
        fontSize: '12px',
        color: '#1e40af'
      }}>
        We'll send them a link to complete their registration
      </p>
    </div>
  )}
</div>
```

---

## Task 7: Add Invitation Management to Admin Dashboard

### File: `src/modules/admin/pages/AdminReports.tsx`

Add a new section to view and manage pending invitations.

### Step 4.1: Add state for invitations (near the top of the component with other state):
```typescript
const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
const [loadingInvitations, setLoadingInvitations] = useState(false);
```

### Step 4.2: Add function to load invitations:
```typescript
const loadPendingInvitations = async () => {
  setLoadingInvitations(true);
  try {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select(`
        *,
        invited_by_member:members!invited_by(full_name)
      `)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (error) throw error;
    setPendingInvitations(data || []);
  } catch (error) {
    console.error('Error loading pending invitations:', error);
  } finally {
    setLoadingInvitations(false);
  }
};
```

### Step 4.3: Load invitations on mount (add to existing useEffect):
```typescript
useEffect(() => {
  // ... existing code ...
  loadPendingInvitations();
}, []);
```

### Step 4.4: Add resend invitation function:
```typescript
const resendInvitation = async (invitationId: string, email: string) => {
  try {
    const result = await InvitationService.sendInvitation(email);
    if (result.success) {
      alert(`Invitation resent to ${email}`);
      await loadPendingInvitations();
    } else {
      alert(`Failed to resend: ${result.message}`);
    }
  } catch (error) {
    console.error('Error resending invitation:', error);
    alert('Failed to resend invitation');
  }
};
```

### Step 4.5: Import InvitationService at the top:
```typescript
import { InvitationService } from '../../../services/invitationService';
```

### Step 4.6: Add invitation card to the JSX (add after existing admin cards):

```typescript
{/* Pending Invitations Card */}
<div className="card" style={{ marginTop: '24px' }}>
  <div className="card-header">
    <h3 className="card-title">
      📧 Pending Invitations ({pendingInvitations.length})
    </h3>
  </div>
  <div className="card-content">
    {loadingInvitations ? (
      <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</p>
    ) : pendingInvitations.length === 0 ? (
      <p style={{ textAlign: 'center', color: '#6b7280' }}>No pending invitations</p>
    ) : (
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {pendingInvitations.map((invitation) => {
          const daysUntilExpiry = Math.floor(
            (new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          const isExpiringSoon = daysUntilExpiry <= 7;

          return (
            <div
              key={invitation.id}
              style={{
                padding: '16px',
                marginBottom: '12px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {invitation.email}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                    Invited by: {invitation.invited_by_member?.full_name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Sent: {new Date(invitation.invited_at).toLocaleDateString()}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      marginTop: '4px',
                      color: isExpiringSoon ? '#dc2626' : '#6b7280'
                    }}
                  >
                    {isExpiringSoon && '⚠️ '}
                    Expires in {daysUntilExpiry} days
                  </div>
                </div>

                <button
                  onClick={() => resendInvitation(invitation.id, invitation.email)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px'
                  }}
                >
                  🔄 Resend
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>
```

---

---

## CSS Styling Guidelines

### Use Existing CSS Classes

The project has a well-organized CSS system. **Always use existing CSS classes** instead of creating inline styles or new CSS files unless absolutely necessary.

### Primary CSS Files to Reference:

1. **`src/styles/components/Buttons.css`** - All button styles
   - `.btn`, `.btn-primary`, `.btn-secondary` - Standard buttons
   - `.action-btn`, `.action-btn--primary`, `.action-btn--secondary` - Action buttons
   
2. **`src/styles/components/Cards.css`** or **`src/styles/02-layout/page-layout.css`** - Card layouts
   - `.card`, `.card-header`, `.card-title`, `.card-content`
   
3. **`src/styles/04-pages/forms.css`** - Form styles
   - Form inputs, labels, and authentication page styling

4. **`src/styles/01-base/variables.css`** - Design system variables
   - Color palette: `var(--red-primary)`, `var(--gray-600)`, etc.
   - Spacing, typography, and other design tokens

### CSS Best Practices for This Project:

1. **Use existing classes first** - Check Buttons.css, page-layout.css, and forms.css
2. **Use CSS variables** - `var(--red-primary)` not `#dc2626`
3. **Follow BEM naming** - `block__element--modifier` for new classes
4. **Mobile-first responsive** - Use `clamp()` for responsive sizing
5. **Avoid inline styles** - Only use for dynamic values (not static styling)
6. **No !important** - The CSS hierarchy is clean, keep it that way

### Example: Styling the Bulk Invitation Page

```typescript
// ✅ GOOD - Uses existing classes and CSS variables
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Send Invitations</h3>
  </div>
  <div className="card-content">
    <button className="btn btn-primary">Send</button>
  </div>
</div>

// ❌ BAD - Inline styles and hard-coded colors
<div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
  <h3 style={{ color: '#dc2626' }}>Send Invitations</h3>
  <button style={{ background: '#dc2626', color: 'white', padding: '10px' }}>
    Send
  </button>
</div>
```

### When New CSS is Needed:

If you need to create new CSS that doesn't exist:
1. Add it to the most appropriate existing file (e.g., `04-pages/admin.css` for admin-specific styles)
2. Use CSS variables for colors and spacing
3. Follow the existing naming patterns
4. Keep specificity low (avoid nesting beyond 2-3 levels)

---

## Testing Checklist

Before deploying to production, test each feature:

### 1. Invitation Service Testing
- [ ] Single invitation to new email creates record in `pending_invitations`
- [ ] Email is received with correct registration link
- [ ] Invitation to existing member sends password reset
- [ ] Invitation to duplicate email sends reminder
- [ ] Invalid email format is rejected
- [ ] Token validation works correctly

### 2. Registration Flow Testing
- [ ] Registration with `?token=xxx` validates token
- [ ] Invalid token shows error message
- [ ] Email field is pre-filled and disabled with valid token
- [ ] Registration marks invitation as 'registered'
- [ ] Registration without token still works normally

### 3. Bulk Invitation Testing
- [ ] CSV upload parses emails correctly
- [ ] Text input with various separators (newlines, commas) works
- [ ] Duplicate emails are removed
- [ ] Progress indicator updates during send
- [ ] Results show correct status for each email
- [ ] Rate limiting (1 per second) is working

### 4. Sidebar Invitation Testing
- [ ] Modal opens and closes correctly
- [ ] Only visible to Admin and LIRF users
- [ ] Single email invitation works
- [ ] Success/error messages display correctly

### 5. Guest Member Invitation Testing
- [ ] Checkbox appears in "Add Runner" modal
- [ ] Email field appears when checkbox is ticked
- [ ] Guest member is created with real email
- [ ] Invitation is sent successfully
- [ ] Invitation is linked to guest member record

### 6. Admin Dashboard Testing
- [ ] Pending invitations display correctly
- [ ] Resend button works
- [ ] Expiry warnings show for invitations expiring soon
- [ ] Link to bulk invitations page works

---

## Deployment Steps

1. **Create feature branch:**
   ```bash
   git checkout -b feature/member-invitations
   ```

2. **Implement all tasks above**

3. **Test thoroughly on development environment**

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "Add member invitation system with bulk upload, sidebar quick invite, and guest member invitation"
   ```

5. **Push to GitHub:**
   ```bash
   git push origin feature/member-invitations
   ```

6. **Create Pull Request and review**

7. **Merge to main and deploy to production**

8. **Verify in production:**
   - Send test invitation to your own email
   - Test registration with invitation link
   - Monitor `pending_invitations` table in Supabase

---

## Security Notes

- All email addresses are validated and sanitized before database insertion
- Tokens are cryptographically secure (32 bytes of random data)
- RLS policies ensure only Admin/LIRF can create invitations
- Invitations automatically expire after 30 days
- Rate limiting prevents email spam (1 email per second)
- Security events are logged for audit trail

---

## Support & Troubleshooting

**Problem: Emails not sending**
- Check Gmail SMTP credentials in environment variables
- Verify `/api/send-email` endpoint is working
- Check browser console for errors

**Problem: Token validation fails**
- Verify `pending_invitations` table exists
- Check RLS policies allow public read by token
- Ensure token hasn't expired

**Problem: Duplicate invitations**
- Service automatically handles duplicates
- Existing members get password reset
- Pending invitations get reminder email

---

End of implementation guide.
