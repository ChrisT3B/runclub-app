// src/modules/communications/schedulers/LirfReminderScheduler.ts
// Scheduler to trigger weekly LIRF reminder emails every Friday

import LirfReminderService from '../services/LirfReminderService';

export default class LirfReminderScheduler {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  
  /**
   * Check if today is Friday
   */
  private static isFriday(): boolean {
    const today = new Date();
    return today.getDay() === 5; // Friday = 5 (Sunday = 0, Monday = 1, etc.)
  }

  /**
   * Check if the reminder has already been sent today
   */
  private static async hasReminderBeenSentToday(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const key = `lirf_reminder_sent_${today}`;
    
    // Check localStorage for today's reminder status
    const sentToday = localStorage.getItem(key);
    return sentToday === 'true';
  }

  /**
   * Mark reminder as sent for today
   */
  private static markReminderAsSent(): void {
    const today = new Date().toISOString().split('T')[0];
    const key = `lirf_reminder_sent_${today}`;
    localStorage.setItem(key, 'true');
  }

  /**
   * Clean up old reminder tracking data (older than 7 days)
   */
  private static cleanupOldReminderData(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get all keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lirf_reminder_sent_')) {
        const dateStr = key.replace('lirf_reminder_sent_', '');
        const date = new Date(dateStr);
        
        if (date < sevenDaysAgo) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Execute the weekly reminder check
   */
  private static async executeReminderCheck(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ LIRF reminder already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      
      // Check if today is Friday
      if (!this.isFriday()) {
        console.log('📅 Not Friday, skipping LIRF reminder');
        return;
      }

      // Check if reminder already sent today
      const alreadySent = await this.hasReminderBeenSentToday();
      if (alreadySent) {
        console.log('✅ LIRF reminder already sent today, skipping');
        return;
      }

      console.log('🚀 Triggering weekly LIRF reminder...');
      
      // Send the reminder
      const result = await LirfReminderService.sendWeeklyLirfReminder();
      
      if (result.success) {
        console.log(`✅ LIRF reminder sent successfully to ${result.recipientCount} recipients`);
        console.log(`📊 ${result.runsRequiringLirf} runs requiring LIRF assignment`);
        
        // Mark as sent for today
        this.markReminderAsSent();
      } else {
        console.error('❌ LIRF reminder completed with errors:', result.errors);
      }

      // Cleanup old tracking data
      this.cleanupOldReminderData();

    } catch (error) {
      console.error('❌ LIRF reminder scheduler error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduler
   * Checks every hour to see if it's time to send the reminder
   */
  static start(): void {
    console.log('🔄 Starting LIRF reminder scheduler...');
    
    // Execute immediately on start (if conditions are met)
    this.executeReminderCheck();

    // Then check every hour
    this.intervalId = setInterval(() => {
      this.executeReminderCheck();
    }, 60 * 60 * 1000); // Check every hour
    
    console.log('✅ LIRF reminder scheduler started (checking hourly)');
  }

  /**
   * Stop the scheduler
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 LIRF reminder scheduler stopped');
    }
  }

  /**
   * Force trigger the reminder (for testing/manual execution)
   */
  static async forceTrigger(): Promise<void> {
    console.log('🔧 Force triggering LIRF reminder...');
    
    try {
      const result = await LirfReminderService.sendWeeklyLirfReminder();
      
      console.log('✅ Force trigger complete:', {
        success: result.success,
        recipientCount: result.recipientCount,
        runsRequiringLirf: result.runsRequiringLirf,
        errors: result.errors
      });

      // Mark as sent to prevent duplicate sends today
      this.markReminderAsSent();

    } catch (error) {
      console.error('❌ Force trigger failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  static getStatus(): {
    isRunning: boolean;
    isActive: boolean;
    nextCheckTime: string;
    hasSentToday: boolean;
  } {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    return {
      isRunning: this.isRunning,
      isActive: this.intervalId !== null,
      nextCheckTime: nextHour.toISOString(),
      hasSentToday: localStorage.getItem(`lirf_reminder_sent_${now.toISOString().split('T')[0]}`) === 'true'
    };
  }
}