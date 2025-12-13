import { supabase } from './supabase';
import { GmailSMTP } from '../utils/GmailSMTP';
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

    // Check members table - EXCLUDE guest members and temp runners
    const { data: memberData } = await supabase
      .from('members')
      .select('id, email, membership_status, is_temp_runner')
      .eq('email', cleanEmail)
      .maybeSingle();

    // Only count as "existing member" if they're a real member (not a guest)
    const isRealMember = memberData &&
                         memberData.membership_status !== 'guest' &&
                         !memberData.is_temp_runner &&
                         !memberData.email?.includes('temp-') &&
                         !memberData.email?.includes('@runalcester.temp');

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
      existsInMembers: !!isRealMember,
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
      <h1 style="margin: 0; font-size: 28px;">Welcome to Run Alcester!</h1>
    </div>

    <div class="content">
      <p style="font-size: 16px; margin-bottom: 20px;"><strong>You're invited to join our running community!</strong></p>

      <p>As a member of Run Alcester, you'll be able to:</p>
      <ul>
        <li>Book your place on runs</li>
        <li>Track your running sessions</li>
        <li>Connect with other club members</li>
        <li>Manage your membership details</li>
        <li>Receive run updates and notifications</li>
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
      subject: 'Welcome to Run Alcester - Complete Your Registration',
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

      console.log('Invitation marked as registered');
    } catch (error) {
      console.error('Error marking invitation as registered:', error);
      // Don't throw - registration already succeeded
    }
  }
}
