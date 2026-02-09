import { supabase } from '../../../services/supabase';
import { validateCsrfToken, getCsrfToken } from '../../../utils/csrfProtection';

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
  // Cache for run data to avoid repeated queries
  private static runDataCache: Map<string, any> = new Map();
  private static runDataCacheExpiry: number = 0;
  private static readonly RUN_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  /**
   * Get run data with caching
   */
  static async getRunData(runId: string) {
    const cacheKey = `run_${runId}`;
    const now = Date.now();
    
    if (now < this.runDataCacheExpiry && this.runDataCache.has(cacheKey)) {
      return this.runDataCache.get(cacheKey);
    }

    const { data, error } = await supabase
      .from('scheduled_runs')
      .select('max_participants, run_title, assigned_lirf_1, assigned_lirf_2, assigned_lirf_3')
      .eq('id', runId)
      .single();

    if (error) throw error;

    this.runDataCache.set(cacheKey, data);
    this.runDataCacheExpiry = now + this.RUN_CACHE_DURATION;
    
    return data;
  }

  /**
   * OPTIMIZED: Check if user is authenticated (simplified)
   */
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error('Authentication failed');
    return user;
  }

  /**
   * OPTIMIZED: Create booking with minimal queries
   */
  static async createBooking(bookingData: CreateBookingData): Promise<RunBooking> {
    try {
      // 1. Auth check
      const user = await this.getCurrentUser();
      if (!user) {
        throw new BookingError(
          'You must be logged in to book a run.',
          'AUTH_ERROR',
          'Authentication Required'
        );
      }

      // ========== CSRF VALIDATION ==========
      console.log('🔒 Validating CSRF token for run booking...');
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        console.error('❌ CSRF validation failed: No token found');
        throw new Error('CSRF_TOKEN_MISSING');
      }
      const csrfValidation = await validateCsrfToken(csrfToken, bookingData.member_id);
      if (!csrfValidation.isValid) {
        console.error('❌ CSRF validation failed:', csrfValidation.error);
        throw new Error('CSRF_VALIDATION_FAILED');
      }
      console.log('✅ CSRF token validated - proceeding with booking');
      // ========== END: CSRF VALIDATION ==========

      // 2. Get run data (cached)
      const runData = await this.getRunData(bookingData.run_id);

      // 3. Check existing bookings and LIRF assignments in one query
      const { data: existingData, error: checkError } = await supabase
        .from('run_bookings')
        .select('id, member_id')
        .eq('run_id', bookingData.run_id)
        .is('cancelled_at', null);

      if (checkError) {
        throw new BookingError(
          'Failed to check existing bookings',
          'GENERAL',
          'Booking Check Failed'
        );
      }

      const existingBookings = existingData || [];
      
      // Check if user already booked
      const userAlreadyBooked = existingBookings.some(
        booking => booking.member_id === bookingData.member_id
      );

      if (userAlreadyBooked) {
        throw new BookingError(
          'You have already booked this run.',
          'ALREADY_BOOKED',
          'Already Booked'
        );
      }

      // Check if user is assigned as LIRF
      const userIsLirf = [
        runData.assigned_lirf_1,
        runData.assigned_lirf_2,
        runData.assigned_lirf_3
      ].includes(bookingData.member_id);

      if (userIsLirf) {
        throw new BookingError(
          'As a LIRF assigned to lead this run, you cannot book yourself as a participant.',
          'LIRF_CONFLICT',
          'LIRF Assignment Conflict'
        );
      }

      // Check capacity
      if (existingBookings.length >= runData.max_participants) {
        throw new BookingError(
          `"${runData.run_title}" is already full with ${runData.max_participants} participants.`,
          'RUN_FULL',
          'Run Full'
        );
      }

      // 4. Create booking
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
        throw new BookingError(
          'Failed to create booking',
          'GENERAL',
          'Booking Failed'
        );
      }

      // Clear cache after successful booking
      this.runDataCache.delete(`run_${bookingData.run_id}`);

      return data;
    } catch (error) {
      console.error('BookingService.createBooking error:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Get member bookings with single query
   */
  static async getMemberBookings(memberId: string): Promise<BookingWithRunDetails[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('run_bookings')
        .select(`
          id,
          run_id,
          member_id,
          booked_at,
          cancelled_at,
          cancellation_reason,
          attended,
          attendance_marked_by,
          attendance_marked_at,
          scheduled_runs!inner(
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
        throw new Error(error.message);
      }

      return (data || []).map(booking => ({
        id: booking.id,
        run_id: booking.run_id,
        member_id: booking.member_id,
        booked_at: booking.booked_at,
        cancelled_at: booking.cancelled_at,
        cancellation_reason: booking.cancellation_reason,
        attended: booking.attended,
        attendance_marked_by: booking.attendance_marked_by,
        attendance_marked_at: booking.attendance_marked_at,
        run_title: (booking.scheduled_runs as any)?.run_title || '',
        run_date: (booking.scheduled_runs as any)?.run_date || '',
        run_time: (booking.scheduled_runs as any)?.run_time || '',
        meeting_point: (booking.scheduled_runs as any)?.meeting_point || '',
        approximate_distance: (booking.scheduled_runs as any)?.approximate_distance,
        max_participants: (booking.scheduled_runs as any)?.max_participants || 0
      }));
    } catch (error) {
      console.error('BookingService.getMemberBookings error:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Get run bookings (simplified)
   */
  static async getRunBookings(runId: string): Promise<RunBooking[]> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('*')
        .eq('run_id', runId)
        .order('booked_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('BookingService.getRunBookings error:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Cancel booking (simplified)
   */
  static async cancelBooking(bookingId: string, cancellationReason?: string): Promise<RunBooking> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('Authentication required');
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
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('BookingService.cancelBooking error:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Get booking count with caching
   */
  static async getRunBookingCount(runId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('id', { count: 'exact' })
        .eq('run_id', runId)
        .is('cancelled_at', null);

      if (error) {
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('BookingService.getRunBookingCount error:', error);
      return 0;
    }
  }

  /**
   * OPTIMIZED: Check if member booked run (with caching)
   */
  static async hasMemberBookedRun(memberId: string, runId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('run_bookings')
        .select('id')
        .eq('member_id', memberId)
        .eq('run_id', runId)
        .is('cancelled_at', null)
        .limit(1);

      if (error) {
        return false;
      }

      return !!(data && data.length > 0);
    } catch (error) {
      console.error('BookingService.hasMemberBookedRun error:', error);
      return false;
    }
  }

  /**
   * Mark attendance (simplified)
   */
  static async markAttendance(
    bookingId: string, 
    attended: boolean, 
    markedByUserId: string
  ): Promise<RunBooking> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('Authentication required');
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
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('BookingService.markAttendance error:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.runDataCache.clear();
    this.runDataCacheExpiry = 0;
  }
}