import { supabase } from '../../../services/supabase';
import { EmailService, EmailNotificationData } from './EmailService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'run_specific' | 'general' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  run_id?: string;
  sent_by: string;
  sent_at: string;
  scheduled_for?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  sender_name?: string;
  run_title?: string;
  run_date?: string;
  run_time?: string;
  
  // Recipient status (when viewing as recipient)
  read_at?: string;
  dismissed_at?: string;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  member_id: string;
  delivered_at: string;
  read_at?: string;
  dismissed_at?: string;
  
  // Joined data
  member_name?: string;
  member_email?: string;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  type: 'run_specific' | 'general' | 'urgent';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  run_id?: string;
  recipient_ids?: string[]; // If not provided, will be determined by type and run_id
  scheduled_for?: string;
  expires_at?: string;
  send_email?: boolean; // Whether to send email notifications
  affiliated_only?: boolean; // Filter to EA affiliated members only
}

export class NotificationService {
  /**
   * Create a new notification and send to appropriate recipients
   */
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    console.log('📝 Creating notification:', data);

    // Create the notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'normal',
        run_id: data.run_id,
        sent_by: currentUser.id,
        scheduled_for: data.scheduled_for,
        expires_at: data.expires_at
      })
      .select()
      .single();

    if (notificationError) {
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }

    console.log('✅ Notification created:', notification);

    // Determine recipients if not provided
    let recipientIds = data.recipient_ids;
    if (!recipientIds) {
      recipientIds = await this.determineRecipients(data.type, data.run_id, data.affiliated_only);
    }

    console.log('👥 Recipients determined:', recipientIds);

    // Create recipient records
    if (recipientIds.length > 0) {
      const recipients = recipientIds.map(memberId => ({
        notification_id: notification.id,
        member_id: memberId
      }));

      console.log('📨 Creating recipient records:', recipients);

      const { data: recipientResults, error: recipientsError } = await supabase
        .from('notification_recipients')
        .insert(recipients)
        .select();

      if (recipientsError) {
        console.error('❌ Failed to create recipients:', recipientsError);
        throw new Error(`Failed to create notification recipients: ${recipientsError.message}`);
      }

      console.log('✅ Recipients created:', recipientResults);

      // Send email notifications if requested (async - don't wait)
      if (data.send_email !== false) { // Default to true if not specified
        console.log('📧 Starting email notification process (background)...');
        // Fire and forget - don't await email sending
        this.sendEmailNotifications(data, recipientIds).catch(error => {
          console.error('📧 Background email sending failed:', error);
        });
      } else {
        console.log('📧 Email notifications skipped (send_email = false)');
      }
    } else {
      console.warn('⚠️ No recipients found for notification');
    }

    return notification;
  }

  /**
   * Send email notifications for a created notification
   */
  private static async sendEmailNotifications(
    data: CreateNotificationData,
    recipientIds: string[]
  ): Promise<void> {
    try {
      // Get members who have email notifications enabled
      const emailRecipients = await EmailService.getMembersWithEmailEnabled(recipientIds);
      
      if (emailRecipients.length === 0) {
        console.log('📧 No recipients have email notifications enabled');
        return;
      }

      console.log(`📧 Found ${emailRecipients.length} recipients with email enabled`);

      // Get run details if this is a run-specific notification
      let runDetails = undefined;
      if (data.type === 'run_specific' && data.run_id) {
        const { data: runData, error: runError } = await supabase
          .from('scheduled_runs')
          .select('run_title, run_date, run_time, meeting_point, approximate_distance')
          .eq('id', data.run_id)
          .single();

        if (!runError && runData) {
          runDetails = runData;
        }
      }

      // Prepare email data
      const emailData: EmailNotificationData = {
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority || 'normal',
        runDetails,
        recipients: emailRecipients
      };

      // Check if we can send emails (daily limit)
      const emailStatus = await EmailService.canSendEmails();
      if (!emailStatus.canSend) {
        console.warn('📧 Daily email limit reached, skipping email notifications');
        return;
      }

      if (emailRecipients.length > emailStatus.remaining) {
        console.warn(`📧 ${emailRecipients.length} recipients but only ${emailStatus.remaining} emails remaining today`);
      }

      // Send emails immediately instead of queuing
      console.log('📧 Sending emails immediately...');
      const results = await EmailService.sendNotificationEmails(emailData);
      
      console.log('📧 Email sending results:', results);

      // Log any errors
      if (results.errors.length > 0) {
        console.error('📧 Email sending errors:', results.errors);
      }

    } catch (error) {
      console.error('📧 Failed to send email notifications:', error);
      // Don't throw here - we don't want email failures to break notification creation
    }
  }

  /**
   * Determine who should receive a notification based on type and run_id
   */
  private static async determineRecipients(
    type: string,
    runId?: string,
    affiliatedOnly?: boolean
  ): Promise<string[]> {
    console.log('🔍 Determining recipients for:', { type, runId, affiliatedOnly });

    if (type === 'general' || type === 'urgent') {
      // Build query for active members
      let query = supabase
        .from('members')
        .select('id')
        .eq('membership_status', 'active');

      // Filter to EA affiliated members only if requested
      if (affiliatedOnly) {
        query = query.eq('is_paid_member', true);
      }

      const { data: members, error } = await query;

      if (error) {
        console.error('Failed to get members:', error);
        return [];
      }

      console.log('📧 Found', members.length, affiliatedOnly ? 'affiliated' : 'active', 'members for general notification');
      return members.map(member => member.id);
    }

    if (type === 'run_specific' && runId) {
      // Send to members booked on the specific run
      const { data: bookings, error } = await supabase
        .from('run_bookings')
        .select('member_id')
        .eq('run_id', runId)
        .is('cancelled_at', null); // Only active bookings

      if (error) {
        console.error('Failed to get run bookings:', error);
        return [];
      }

      console.log('🏃‍♂️ Found', bookings.length, 'active bookings for run:', runId);
      console.log('🏃‍♂️ Booking member IDs:', bookings.map(b => b.member_id));
      return bookings.map(booking => booking.member_id);
    }

    console.log('⚠️ No recipients determined for type:', type);
    return [];
  }

  /**
   * Get notifications for the current user (dashboard view)
   */
  static async getUserNotifications(limit = 10): Promise<Notification[]> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase
      .from('notification_recipients')
      .select(`
        read_at,
        dismissed_at,
        delivered_at,
        notifications!inner (
          id,
          title,
          message,
          type,
          priority,
          run_id,
          sent_by,
          sent_at,
          expires_at,
          created_at,
          updated_at,
          scheduled_for,
          scheduled_runs (
            run_title,
            run_date,
            run_time
          )
        )
      `)
      .eq('member_id', currentUser.id)
      .is('dismissed_at', null) // Only non-dismissed notifications
      .order('delivered_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user notifications: ${error.message}`);
    }

    // Get sender names separately
    const notifications = data
      .filter(item => item.notifications) // Ensure notifications exists
      .filter(item => {
        // Filter out expired notifications here since we can't do it in the query
        const notification = item.notifications as any;
        if (!notification.expires_at) return true; // No expiry date
        return new Date(notification.expires_at) > new Date(); // Not expired
      })
      .map(item => {
        const notification = item.notifications as any;
        return {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          run_id: notification.run_id,
          sent_by: notification.sent_by,
          sent_at: notification.sent_at,
          scheduled_for: notification.scheduled_for,
          expires_at: notification.expires_at,
          created_at: notification.created_at,
          updated_at: notification.updated_at,
          sender_name: undefined, // Will be populated below
          run_title: notification.scheduled_runs?.run_title,
          run_date: notification.scheduled_runs?.run_date,
          run_time: notification.scheduled_runs?.run_time,
          read_at: item.read_at,
          dismissed_at: item.dismissed_at
        } as Notification;
      });

    // Get sender names separately (but only if we have notifications to avoid extra query)
    if (notifications.length === 0) {
      return notifications;
    }

    // Get sender names in a separate query
    const senderIds = [...new Set(notifications.map(n => n.sent_by))];
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from('members')
        .select('id, full_name')
        .in('id', senderIds);

      if (senders) {
        const senderMap = new Map(senders.map(s => [s.id, s.full_name]));
        notifications.forEach(notification => {
          notification.sender_name = senderMap.get(notification.sent_by);
        });
      }
    }

    return notifications;
  }

  /**
   * Get all notifications (admin/LIRF management view)
   */
  static async getAllNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        scheduled_runs (
          run_title,
          run_date,
          run_time
        )
      `)
      .order('sent_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get all notifications: ${error.message}`);
    }

    return data.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      run_id: notification.run_id,
      sent_by: notification.sent_by,
      sent_at: notification.sent_at,
      scheduled_for: notification.scheduled_for,
      expires_at: notification.expires_at,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      sender_name: undefined, // We'll get this separately if needed
      run_title: (notification.scheduled_runs as any)?.run_title,
      run_date: (notification.scheduled_runs as any)?.run_date,
      run_time: (notification.scheduled_runs as any)?.run_time
    } as Notification));
  }

  /**
   * Get recipients for a specific notification
   */
  static async getNotificationRecipients(notificationId: string): Promise<NotificationRecipient[]> {
    const { data, error } = await supabase
      .from('notification_recipients')
      .select(`
        *,
        members (
          full_name,
          email
        )
      `)
      .eq('notification_id', notificationId)
      .order('delivered_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get notification recipients: ${error.message}`);
    }

    return data.map(recipient => ({
      id: recipient.id,
      notification_id: recipient.notification_id,
      member_id: recipient.member_id,
      delivered_at: recipient.delivered_at,
      read_at: recipient.read_at,
      dismissed_at: recipient.dismissed_at,
      member_name: (recipient.members as any)?.full_name,
      member_email: (recipient.members as any)?.email
    } as NotificationRecipient));
  }

  /**
   * Mark notification as read for current user
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const { error } = await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('notification_id', notificationId)
      .eq('member_id', currentUser.id)
      .is('read_at', null); // Only update if not already read

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Dismiss notification for current user
   */
  static async dismissNotification(notificationId: string): Promise<void> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    console.log('📤 Dismissing notification:', notificationId, 'for user:', currentUser.id);

    const { data, error } = await supabase
      .from('notification_recipients')
      .update({ 
        dismissed_at: new Date().toISOString(),
        read_at: new Date().toISOString() // Also mark as read when dismissing
      })
      .eq('notification_id', notificationId)
      .eq('member_id', currentUser.id)
      .select(); // Add select to see what was updated

    if (error) {
      console.error('❌ Failed to dismiss notification:', error);
      throw new Error(`Failed to dismiss notification: ${error.message}`);
    }

    console.log('✅ Notification dismissed successfully:', data);
  }

  /**
   * Get runs assigned to current user (for LIRF notification creation)
   */
  static async getAssignedRuns(): Promise<any[]> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase
      .from('scheduled_runs')
      .select('*')
      .or(`assigned_lirf_1.eq.${currentUser.id},assigned_lirf_2.eq.${currentUser.id},assigned_lirf_3.eq.${currentUser.id}`)
      .gte('run_date', new Date().toISOString().split('T')[0]) // Only future runs
      .order('run_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get assigned runs: ${error.message}`);
    }

    return data;
  }

  /**
   * Get unread notification count for current user
   */
  static async getUnreadCount(): Promise<number> {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notification_recipients')
      .select('id', { count: 'exact' })
      .eq('member_id', currentUser.id)
      .is('read_at', null)
      .is('dismissed_at', null);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get email sending status (for UI feedback)
   */
  static async getEmailSendingStatus(): Promise<{
    canSend: boolean;
    remaining: number;
    total: number;
  }> {
    return await EmailService.canSendEmails();
  }

  /**
   * Get count of active members
   */
  static async getActiveMembersCount(): Promise<number> {
    const { count, error } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('membership_status', 'active');

    if (error) {
      console.error('Failed to get active members count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get count of EA affiliated members
   */
  static async getAffiliatedMembersCount(): Promise<number> {
    const { count, error } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('membership_status', 'active')
      .eq('is_paid_member', true);

    if (error) {
      console.error('Failed to get affiliated members count:', error);
      return 0;
    }

    return count || 0;
  }
}