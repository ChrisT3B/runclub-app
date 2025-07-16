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

// Custom error types for different modal handling
export class BookingError extends Error {
  constructor(
    message: string, 
    public type: 'LIRF_CONFLICT' | 'ALREADY_BOOKED' | 'RUN_FULL' | 'GENERAL' | 'AUTH_ERROR' = 'GENERAL',
    public title?: string
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

export class BookingService {
  /**
   * Check if user is authenticated and get current user
   */
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error('Failed to get current user');
    return user;
  }

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
      // Check authentication first
      const user = await this.getCurrentUser();
      if (!user) {
        throw new BookingError(
          'You must be logged in to book a run. Please sign in and try again.',
          'AUTH_ERROR',
          'Authentication Required'
        );
      }

      // Check if user already has an active booking for this run
      const { data: existingBooking, error: checkError } = await supabase
        .from('run_bookings')
        .select('*')
        .eq('run_id', bookingData.run_id)
        .eq('member_id', bookingData.member_id)
        .is('cancelled_at', null)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Handle RLS permission errors
        if (checkError.code === 'PGRST301') {
          throw new BookingError(
            'You do not have permission to access booking information.',
            'AUTH_ERROR',
            'Permission Denied'
          );
        }
        throw checkError;
      }

      if (existingBooking) {
        throw new BookingError(
          'You have already booked this run. Check your dashboard to manage your existing bookings.',
          'ALREADY_BOOKED',
          'Already Booked'
        );
      }

      // Check if member is a LIRF assigned to this run
      const isAssignedLirf = await this.isMemberAssignedAsLirf(bookingData.member_id, bookingData.run_id);
      if (isAssignedLirf) {
        throw new BookingError(
          'As a LIRF assigned to lead this run, you cannot book yourself as a participant. If you need to step down from leading this run, please contact an admin.',
          'LIRF_CONFLICT',
          'LIRF Assignment Conflict'
        );
      }

      // Check if run is at capacity
      const { data: currentBookings, error: countError } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('run_id', bookingData.run_id)
        .is('cancelled_at', null);

      if (countError) {
        if (countError.code === 'PGRST301') {
          throw new BookingError(
            'You do not have permission to access booking information.',
            'AUTH_ERROR',
            'Permission Denied'
          );
        }
        throw countError;
      }

      const { data: runData, error: runError } = await supabase
        .from('scheduled_runs')
        .select('max_participants, run_title')
        .eq('id', bookingData.run_id)
        .single();

      if (runError) {
        if (runError.code === 'PGRST301') {
          throw new BookingError(
            'You do not have permission to access run information.',
            'AUTH_ERROR',
            'Permission Denied'
          );
        }
        throw runError;
      }

      if (currentBookings.length >= runData.max_participants) {
        throw new BookingError(
          `"${runData.run_title}" is already full with ${runData.max_participants} participants. Please try another run or contact the organizers if you think there's been an error.`,
          'RUN_FULL',
          'Run Full'
        );
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
        
        if (error.code === 'PGRST301') {
          throw new BookingError(
            'You do not have permission to create bookings. Please contact an admin.',
            'AUTH_ERROR',
            'Permission Denied'
          );
        }
        
        throw new BookingError(
          'Failed to create your booking. Please try again or contact support if the problem persists.',
          'GENERAL',
          'Booking Failed'
        );
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
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to view bookings');
      }

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
        
        if (error.code === 'PGRST301') {
          throw new Error('You do not have permission to access these bookings');
        }
        
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
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to view run bookings');
      }

      const { data, error } = await supabase
        .from('run_bookings')
        .select('*')
        .eq('run_id', runId)
        .order('booked_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch run bookings:', error);
        
        if (error.code === 'PGRST301') {
          throw new Error('You do not have permission to access these bookings');
        }
        
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
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to cancel bookings');
      }

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
        
        if (error.code === 'PGRST301') {
          throw new Error('You do not have permission to cancel this booking');
        }
        
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
        
        if (error.code === 'PGRST301') {
          // If no permission to see bookings, return 0
          return 0;
        }
        
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
      const user = await this.getCurrentUser();
      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('member_id', memberId)
        .eq('run_id', runId)
        .is('cancelled_at', null);

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return false;
        }
        if (error.code === 'PGRST301') {
          // No permission to see bookings
          return false;
        }
        throw error;
      }

      // Check if we have any active bookings
      return !!(data && data.length > 0);
    } catch (error) {
      console.error('BookingService.hasMemberBookedRun error:', error);
      return false; // Return false on error rather than throwing
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
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to mark attendance');
      }

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
        
        if (error.code === 'PGRST301') {
          throw new Error('You do not have permission to mark attendance');
        }
        
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('BookingService.markAttendance error:', error);
      throw error;
    }
  }
}