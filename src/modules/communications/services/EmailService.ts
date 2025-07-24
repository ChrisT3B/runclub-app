// src/modules/communications/services/EmailService.ts

import { supabase } from '../../../services/supabase';
import { GmailSMTP } from '../../../utils/GmailSMTP';

export interface EmailNotificationData {
  title: string;
  message: string;
  type: 'run_specific' | 'general' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  runDetails?: {
    run_title: string;
    run_date: string;
    run_time: string;
    meeting_point: string;
    approximate_distance?: string;
  };
  recipients: Array<{
    id: string;
    email: string;
    full_name: string;
  }>;
}

export class EmailService {
  private static readonly APP_URL = window.location.origin;
  private static readonly DAILY_LIMIT = 450; // Stay under Gmail's 500/day limit
  
  /**
   * Send notification emails to recipients who have email notifications enabled
   */
  static async sendNotificationEmails(data: EmailNotificationData): Promise<{
    sent: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    console.log('📧 Starting immediate email notification send:', data.title);
    
    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Check daily sending limit
    const dailyCount = await this.getDailySentCount();
    const remainingLimit = this.DAILY_LIMIT - dailyCount;
    
    if (remainingLimit <= 0) {
      results.errors.push('Daily email limit reached. Emails will not be sent.');
      results.skipped = data.recipients.length;
      return results;
    }

    // Limit recipients to remaining daily allowance
    const recipientsToProcess = data.recipients.slice(0, remainingLimit);
    if (data.recipients.length > remainingLimit) {
      results.errors.push(`Limited to ${remainingLimit} emails due to daily limit. ${data.recipients.length - remainingLimit} emails skipped.`);
      results.skipped = data.recipients.length - remainingLimit;
    }

    // Send emails immediately with real SMTP
    for (const recipient of recipientsToProcess) {
      try {
        await this.sendSingleEmailSMTP(recipient, data);
        results.sent++;
        
        // Log the sent email
        await this.logEmailSent(recipient.id, data.title);
        
        // Add small delay between emails to be gentle with Gmail
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second
        
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        results.failed++;
        results.errors.push(`Failed to send to ${recipient.full_name}: ${error}`);
      }
    }

    console.log('📧 Email send complete:', results);
    return results;
  }

  /**
   * Send a single email using Gmail SMTP via our utility class
   */
  private static async sendSingleEmailSMTP(
    recipient: { id: string; email: string; full_name: string },
    data: EmailNotificationData
  ): Promise<void> {
    const emailHtml = this.generateEmailHTML(recipient, data);
    const emailText = this.generateEmailText(recipient, data);
    const subject = this.generateSubject(data);

    console.log(`📧 Sending email to: ${recipient.email}`);
    console.log(`📧 Subject: ${subject}`);

    // Use our Gmail SMTP utility
    await GmailSMTP.sendEmail({
      to: recipient.email,
      subject: subject,
      html: emailHtml,
      text: emailText
    });

    console.log(`✅ Email sent successfully to ${recipient.email}`);
  }

  /**
   * Generate email subject line
   */
  private static generateSubject(data: EmailNotificationData): string {
    const prefix = data.type === 'urgent' ? '[URGENT] ' : '';
    return `${prefix}[Run Alcester] ${data.title}`;
  }

  /**
   * Generate HTML email content
   */
  private static generateEmailHTML(
    recipient: { full_name: string },
    data: EmailNotificationData
  ): string {
    const priorityEmoji = {
      low: '📝',
      normal: '📢',
      high: '⚠️',
      urgent: '🚨'
    }[data.priority];

    const typeEmoji = {
      run_specific: '🏃‍♂️',
      general: '📢',
      urgent: '🚨'
    }[data.type];

    const unsubscribeUrl = `${this.APP_URL}?unsubscribe=true`;
    const appUrl = this.APP_URL;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Run Alcester Notification</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 0; 
        }
        .header { 
            background: linear-gradient(135deg, #dc2626, #b91c1c); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold; 
        }
        .header p { 
            margin: 10px 0 0 0; 
            opacity: 0.9; 
            font-size: 16px; 
        }
        .content { 
            padding: 30px 20px; 
        }
        .notification-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }
        .notification-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
        }
        .priority-badge {
            background: ${data.priority === 'urgent' ? '#fef2f2' : data.priority === 'high' ? '#fef3c7' : '#f3f4f6'};
            color: ${data.priority === 'urgent' ? '#dc2626' : data.priority === 'high' ? '#f59e0b' : '#6b7280'};
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #4b5563;
            margin-bottom: 25px;
            white-space: pre-wrap;
        }
        .run-details {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .run-details h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 18px;
        }
        .run-detail-item {
            margin-bottom: 8px;
            font-size: 14px;
            color: #6b7280;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .unsubscribe {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 15px;
        }
        .unsubscribe a {
            color: #dc2626;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏃‍♂️ Run Alcester</h1>
            <p>Notification Update</p>
        </div>
        
        <div class="content">
            <div class="notification-header">
                <span style="font-size: 24px;">${typeEmoji}</span>
                <h2 class="notification-title">${data.title}</h2>
                <span class="priority-badge">${priorityEmoji} ${data.priority}</span>
            </div>
            
            <p style="font-size: 16px; color: #1f2937; margin-bottom: 5px;">
                Hi ${recipient.full_name},
            </p>
            
            <div class="message">${data.message}</div>
            
            ${data.runDetails ? `
            <div class="run-details">
                <h3>🏃‍♂️ Run Details</h3>
                <div class="run-detail-item"><strong>📅 Date:</strong> ${new Date(data.runDetails.run_date + 'T12:00:00').toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
                <div class="run-detail-item"><strong>🕐 Time:</strong> ${data.runDetails.run_time}</div>
                <div class="run-detail-item"><strong>📍 Meeting Point:</strong> ${data.runDetails.meeting_point}</div>
                ${data.runDetails.approximate_distance ? `<div class="run-detail-item"><strong>🏃‍♂️ Distance:</strong> ${data.runDetails.approximate_distance}</div>` : ''}
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}" class="cta-button">
                    View in Run Alcester App →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>
                This notification was sent by Run Alcester.<br>
                You're receiving this because you're a club member with email notifications enabled.
            </p>
            
            <div class="unsubscribe">
                <a href="${unsubscribeUrl}">Unsubscribe from email notifications</a> | 
                <a href="${appUrl}">Update preferences</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text email content (fallback)
   */
  private static generateEmailText(
    recipient: { full_name: string },
    data: EmailNotificationData
  ): string {
    let text = `Run Alcester Notification\n\n`;
    text += `Hi ${recipient.full_name},\n\n`;
    text += `${data.title}\n`;
    text += `Priority: ${data.priority.toUpperCase()}\n\n`;
    text += `${data.message}\n\n`;

    if (data.runDetails) {
      text += `RUN DETAILS:\n`;
      text += `Date: ${new Date(data.runDetails.run_date + 'T12:00:00').toLocaleDateString('en-GB')}\n`;
      text += `Time: ${data.runDetails.run_time}\n`;
      text += `Meeting Point: ${data.runDetails.meeting_point}\n`;
      if (data.runDetails.approximate_distance) {
        text += `Distance: ${data.runDetails.approximate_distance}\n`;
      }
      text += `\n`;
    }

    text += `View in app: ${this.APP_URL}\n\n`;
    text += `---\n`;
    text += `You're receiving this because you're a Run Alcester member with email notifications enabled.\n`;
    text += `To unsubscribe: ${this.APP_URL}?unsubscribe=true`;

    return text;
  }

  /**
   * Get count of emails sent today
   */
  private static async getDailySentCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact' })
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .lt('sent_at', `${today}T23:59:59.999Z`);

    if (error) {
      console.error('Error getting daily email count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Log email sent for tracking daily limits
   */
  private static async logEmailSent(recipientId: string, subject: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_logs')
        .insert({
          recipient_id: recipientId,
          subject: subject,
          sent_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging email:', error);
      }
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * Get members who have email notifications enabled
   */
  static async getMembersWithEmailEnabled(memberIds: string[]): Promise<Array<{
    id: string;
    email: string;
    full_name: string;
  }>> {
    const { data, error } = await supabase
      .from('members')
      .select('id, email, full_name')
      .in('id', memberIds)
      .eq('email_notifications_enabled', true)
      .eq('membership_status', 'active');

    if (error) {
      console.error('Error getting members with email enabled:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if email sending is available (within daily limits)
   */
  static async canSendEmails(): Promise<{
    canSend: boolean;
    remaining: number;
    total: number;
  }> {
    const dailyCount = await this.getDailySentCount();
    const remaining = Math.max(0, this.DAILY_LIMIT - dailyCount);
    
    return {
      canSend: remaining > 0,
      remaining,
      total: this.DAILY_LIMIT
    };
  }

  /**
   * Test email sending (for development/debugging)
   */
  static async testEmailSending(recipientEmail: string): Promise<void> {
    console.log('🧪 Testing email sending...');
    await GmailSMTP.testEmail(recipientEmail);
    console.log('✅ Email test completed');
  }
}