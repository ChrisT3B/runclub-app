// src/modules/communications/services/LirfReminderService.ts
// Weekly email reminder service for runs requiring LIRF assignment

import { supabase } from '../../../services/supabase';
import { GmailSMTP } from '../../../utils/GmailSMTP';

interface RunRequiringLirf {
  id: string;
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  lirfs_required: number;
  assigned_lirf_count: number;
  lirf_vacancies: number;
}

interface LirfRecipient {
  id: string;
  email: string;
  full_name: string;
}

export default class LirfReminderService {
  /**
   * Get all runs in the next 7 days that need LIRF assignment
   */
  private static async getRunsRequiringLirf(): Promise<RunRequiringLirf[]> {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split('T')[0];
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

      // Get all scheduled runs in the next 7 days
      const { data: runs, error } = await supabase
        .from('scheduled_runs')
        .select('*')
        .gte('run_date', todayStr)
        .lte('run_date', sevenDaysStr)
        .eq('run_status', 'scheduled')
        .order('run_date', { ascending: true })
        .order('run_time', { ascending: true });

      if (error) {
        console.error('Error fetching runs requiring LIRF:', error);
        throw new Error(error.message);
      }

      if (!runs || runs.length === 0) {
        return [];
      }

      // Filter runs that need LIRF assignment
      const runsRequiringLirf: RunRequiringLirf[] = runs
        .map(run => {
          // Count assigned LIRFs
          let assignedCount = 0;
          if (run.assigned_lirf_1) assignedCount++;
          if (run.assigned_lirf_2) assignedCount++;
          if (run.assigned_lirf_3) assignedCount++;

          const vacancies = run.lirfs_required - assignedCount;

          return {
            id: run.id,
            run_title: run.run_title,
            run_date: run.run_date,
            run_time: run.run_time,
            meeting_point: run.meeting_point,
            approximate_distance: run.approximate_distance,
            lirfs_required: run.lirfs_required,
            assigned_lirf_count: assignedCount,
            lirf_vacancies: vacancies
          };
        })
        .filter(run => run.lirf_vacancies > 0); // Only include runs with LIRF vacancies

      return runsRequiringLirf;
    } catch (error) {
      console.error('LirfReminderService.getRunsRequiringLirf error:', error);
      throw error;
    }
  }

  /**
   * Get all members with LIRF or Admin access level
   * NOTE: This IGNORES email_notifications_enabled setting as per requirements
   */
  private static async getLirfRecipients(): Promise<LirfRecipient[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, email, full_name')
        .in('access_level', ['lirf', 'admin'])
        .eq('membership_status', 'active')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching LIRF recipients:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('LirfReminderService.getLirfRecipients error:', error);
      throw error;
    }
  }

  /**
   * Generate HTML email for LIRF reminder
   */
  private static generateReminderEmailHTML(
    recipientName: string,
    runs: RunRequiringLirf[]
  ): string {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const runsHTML = runs.map(run => {
      const runDate = new Date(run.run_date);
      const formattedRunDate = runDate.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });

      const runUrl = `https://bookings.runalcester.co.uk/runs/${run.id}`;

      return `
        <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 12px; border-radius: 4px;">
          <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 8px;">
            ${run.run_title}
          </div>
          <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <div><strong>Date:</strong> ${formattedRunDate} at ${run.run_time}</div>
            <div><strong>Meeting Point:</strong> ${run.meeting_point}</div>
            ${run.approximate_distance ? `<div><strong>Distance:</strong> ${run.approximate_distance}</div>` : ''}
            <div style="color: #dc2626; font-weight: 600; margin-top: 8px;">
              ⚠️ LIRF Vacancies: ${run.lirf_vacancies} of ${run.lirfs_required} needed
            </div>
            <div style="margin-top: 12px;">
              <a href="${runUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 500;">
                View & Assign LIRFs →
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LIRF Assignment Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🏃‍♂️ Run Alcester</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Weekly LIRF Assignment Reminder</p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            Hi <strong>${recipientName}</strong>,
          </p>

          <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">
            This is your weekly reminder for runs requiring LIRF assignment in the next 7 days.
          </p>

          ${runs.length > 0 ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <div style="font-weight: 600; color: #dc2626; font-size: 14px; margin-bottom: 4px;">
                ⚠️ ${runs.length} run${runs.length !== 1 ? 's' : ''} requiring LIRF assignment
              </div>
              <div style="color: #991b1b; font-size: 13px;">
                Please review and assign LIRFs as soon as possible
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              ${runsHTML}
            </div>
          ` : `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <div style="font-weight: 600; color: #166534; font-size: 14px;">
                ✅ All runs in the next 7 days have LIRFs assigned
              </div>
              <div style="color: #15803d; font-size: 13px;">
                Great work! No action required this week.
              </div>
            </div>
          `}

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://bookings.runalcester.co.uk/admin/runs" 
               style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Manage Run Assignments
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="margin-top: 20px; padding: 20px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0 0 8px 0;">
            This is an automated weekly reminder sent every Friday.
          </p>
          <p style="margin: 0;">
            <strong>Run Alcester</strong> | ${formattedDate}
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for LIRF reminder
   */
  private static generateReminderEmailText(
    recipientName: string,
    runs: RunRequiringLirf[]
  ): string {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let text = `RUN ALCESTER - WEEKLY LIRF ASSIGNMENT REMINDER\n`;
    text += `${formattedDate}\n\n`;
    text += `Hi ${recipientName},\n\n`;
    text += `This is your weekly reminder for runs requiring LIRF assignment in the next 7 days.\n\n`;

    if (runs.length > 0) {
      text += `⚠️ ${runs.length} RUN${runs.length !== 1 ? 'S' : ''} REQUIRING LIRF ASSIGNMENT:\n\n`;

      runs.forEach((run, index) => {
        const runDate = new Date(run.run_date);
        const formattedRunDate = runDate.toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        });

        text += `${index + 1}. ${run.run_title}\n`;
        text += `   Date: ${formattedRunDate} at ${run.run_time}\n`;
        text += `   Meeting Point: ${run.meeting_point}\n`;
        if (run.approximate_distance) {
          text += `   Distance: ${run.approximate_distance}\n`;
        }
        text += `   ⚠️ LIRF Vacancies: ${run.lirf_vacancies} of ${run.lirfs_required} needed\n\n`;
      });

      text += `Please log in to assign LIRFs as soon as possible:\n`;
      text += `https://bookings.runalcester.co.uk/admin/runs\n\n`;
    } else {
      text += `✅ ALL RUNS IN THE NEXT 7 DAYS HAVE LIRFs ASSIGNED\n\n`;
      text += `Great work! No action required this week.\n\n`;
    }

    text += `---\n`;
    text += `This is an automated weekly reminder sent every Friday.\n`;
    text += `Run Alcester Booking System\n`;

    return text;
  }

  /**
   * Send LIRF reminder email to a single recipient
   */
  private static async sendReminderToRecipient(
    recipient: LirfRecipient,
    runs: RunRequiringLirf[]
  ): Promise<void> {
    const subject = runs.length > 0 
      ? `🏃‍♂️ LIRF Reminder: ${runs.length} run${runs.length !== 1 ? 's' : ''} need assignment`
      : '✅ LIRF Reminder: All runs covered';

    const htmlContent = this.generateReminderEmailHTML(recipient.full_name, runs);
    const textContent = this.generateReminderEmailText(recipient.full_name, runs);

    await GmailSMTP.sendEmail({
      to: recipient.email,
      subject: subject,
      html: htmlContent,
      text: textContent
    });

    console.log(`✅ LIRF reminder sent to ${recipient.full_name} (${recipient.email})`);
  }

  /**
   * Main function to send weekly LIRF reminder emails
   * This should be called every Friday via a scheduled task
   */
  static async sendWeeklyLirfReminder(): Promise<{
    success: boolean;
    recipientCount: number;
    runsRequiringLirf: number;
    errors: string[];
  }> {
    console.log('📧 Starting weekly LIRF reminder process...');
    
    const errors: string[] = [];
    let recipientCount = 0;

    try {
      // Get runs requiring LIRF in next 7 days
      const runs = await this.getRunsRequiringLirf();
      console.log(`📊 Found ${runs.length} runs requiring LIRF assignment`);

      // Get all LIRF/Admin recipients (ignoring email notification preferences)
      const recipients = await this.getLirfRecipients();
      console.log(`👥 Found ${recipients.length} LIRF/Admin recipients`);

      if (recipients.length === 0) {
        console.warn('⚠️ No LIRF/Admin recipients found');
        return {
          success: true,
          recipientCount: 0,
          runsRequiringLirf: runs.length,
          errors: ['No LIRF/Admin recipients found']
        };
      }

      // Send email to each recipient
      for (const recipient of recipients) {
        try {
          await this.sendReminderToRecipient(recipient, runs);
          recipientCount++;

          // Add delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          const errorMsg = `Failed to send to ${recipient.full_name}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`✅ Weekly LIRF reminder complete. Sent to ${recipientCount}/${recipients.length} recipients`);

      return {
        success: errors.length < recipients.length,
        recipientCount,
        runsRequiringLirf: runs.length,
        errors
      };

    } catch (error: any) {
      console.error('❌ Weekly LIRF reminder failed:', error);
      errors.push(`System error: ${error.message}`);
      
      return {
        success: false,
        recipientCount,
        runsRequiringLirf: 0,
        errors
      };
    }
  }

  /**
   * Test function to preview the reminder email
   * Useful for development and testing
   */
  static async testReminderEmail(testEmail: string): Promise<void> {
    console.log('🧪 Testing LIRF reminder email...');
    
    const runs = await this.getRunsRequiringLirf();
    
    const testRecipient: LirfRecipient = {
      id: 'test-id',
      email: testEmail,
      full_name: 'Test User'
    };

    await this.sendReminderToRecipient(testRecipient, runs);
    
    console.log('✅ Test email sent successfully');
  }
}
