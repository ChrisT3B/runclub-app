import { supabase } from '../../../services/supabase';

export interface RunBooking {
  id: string;
  run_id: string;
  member_id: string;
  booked_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  attended?: boolean;
  attendance_marked_by?: string;
  attendance_marked_at?: string;
}

export interface CreateBookingData {
  run_id: string;
  member_id: string;
}

export interface BookingWithRunDetails extends RunBooking {
  run_title: string;
  run_date: string;
  run_time: string;
  meeting_point: string;
  approximate_distance?: string;
  max_participants: number;
}

export class BookingService {
  /**
   * Check if a member is assigned as LIRF to a specific run
   */
  static async isMemberAssignedAsLirf(memberId: string, runId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('scheduled_runs')
        .select('assigned_lirf_1, assigned_lirf_2, assigned_lirf_3')
        .eq('id', runId)
        .single();

      if (error) {
        console.error('Failed to check LIRF assignment:', error);
        throw new Error(error.message);
      }

      return data.assigned_lirf_1 === memberId || 
             data.assigned_lirf_2 === memberId || 
             data.assigned_lirf_3 === memberId;
    } catch (error) {
      console.error('BookingService.isMemberAssignedAsLirf error:', error);
      throw error;
    }
  }

  /**
   * Check if a member is a LIRF (has lirf or admin access level)
   */
  static async isMemberLirf(memberId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('access_level')
        .eq('id', memberId)
        .single();

      if (error) {
        console.error('Failed to check member access level:', error);
        throw new Error(error.message);
      }

      return data.access_level === 'lirf' || data.access_level === 'admin';
    } catch (error) {
      console.error('BookingService.isMemberLirf error:', error);
      throw error;
    }
  }

  /**
   * Create a new booking for a run
   */
  static async createBooking(bookingData: CreateBookingData): Promise<RunBooking> {
    try {
      // Check if user already has an active booking for this run
      const { data: existingBooking, error: checkError } = await supabase
        .from('run_bookings')
        .select('*')
        .eq('run_id', bookingData.run_id)
        .eq('member_id', bookingData.member_id)
        .is('cancelled_at', null)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBooking) {
        throw new Error('You have already booked this run');
      }

      // NEW: Check if member is a LIRF assigned to this run
      const isAssignedLirf = await this.isMemberAssignedAsLirf(bookingData.member_id, bookingData.run_id);
      if (isAssignedLirf) {
        throw new Error('LIRFs cannot book runs they are assigned to lead. Please contact an admin if you need to step down from leading this run.');
      }

      // Check if run is at capacity
      const { data: currentBookings, error: countError } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('run_id', bookingData.run_id)
        .is('cancelled_at', null);

      if (countError) throw countError;

      const { data: runData, error: runError } = await supabase
        .from('scheduled_runs')
        .select('max_participants')
        .eq('id', bookingData.run_id)
        .single();

      if (runError) throw runError;

      if (currentBookings.length >= runData.max_participants) {
        throw new Error('This run is full. Please try another run or contact the organizers.');
      }

      // Create the booking
      const { data, error } = await supabase
        .from('run_bookings')
        .insert({
          run_id: bookingData.run_id,
          member_id: bookingData.member_id,
          booked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create booking:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('BookingService.createBooking error:', error);
      throw error;
    }
  }

  /**
   * Get all bookings for a specific member
   */
  static async getMemberBookings(memberId: string): Promise<BookingWithRunDetails[]> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select(`
          *,
          scheduled_runs (
            run_title,
            run_date,
            run_time,
            meeting_point,
            approximate_distance,
            max_participants
          )
        `)
        .eq('member_id', memberId)
        .order('booked_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch member bookings:', error);
        throw new Error(error.message);
      }

      // Transform the data to match our interface
      return (data || []).map(booking => ({
        ...booking,
        run_title: booking.scheduled_runs?.run_title || '',
        run_date: booking.scheduled_runs?.run_date || '',
        run_time: booking.scheduled_runs?.run_time || '',
        meeting_point: booking.scheduled_runs?.meeting_point || '',
        approximate_distance: booking.scheduled_runs?.approximate_distance,
        max_participants: booking.scheduled_runs?.max_participants || 0
      }));
    } catch (error) {
      console.error('BookingService.getMemberBookings error:', error);
      throw error;
    }
  }

  /**
   * Get all bookings for a specific run
   */
  static async getRunBookings(runId: string): Promise<RunBooking[]> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('*')
        .eq('run_id', runId)
        .order('booked_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch run bookings:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('BookingService.getRunBookings error:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, cancellationReason?: string): Promise<RunBooking> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .update({
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellationReason || null
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('Failed to cancel booking:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('BookingService.cancelBooking error:', error);
      throw error;
    }
  }

  /**
   * Get booking count for a specific run (excluding cancelled bookings)
   */
  static async getRunBookingCount(runId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('run_id', runId)
        .is('cancelled_at', null);

      if (error) {
        console.error('Failed to get booking count:', error);
        throw new Error(error.message);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('BookingService.getRunBookingCount error:', error);
      throw error;
    }
  }

  /**
   * Check if a member has booked a specific run
   */
  static async hasMemberBookedRun(memberId: string, runId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('member_id', memberId)
        .eq('run_id', runId)
        .is('cancelled_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('BookingService.hasMemberBookedRun error:', error);
      throw error;
    }
  }

  /**
   * Mark attendance for a booking
   */
  static async markAttendance(
    bookingId: string, 
    attended: boolean, 
    markedByUserId: string
  ): Promise<RunBooking> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .update({
          attended,
          attendance_marked_by: markedByUserId,
          attendance_marked_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('Failed to mark attendance:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('BookingService.markAttendance error:', error);
      throw error;
    }
  }
}