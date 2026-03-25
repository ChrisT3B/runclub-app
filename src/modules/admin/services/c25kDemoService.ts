import { supabase } from '../../../services/supabase';
import { ScheduledRunsService } from './scheduledRunsService';

export interface C25kDemoResult {
  success: boolean;
  message: string;
  demoRunIds?: string[];
  error?: string;
}

export class C25kDemoService {

  /**
   * Create C25k demo runs for demonstration purposes.
   * Creates 3 C25k runs (past, today, future) and 2 regular runs for comparison.
   * No demo member is created - use member edit to toggle C25k status on real members.
   */
  static async createDemoData(adminId: string, adminName: string): Promise<C25kDemoResult> {
    try {
      // Guard: don't create if demo data already exists
      const hasDemo = await this.hasDemoData();
      if (hasDemo) {
        return {
          success: false,
          message: 'Demo data already exists. Clean up existing demo data first.',
          error: 'Demo data already present'
        };
      }

      const demoRuns = await this.createDemoRuns(adminId, adminName);

      const c25kCount = demoRuns.filter(r => r.is_c25k).length;
      const regularCount = demoRuns.filter(r => !r.is_c25k).length;

      return {
        success: true,
        message: `Demo environment created!\n\n` +
          `Created:\n` +
          `- ${c25kCount} C25k runs (with buddy system)\n` +
          `- ${regularCount} regular runs for comparison\n\n` +
          `To demonstrate:\n` +
          `1. Toggle a member's C25k status in member edit\n` +
          `2. Show booking options (C25k participant vs Buddy)\n` +
          `3. Show buddy slot limits (max 3 per run)`,
        demoRunIds: demoRuns.map(r => r.id)
      };

    } catch (error: any) {
      console.error('Failed to create C25k demo data:', error);
      return {
        success: false,
        message: 'Failed to create demo environment',
        error: error.message
      };
    }
  }

  private static async createDemoRuns(adminId: string, adminName: string): Promise<Array<{ id: string; title: string; is_c25k: boolean }>> {
    const createdRuns: Array<{ id: string; title: string; is_c25k: boolean }> = [];
    const today = new Date();

    const formatDate = (date: Date): string => date.toISOString().split('T')[0];

    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const runTemplates = [
      {
        run_title: '[DEMO] C25k Week 1 - Getting Started',
        run_date: formatDate(addDays(today, -7)),
        run_time: '18:00',
        meeting_point: 'High Street Car Park',
        approximate_distance: '2-3km',
        description: 'Gentle introduction to running. Walk/run intervals. C25k participants unlimited, 3 buddy slots available.',
        max_participants: 15,
        is_c25k_run: true,
        lirfs_required: 1
      },
      {
        run_title: '[DEMO] C25k Week 2 - Building Confidence',
        run_date: formatDate(today),
        run_time: '18:30',
        meeting_point: 'Jubilee Fields',
        approximate_distance: '3km',
        description: 'Progressing with longer running intervals. Max 15 C25k participants + 3 buddies.',
        max_participants: 15,
        is_c25k_run: true,
        lirfs_required: 1
      },
      {
        run_title: '[DEMO] C25k Week 3 - Steady Progress',
        run_date: formatDate(addDays(today, 7)),
        run_time: '18:00',
        meeting_point: 'Recreation Ground',
        approximate_distance: '3-4km',
        description: 'Continuing to build endurance. Buddy system: 3 support buddies welcome.',
        max_participants: 15,
        is_c25k_run: true,
        lirfs_required: 2
      },
      {
        run_title: '[DEMO] Regular Social Run',
        run_date: formatDate(addDays(today, 3)),
        run_time: '19:00',
        meeting_point: 'High Street Car Park',
        approximate_distance: '5-8km',
        description: 'Regular club social run. Not a C25k run - standard booking (no buddy system).',
        max_participants: 30,
        is_c25k_run: false,
        lirfs_required: 2
      },
      {
        run_title: '[DEMO] Regular Trail Run',
        run_date: formatDate(addDays(today, 10)),
        run_time: '09:00',
        meeting_point: 'Forest Car Park',
        approximate_distance: '8-12km',
        description: 'Weekend trail run. Standard booking.',
        max_participants: 25,
        is_c25k_run: false,
        lirfs_required: 2
      }
    ];

    for (const template of runTemplates) {
      try {
        const createdRun = await ScheduledRunsService.createScheduledRun({
          ...template,
          is_recurring: false,
          weekly_recurrences: 0,
          created_by: adminId,
          created_by_name: adminName
        });

        createdRuns.push({
          id: createdRun.id,
          title: createdRun.run_title,
          is_c25k: template.is_c25k_run
        });
      } catch (error) {
        console.error(`Failed to create demo run: ${template.run_title}`, error);
      }
    }

    return createdRuns;
  }

  /**
   * Clean up all demo runs (those with [DEMO] prefix)
   */
  static async cleanupDemoData(): Promise<C25kDemoResult> {
    try {
      const { data: demoRuns, error: fetchError } = await supabase
        .from('scheduled_runs')
        .select('id')
        .like('run_title', '[DEMO]%');

      if (fetchError) throw fetchError;

      if (demoRuns && demoRuns.length > 0) {
        const runIds = demoRuns.map(r => r.id);

        // Delete associated bookings first
        await supabase
          .from('run_bookings')
          .delete()
          .in('run_id', runIds);

        // Delete the runs
        const { error: deleteRunsError } = await supabase
          .from('scheduled_runs')
          .delete()
          .in('id', runIds);

        if (deleteRunsError) throw deleteRunsError;
      }

      return {
        success: true,
        message: `Demo data cleaned up!\n\nRemoved ${demoRuns?.length || 0} demo runs and associated bookings.`
      };

    } catch (error: any) {
      console.error('Failed to cleanup demo data:', error);
      return {
        success: false,
        message: 'Failed to cleanup demo data',
        error: error.message
      };
    }
  }

  /**
   * Check if demo data currently exists
   */
  static async hasDemoData(): Promise<boolean> {
    try {
      const { data: demoRuns } = await supabase
        .from('scheduled_runs')
        .select('id')
        .like('run_title', '[DEMO]%')
        .limit(1);

      return (demoRuns && demoRuns.length > 0) || false;
    } catch {
      return false;
    }
  }
}
