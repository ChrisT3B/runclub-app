import { supabase } from '../../../services/supabase';
import { BookingError } from './bookingService';

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

export interface RunWithDetails extends ScheduledRun {
  booking_count: number;
  is_booked: boolean;
  user_booking_id?: string;
  is_full: boolean;
  lirf_vacancies: number;
  user_is_assigned_lirf: boolean;
  assigned_lirfs: Array<{
    id: string;
    name: string;
    position: number;
  }>;
  active_bookings: Array<{
    id: string;
    member_id: string;
    booked_at: string;
    member_name?: string;
  }>;
}

export class ScheduledRunsService {
  // Cache for LIRF details to avoid repeated queries
  private static lirfCache: Map<string, { id: string; full_name: string }> = new Map();
  private static lirfCacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all LIRFs with caching
   */
  static async getAvailableLirfs(): Promise<Array<{id: string, full_name: string}>> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (now < this.lirfCacheExpiry && this.lirfCache.size > 0) {
      return Array.from(this.lirfCache.values());
    }

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

      // Update cache
      this.lirfCache.clear();
      (data || []).forEach(lirf => {
        this.lirfCache.set(lirf.id, lirf);
      });
      this.lirfCacheExpiry = now + this.CACHE_DURATION;

      return data || [];
    } catch (error) {
      console.error('ScheduledRunsService.getAvailableLirfs error:', error);
      throw error;
    }
  }

  /**
   * ULTRA-OPTIMIZED: Get all scheduled runs with minimal queries
   */
  static async getScheduledRunsWithDetails(userId?: string): Promise<RunWithDetails[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Get runs with a more specific query
      const { data: runs, error: runsError } = await supabase
        .from('scheduled_runs')
        .select('*')
        .gte('run_date', today)
        .eq('run_status', 'scheduled')
        .order('run_date', { ascending: true })
        .order('run_time', { ascending: true })
        .limit(50); // Limit to prevent massive queries

      if (runsError) {
        console.error('Failed to fetch scheduled runs:', runsError);
        throw new Error(runsError.message);
      }

      if (!runs || runs.length === 0) {
        return [];
      }

      const runIds = runs.map(run => run.id);

      // 2. Get only active bookings with better query
      const { data: allBookings, error: bookingsError } = await supabase
        .from('run_bookings')
        .select('id, run_id, member_id, booked_at')
        .in('run_id', runIds)
        .is('cancelled_at', null);

      if (bookingsError) {
        console.error('Failed to fetch bookings:', bookingsError);
        throw new Error(bookingsError.message);
      }

      // 3. Get user's specific bookings if needed
      let userBookingsMap: Record<string, string> = {};
      if (userId && runIds.length > 0) {
        const { data: userBookings, error: userError } = await supabase
          .from('run_bookings')
          .select('id, run_id')
          .eq('member_id', userId)
          .in('run_id', runIds)
          .is('cancelled_at', null);

        if (!userError && userBookings) {
          userBookingsMap = Object.fromEntries(
            userBookings.map(booking => [booking.run_id, booking.id])
          );
        }
      }

      // 4. Get LIRF data (with better caching)
      const lirfs = await this.getAvailableLirfs();
      const lirfMap = new Map(lirfs.map(lirf => [lirf.id, lirf]));

      // 5. Process everything in memory - much faster
      const runsWithDetails: RunWithDetails[] = runs.map(run => {
        const runBookings = (allBookings || []).filter(booking => booking.run_id === run.id);
        const bookingCount = runBookings.length;
        
        // User booking info
        const userBookingId = userBookingsMap[run.id];
        const isBooked = !!userBookingId;

        // LIRF assignments
        const assignedLirfs: Array<{id: string, name: string, position: number}> = [];
        let userIsAssignedLirf = false;

        [
          { id: run.assigned_lirf_1, pos: 1 },
          { id: run.assigned_lirf_2, pos: 2 },
          { id: run.assigned_lirf_3, pos: 3 }
        ].forEach(({ id, pos }) => {
          if (id) {
            const lirf = lirfMap.get(id);
            if (lirf) {
              assignedLirfs.push({ id: lirf.id, name: lirf.full_name, position: pos });
            }
            if (id === userId) userIsAssignedLirf = true;
          }
        });

        return {
          ...run,
          booking_count: bookingCount,
          is_booked: isBooked,
          user_booking_id: userBookingId,
          is_full: bookingCount >= run.max_participants,
          lirf_vacancies: run.lirfs_required - assignedLirfs.length,
          user_is_assigned_lirf: userIsAssignedLirf,
          assigned_lirfs: assignedLirfs,
          active_bookings: runBookings.map(booking => ({
            id: booking.id,
            member_id: booking.member_id,
            booked_at: booking.booked_at,
            member_name: 'Member' // Simplified - get names only when needed
          }))
        };
      });

      return runsWithDetails;

    } catch (error) {
      console.error('ScheduledRunsService.getScheduledRunsWithDetails error:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
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
          // Get LIRF name from cache first, then database
          let lirfName = 'LIRF';
          const cachedLirf = this.lirfCache.get(lirfId);
          
          if (cachedLirf) {
            lirfName = cachedLirf.full_name;
          } else {
            const { data: lirfData } = await supabase
              .from('members')
              .select('full_name')
              .eq('id', lirfId)
              .single();
            lirfName = lirfData?.full_name || 'LIRF';
          }

          throw new BookingError(
            `${lirfName}, you cannot assign yourself as LIRF - you are already booked as a participant for this run. Please cancel your booking first.`,
            'LIRF_CONFLICT',
            'LIRF Assignment Conflict'
          );
        }
      }
    }
  }

  /**
   * Create a new scheduled run
   */
  static async createScheduledRun(runData: CreateScheduledRunData): Promise<ScheduledRun> {
    try {
      // DEBUG: Log the exact data being sent to database
    console.log('🗄️ DATABASE INSERT - Input data:');
    console.log('  - run_date (raw):', runData.run_date);
    console.log('  - run_date (type):', typeof runData.run_date);
    console.log('  - is_recurring:', runData.is_recurring);
    console.log('  - Full runData:', JSON.stringify(runData, null, 2));
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

  /**
   * Clear LIRF cache (useful for testing or when data changes)
   */
  static clearCache(): void {
    this.lirfCache.clear();
    this.lirfCacheExpiry = 0;
  }
}