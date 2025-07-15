import { supabase } from '../../../services/supabase';

export interface ScheduledRun {
  id: string;
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  max_participants: number;
  run_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
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
  bookings_count?: number;
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
   * Check if a LIRF is already booked as a participant for a specific run
   */
  static async isLirfAlreadyBooked(lirfId: string, runId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('member_id', lirfId)
        .eq('run_id', runId)
        .is('cancelled_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('ScheduledRunsService.isLirfAlreadyBooked error:', error);
      throw error;
    }
  }

  /**
   * Validate LIRF assignments before creating/updating a run
   */
  static async validateLirfAssignments(runId: string, lirfAssignments: {
    assigned_lirf_1?: string;
    assigned_lirf_2?: string;
    assigned_lirf_3?: string;
  }): Promise<void> {
    const lirfIds = [
      lirfAssignments.assigned_lirf_1,
      lirfAssignments.assigned_lirf_2,
      lirfAssignments.assigned_lirf_3
    ].filter(Boolean); // Remove null/undefined values

    for (const lirfId of lirfIds) {
      if (lirfId) {
        const isAlreadyBooked = await this.isLirfAlreadyBooked(lirfId, runId);
        if (isAlreadyBooked) {
          // Get LIRF name for better error message
          const { data: lirfData } = await supabase
            .from('members')
            .select('full_name')
            .eq('id', lirfId)
            .single();

          const lirfName = lirfData?.full_name || 'LIRF';
          throw new Error(` ${lirfName}, you cannot assign yourself as LIRF - you are already booked as a participant for this run. Please cancel your booking first.`);
        }
      }
    }
  }

  /**
   * Create a new scheduled run
   */
  static async createScheduledRun(runData: CreateScheduledRunData): Promise<ScheduledRun> {
    try {
      // First create the run to get the ID
      const { data: newRun, error: createError } = await supabase
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
          assigned_lirf_1: null, // Set to null initially
          assigned_lirf_2: null,
          assigned_lirf_3: null,
          created_by: runData.created_by
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create scheduled run:', createError);
        throw new Error(createError.message);
      }

      // Now validate and assign LIRFs if any were provided
      if (runData.assigned_lirf_1 || runData.assigned_lirf_2 || runData.assigned_lirf_3) {
        await this.validateLirfAssignments(newRun.id, {
          assigned_lirf_1: runData.assigned_lirf_1,
          assigned_lirf_2: runData.assigned_lirf_2,
          assigned_lirf_3: runData.assigned_lirf_3
        });

        // Update the run with LIRF assignments
        const { data: updatedRun, error: updateError } = await supabase
          .from('scheduled_runs')
          .update({
            assigned_lirf_1: runData.assigned_lirf_1 || null,
            assigned_lirf_2: runData.assigned_lirf_2 || null,
            assigned_lirf_3: runData.assigned_lirf_3 || null
          })
          .eq('id', newRun.id)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update run with LIRF assignments:', updateError);
          throw new Error(updateError.message);
        }

        return updatedRun;
      }

      return newRun;
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
      // If updating LIRF assignments, validate them first
      if (updates.assigned_lirf_1 !== undefined || 
          updates.assigned_lirf_2 !== undefined || 
          updates.assigned_lirf_3 !== undefined) {
        
        await this.validateLirfAssignments(runId, {
          assigned_lirf_1: updates.assigned_lirf_1,
          assigned_lirf_2: updates.assigned_lirf_2,
          assigned_lirf_3: updates.assigned_lirf_3
        });
      }

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

  /**
   * Update run status
   */
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