import { supabase } from '../../../services/supabase';

export interface ScheduledRun {
  id: string;
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  max_participants: number;
    run_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';  // ← Add this
  started_at?: string;        // ← Add this
  completed_at?: string;      // ← Add this
  description?: string;
  is_recurring: boolean;
  weekly_recurrences: number;
  end_date?: string;
  lirfs_required: number;
  assigned_lirf_1?: string;
  assigned_lirf_2?: string;
  assigned_lirf_3?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  bookings_count?: number;  // ← Add this
}

export interface CreateScheduledRunData {
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  max_participants: number;
  description?: string;
  is_recurring: boolean;
  weekly_recurrences: number;
  end_date?: string;
  lirfs_required: number;
  assigned_lirf_1?: string;
  assigned_lirf_2?: string;
  assigned_lirf_3?: string;
  created_by: string;
}

export class ScheduledRunsService {
  /**
   * Create a new scheduled run
   */
  static async createScheduledRun(runData: CreateScheduledRunData): Promise<ScheduledRun> {
    try {
      const { data, error } = await supabase
        .from('scheduled_runs')
        .insert({
          run_title: runData.run_title,
          run_date: runData.run_date,
          run_time: runData.run_time,
          meeting_point: runData.meeting_point,
          approximate_distance: runData.approximate_distance || null,
          max_participants: runData.max_participants,
          description: runData.description || null,
          is_recurring: runData.is_recurring,
          weekly_recurrences: runData.weekly_recurrences,
          end_date: runData.end_date || null,
          lirfs_required: runData.lirfs_required,
          assigned_lirf_1: runData.assigned_lirf_1 || null,
          assigned_lirf_2: runData.assigned_lirf_2 || null,
          assigned_lirf_3: runData.assigned_lirf_3 || null,
          created_by: runData.created_by
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create scheduled run:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('ScheduledRunsService.createScheduledRun error:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled runs (future and current)
   */
  static async getScheduledRuns(): Promise<ScheduledRun[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('scheduled_runs')
        .select('*')
        .gte('run_date', today)
        .order('run_date', { ascending: true })
        .order('run_time', { ascending: true });

      if (error) {
        console.error('Failed to fetch scheduled runs:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('ScheduledRunsService.getScheduledRuns error:', error);
      throw error;
    }
  }

  /**
   * Get scheduled runs created by a specific user
   */
  static async getRunsByCreator(creatorId: string): Promise<ScheduledRun[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_runs')
        .select('*')
        .eq('created_by', creatorId)
        .order('run_date', { ascending: true });

      if (error) {
        console.error('Failed to fetch runs by creator:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('ScheduledRunsService.getRunsByCreator error:', error);
      throw error;
    }
  }
/**
 * Get a single scheduled run by ID
 */
static async getScheduledRun(runId: string): Promise<ScheduledRun> {
  try {
    const { data, error } = await supabase
      .from('scheduled_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      console.error('Failed to fetch scheduled run:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('ScheduledRunsService.getScheduledRun error:', error);
    throw error;
  }
}
  /**
   * Get available LIRFs (users with lirf or admin access level)
   */
  static async getAvailableLirfs(): Promise<Array<{id: string, full_name: string}>> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name')
        .in('access_level', ['lirf', 'admin'])
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Failed to fetch LIRFs:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('ScheduledRunsService.getAvailableLirfs error:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled run
   */
  static async updateScheduledRun(runId: string, updates: Partial<CreateScheduledRunData>): Promise<ScheduledRun> {
    try {
      const { data, error } = await supabase
        .from('scheduled_runs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', runId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update scheduled run:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('ScheduledRunsService.updateScheduledRun error:', error);
      throw error;
    }
  }

  /**
   * Delete a scheduled run
   */
  static async deleteScheduledRun(runId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_runs')
        .delete()
        .eq('id', runId);

      if (error) {
        console.error('Failed to delete scheduled run:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('ScheduledRunsService.deleteScheduledRun error:', error);
      throw error;
    }
  }
  // Add to ScheduledRunsService
static async updateRunStatus(runId: string, status: 'in_progress' | 'completed'): Promise<void> {
  const updateData: any = { run_status: status };
  
  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('scheduled_runs')
    .update(updateData)
    .eq('id', runId);

  if (error) throw new Error(error.message);
}
}