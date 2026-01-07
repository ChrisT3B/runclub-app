// src/modules/membership/services/affiliatedMemberService.ts
// EA Affiliated Member Application Service

import { supabase } from '../../../services/supabase';
import { SQLSecurityValidator, SecureQueryBuilder, SQLSecurityLogger } from '../../../utils/sqlSecurityValidator';
import { InputSanitizer } from '../../../utils/inputSanitizer';
import {
  AffiliatedMemberApplication,
  EAApplicationSettings,
  ApplicationFormData,
  PaymentConfirmationData,
  EAConfirmationData,
  ApplicationFilters,
  ApplicationStatus,
  EAExportRow,
} from '../../../types/affiliatedMember';

// Allowed enum values for validation
const ALLOWED_STATUSES: ApplicationStatus[] = ['submitted', 'payment_confirmed', 'ea_confirmed', 'cancelled'];
const ALLOWED_MEMBERSHIP_TYPES = ['first_claim', 'second_claim'];
const ALLOWED_TITLES = ['mr', 'mrs', 'ms', 'miss', 'dr', 'other'];
const ALLOWED_SEX_VALUES = ['male', 'female'];

export class AffiliatedMemberService {
  // ============================================
  // MEMBER FUNCTIONS
  // ============================================

  /**
   * Get current membership year from database function
   */
  static async getCurrentMembershipYear(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('get_current_membership_year');

      if (error) {
        console.error('Failed to get membership year:', error);
        // Fallback calculation if function fails
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return `${year}-${year + 1}`;
      }

      return data || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    } catch (error) {
      console.error('AffiliatedMemberService.getCurrentMembershipYear error:', error);
      // Fallback calculation
      const now = new Date();
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return `${year}-${year + 1}`;
    }
  }

  /**
   * Get application settings for a specific year
   */
  static async getApplicationSettings(year?: string): Promise<EAApplicationSettings | null> {
    try {
      const membershipYear = year || await this.getCurrentMembershipYear();

      const { data, error } = await supabase
        .from('ea_application_settings')
        .select('*')
        .eq('membership_year', membershipYear)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found for this year
          return null;
        }
        console.error('Failed to fetch application settings:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('AffiliatedMemberService.getApplicationSettings error:', error);
      throw error;
    }
  }

  /**
   * Check if member has existing application for year
   */
  static async getMemberApplication(
    memberId: string,
    year?: string
  ): Promise<AffiliatedMemberApplication | null> {
    try {
      const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);
      const membershipYear = year || await this.getCurrentMembershipYear();

      const { data, error } = await supabase
        .from('affiliated_member_applications')
        .select('*')
        .eq('member_id', cleanMemberId)
        .eq('membership_year', membershipYear)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch member application:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('AffiliatedMemberService.getMemberApplication error:', error);
      throw error;
    }
  }

  /**
   * Submit new EA affiliation application
   */
  static async submitApplication(
    memberId: string,
    applicationData: ApplicationFormData
  ): Promise<AffiliatedMemberApplication> {
    try {
      // Validate member ID
      const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);

      // Sanitize all input data
      const sanitizedData = InputSanitizer.sanitizeFormData(applicationData);

      // Validate membership type
      const membershipTypeValidation = SQLSecurityValidator.validateEnum(
        sanitizedData.membership_type,
        ALLOWED_MEMBERSHIP_TYPES,
        'membership type'
      );
      if (!membershipTypeValidation.isValid) {
        throw new Error(membershipTypeValidation.error);
      }

      // Validate title
      const titleValidation = SQLSecurityValidator.validateEnum(
        sanitizedData.title,
        ALLOWED_TITLES,
        'title'
      );
      if (!titleValidation.isValid) {
        throw new Error(titleValidation.error);
      }

      // Validate sex at birth
      const sexValidation = SQLSecurityValidator.validateEnum(
        sanitizedData.sex_at_birth,
        ALLOWED_SEX_VALUES,
        'sex at birth'
      );
      if (!sexValidation.isValid) {
        throw new Error(sexValidation.error);
      }

      // Validate date of birth
      const dobValidation = SQLSecurityValidator.validateDateForDB(sanitizedData.date_of_birth);
      if (!dobValidation.isValid) {
        throw new Error(dobValidation.error);
      }

      // Check age >= 16
      const dob = new Date(dobValidation.clean);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
        ? age - 1
        : age;

      if (actualAge < 16) {
        throw new Error('You must be at least 16 years old to apply for EA affiliation');
      }

      // SQL injection check for text fields
      const textFields = [
        sanitizedData.address_postcode,
        sanitizedData.nationality,
        sanitizedData.ea_urn_at_application,
        sanitizedData.previous_club_name,
        sanitizedData.health_conditions_details,
        sanitizedData.emergency_contact_name,
        sanitizedData.emergency_contact_relationship,
        sanitizedData.emergency_contact_number,
        sanitizedData.additional_info,
        sanitizedData.payment_reference,
        sanitizedData.payment_method,
      ].filter((field): field is string => typeof field === 'string' && field.length > 0);

      for (const field of textFields) {
        if (SQLSecurityValidator.containsSQLInjection(field)) {
          SQLSecurityLogger.logInjectionAttempt(field, cleanMemberId);
          throw new Error('Invalid input detected');
        }
      }

      // Get current membership year
      const membershipYear = await this.getCurrentMembershipYear();

      // Check if applications are open
      const settings = await this.getApplicationSettings(membershipYear);
      if (!settings?.applications_open) {
        throw new Error('Applications are currently closed');
      }

      // Check for existing application
      const existingApp = await this.getMemberApplication(cleanMemberId, membershipYear);
      if (existingApp) {
        throw new Error('You already have an active application for this membership year');
      }

      // Get member details to check if renewal
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('is_paid_member, ea_urn')
        .eq('id', cleanMemberId)
        .single();

      if (memberError) {
        throw new Error('Failed to verify member status');
      }

      const isRenewal = memberData?.is_paid_member === true;

      // Calculate fee based on membership type
      const membershipFee = sanitizedData.membership_type === 'first_claim'
        ? settings.first_claim_fee
        : settings.second_claim_fee;

      // Validate all declarations are true
      if (
        !sanitizedData.declaration_amateur ||
        !sanitizedData.declaration_own_risk ||
        !sanitizedData.declaration_data_privacy ||
        !sanitizedData.declaration_policies ||
        !sanitizedData.payment_sent_confirmed ||
        !sanitizedData.payment_reference_confirmed
      ) {
        throw new Error('All declarations must be accepted to submit the application');
      }

      // Build application record
      const applicationRecord = {
        member_id: cleanMemberId,
        title: titleValidation.clean,
        date_of_birth: dobValidation.clean,
        sex_at_birth: sexValidation.clean,
        address_postcode: sanitizedData.address_postcode,
        nationality: sanitizedData.nationality,
        membership_type: membershipTypeValidation.clean,
        membership_fee: membershipFee,
        membership_year: membershipYear,
        is_renewal: isRenewal,
        ea_urn_at_application: sanitizedData.ea_urn_at_application || null,
        previous_club_name: sanitizedData.previous_club_name || null,
        has_health_conditions: sanitizedData.has_health_conditions,
        health_conditions_details: sanitizedData.health_conditions_details || null,
        emergency_contact_name: sanitizedData.emergency_contact_name,
        emergency_contact_relationship: sanitizedData.emergency_contact_relationship,
        emergency_contact_number: sanitizedData.emergency_contact_number,
        additional_info: sanitizedData.additional_info || null,
        payment_reference: sanitizedData.payment_reference,
        payment_method: sanitizedData.payment_method || 'bank_transfer',
        declaration_amateur: true,
        declaration_own_risk: true,
        declaration_data_privacy: true,
        declaration_policies: true,
        payment_sent_confirmed: true,
        payment_reference_confirmed: true,
        status: 'submitted' as ApplicationStatus,
      };

      // Insert application
      const { data, error } = await supabase
        .from('affiliated_member_applications')
        .insert(applicationRecord)
        .select()
        .single();

      if (error) {
        console.error('Failed to submit application:', error);
        throw new Error(error.message);
      }

      console.log('EA application submitted successfully:', data.id);
      return data;
    } catch (error) {
      console.error('AffiliatedMemberService.submitApplication error:', error);
      throw error;
    }
  }

  /**
   * Update submitted application (only if status = 'submitted')
   */
  static async updateApplication(
    applicationId: string,
    memberId: string,
    data: Partial<ApplicationFormData>
  ): Promise<void> {
    try {
      const cleanAppId = SecureQueryBuilder.validateUserQuery(applicationId);
      const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);

      // Check application exists and belongs to member
      const { data: existingApp, error: fetchError } = await supabase
        .from('affiliated_member_applications')
        .select('status, member_id')
        .eq('id', cleanAppId)
        .single();

      if (fetchError || !existingApp) {
        throw new Error('Application not found');
      }

      if (existingApp.member_id !== cleanMemberId) {
        throw new Error('You can only update your own applications');
      }

      if (existingApp.status !== 'submitted') {
        throw new Error('Can only update applications with status "submitted"');
      }

      // Sanitize and validate update data
      const sanitizedData = InputSanitizer.sanitizeFormData(data);
      const updateObject: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Validate and add each provided field
      if (sanitizedData.address_postcode) {
        if (SQLSecurityValidator.containsSQLInjection(sanitizedData.address_postcode)) {
          throw new Error('Invalid content in address');
        }
        updateObject.address_postcode = sanitizedData.address_postcode;
      }

      if (sanitizedData.emergency_contact_name) {
        if (SQLSecurityValidator.containsSQLInjection(sanitizedData.emergency_contact_name)) {
          throw new Error('Invalid content in emergency contact name');
        }
        updateObject.emergency_contact_name = sanitizedData.emergency_contact_name;
      }

      if (sanitizedData.emergency_contact_number) {
        if (SQLSecurityValidator.containsSQLInjection(sanitizedData.emergency_contact_number)) {
          throw new Error('Invalid content in emergency contact number');
        }
        updateObject.emergency_contact_number = sanitizedData.emergency_contact_number;
      }

      if (sanitizedData.emergency_contact_relationship) {
        if (SQLSecurityValidator.containsSQLInjection(sanitizedData.emergency_contact_relationship)) {
          throw new Error('Invalid content in emergency contact relationship');
        }
        updateObject.emergency_contact_relationship = sanitizedData.emergency_contact_relationship;
      }

      const { error } = await supabase
        .from('affiliated_member_applications')
        .update(updateObject)
        .eq('id', cleanAppId);

      if (error) {
        console.error('Failed to update application:', error);
        throw new Error(error.message);
      }

      console.log('Application updated successfully');
    } catch (error) {
      console.error('AffiliatedMemberService.updateApplication error:', error);
      throw error;
    }
  }

  /**
   * Cancel application (member initiated)
   */
  static async cancelApplication(
    applicationId: string,
    memberId: string,
    reason: string
  ): Promise<void> {
    try {
      const cleanAppId = SecureQueryBuilder.validateUserQuery(applicationId);
      const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);
      const sanitizedReason = InputSanitizer.sanitizeTextArea(reason);

      if (SQLSecurityValidator.containsSQLInjection(sanitizedReason)) {
        throw new Error('Invalid content in cancellation reason');
      }

      // Check application exists and belongs to member
      const { data: existingApp, error: fetchError } = await supabase
        .from('affiliated_member_applications')
        .select('status, member_id')
        .eq('id', cleanAppId)
        .single();

      if (fetchError || !existingApp) {
        throw new Error('Application not found');
      }

      if (existingApp.member_id !== cleanMemberId) {
        throw new Error('You can only cancel your own applications');
      }

      if (existingApp.status === 'ea_confirmed' || existingApp.status === 'cancelled') {
        throw new Error('Cannot cancel this application');
      }

      const { error } = await supabase
        .from('affiliated_member_applications')
        .update({
          status: 'cancelled',
          cancelled_by: cleanMemberId,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: sanitizedReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanAppId);

      if (error) {
        console.error('Failed to cancel application:', error);
        throw new Error(error.message);
      }

      console.log('Application cancelled successfully');
    } catch (error) {
      console.error('AffiliatedMemberService.cancelApplication error:', error);
      throw error;
    }
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  /**
   * Get applications by status (for admin views)
   */
  static async getApplicationsByStatus(
    status: ApplicationStatus,
    year?: string
  ): Promise<AffiliatedMemberApplication[]> {
    try {
      const statusValidation = SQLSecurityValidator.validateEnum(
        status,
        ALLOWED_STATUSES,
        'application status'
      );
      if (!statusValidation.isValid) {
        throw new Error(statusValidation.error);
      }

      const membershipYear = year || await this.getCurrentMembershipYear();

      const { data, error } = await supabase
        .from('affiliated_member_applications')
        .select(`
          *,
          member:members!affiliated_member_applications_member_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('status', statusValidation.clean)
        .eq('membership_year', membershipYear)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch applications by status:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('AffiliatedMemberService.getApplicationsByStatus error:', error);
      throw error;
    }
  }

  /**
   * Get all applications with optional filters
   */
  static async getAllApplications(
    filters?: ApplicationFilters
  ): Promise<AffiliatedMemberApplication[]> {
    try {
      let query = supabase
        .from('affiliated_member_applications')
        .select(`
          *,
          member:members!affiliated_member_applications_member_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        const statusValidation = SQLSecurityValidator.validateEnum(
          filters.status,
          ALLOWED_STATUSES,
          'application status'
        );
        if (statusValidation.isValid) {
          query = query.eq('status', statusValidation.clean);
        }
      }

      if (filters?.membershipYear) {
        query = query.eq('membership_year', filters.membershipYear);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch all applications:', error);
        throw new Error(error.message);
      }

      // Apply search filter in memory (for name/email search)
      let results = data || [];
      if (filters?.search) {
        const searchValidation = SQLSecurityValidator.validateSearchParam(filters.search);
        if (searchValidation.isValid && searchValidation.clean) {
          const searchLower = searchValidation.clean.toLowerCase();
          results = results.filter(app =>
            app.member?.full_name?.toLowerCase().includes(searchLower) ||
            app.member?.email?.toLowerCase().includes(searchLower)
          );
        }
      }

      return results;
    } catch (error) {
      console.error('AffiliatedMemberService.getAllApplications error:', error);
      throw error;
    }
  }

  /**
   * Get single application by ID
   */
  static async getApplicationById(applicationId: string): Promise<AffiliatedMemberApplication> {
    try {
      const cleanAppId = SecureQueryBuilder.validateUserQuery(applicationId);

      const { data, error } = await supabase
        .from('affiliated_member_applications')
        .select(`
          *,
          member:members!affiliated_member_applications_member_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('id', cleanAppId)
        .single();

      if (error) {
        console.error('Failed to fetch application:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('AffiliatedMemberService.getApplicationById error:', error);
      throw error;
    }
  }

  /**
   * Confirm payment (treasurer action) - changes status to 'payment_confirmed'
   */
  static async confirmPayment(
    applicationId: string,
    confirmedBy: string,
    data: PaymentConfirmationData
  ): Promise<void> {
    try {
      const cleanAppId = SecureQueryBuilder.validateUserQuery(applicationId);
      const cleanConfirmedBy = SecureQueryBuilder.validateUserQuery(confirmedBy);

      // Validate payment date
      const dateValidation = SQLSecurityValidator.validateDateForDB(data.payment_date);
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error);
      }

      // Sanitize notes
      const sanitizedNotes = data.payment_notes
        ? InputSanitizer.sanitizeTextArea(data.payment_notes)
        : null;

      if (sanitizedNotes && SQLSecurityValidator.containsSQLInjection(sanitizedNotes)) {
        throw new Error('Invalid content in payment notes');
      }

      // Check application status
      const { data: existingApp, error: fetchError } = await supabase
        .from('affiliated_member_applications')
        .select('status')
        .eq('id', cleanAppId)
        .single();

      if (fetchError || !existingApp) {
        throw new Error('Application not found');
      }

      if (existingApp.status !== 'submitted') {
        throw new Error('Can only confirm payment for applications with status "submitted"');
      }

      const { error } = await supabase
        .from('affiliated_member_applications')
        .update({
          status: 'payment_confirmed',
          payment_date: dateValidation.clean,
          payment_notes: sanitizedNotes,
          payment_confirmed_by: cleanConfirmedBy,
          payment_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanAppId);

      if (error) {
        console.error('Failed to confirm payment:', error);
        throw new Error(error.message);
      }

      console.log('Payment confirmed successfully for application:', cleanAppId);
    } catch (error) {
      console.error('AffiliatedMemberService.confirmPayment error:', error);
      throw error;
    }
  }

  /**
   * Confirm EA registration (membership secretary action) - changes status to 'ea_confirmed'
   * Note: Database trigger will automatically update member profile
   */
  static async confirmEARegistration(
    applicationId: string,
    confirmedBy: string,
    data: EAConfirmationData
  ): Promise<void> {
    try {
      const cleanAppId = SecureQueryBuilder.validateUserQuery(applicationId);
      const cleanConfirmedBy = SecureQueryBuilder.validateUserQuery(confirmedBy);

      // Validate and sanitize EA URN
      const sanitizedUrn = InputSanitizer.sanitizeText(data.new_ea_urn);
      if (!sanitizedUrn || sanitizedUrn.length < 3) {
        throw new Error('EA URN is required');
      }

      if (SQLSecurityValidator.containsSQLInjection(sanitizedUrn)) {
        throw new Error('Invalid content in EA URN');
      }

      // Sanitize notes
      const sanitizedNotes = data.ea_confirmation_notes
        ? InputSanitizer.sanitizeTextArea(data.ea_confirmation_notes)
        : null;

      if (sanitizedNotes && SQLSecurityValidator.containsSQLInjection(sanitizedNotes)) {
        throw new Error('Invalid content in confirmation notes');
      }

      // Check application status
      const { data: existingApp, error: fetchError } = await supabase
        .from('affiliated_member_applications')
        .select('status')
        .eq('id', cleanAppId)
        .single();

      if (fetchError || !existingApp) {
        throw new Error('Application not found');
      }

      if (existingApp.status !== 'payment_confirmed') {
        throw new Error('Can only confirm EA registration for applications with status "payment_confirmed"');
      }

      const { error } = await supabase
        .from('affiliated_member_applications')
        .update({
          status: 'ea_confirmed',
          new_ea_urn: sanitizedUrn,
          ea_confirmation_notes: sanitizedNotes,
          ea_confirmed_by: cleanConfirmedBy,
          ea_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanAppId);

      if (error) {
        console.error('Failed to confirm EA registration:', error);
        throw new Error(error.message);
      }

      console.log('EA registration confirmed successfully for application:', cleanAppId);
      // Note: Database trigger will automatically update the member's profile
    } catch (error) {
      console.error('AffiliatedMemberService.confirmEARegistration error:', error);
      throw error;
    }
  }

  /**
   * Admin cancel application
   */
  static async adminCancelApplication(
    applicationId: string,
    cancelledBy: string,
    reason: string
  ): Promise<void> {
    try {
      const cleanAppId = SecureQueryBuilder.validateUserQuery(applicationId);
      const cleanCancelledBy = SecureQueryBuilder.validateUserQuery(cancelledBy);
      const sanitizedReason = InputSanitizer.sanitizeTextArea(reason);

      if (!sanitizedReason || sanitizedReason.length < 5) {
        throw new Error('Cancellation reason is required');
      }

      if (SQLSecurityValidator.containsSQLInjection(sanitizedReason)) {
        throw new Error('Invalid content in cancellation reason');
      }

      // Check application can be cancelled
      const { data: existingApp, error: fetchError } = await supabase
        .from('affiliated_member_applications')
        .select('status')
        .eq('id', cleanAppId)
        .single();

      if (fetchError || !existingApp) {
        throw new Error('Application not found');
      }

      if (existingApp.status === 'ea_confirmed' || existingApp.status === 'cancelled') {
        throw new Error('Cannot cancel this application');
      }

      const { error } = await supabase
        .from('affiliated_member_applications')
        .update({
          status: 'cancelled',
          cancelled_by: cleanCancelledBy,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: sanitizedReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanAppId);

      if (error) {
        console.error('Failed to cancel application:', error);
        throw new Error(error.message);
      }

      console.log('Application cancelled by admin');
    } catch (error) {
      console.error('AffiliatedMemberService.adminCancelApplication error:', error);
      throw error;
    }
  }

  /**
   * Export applications to CSV for EA portal
   */
  static async exportApplicationsToCSV(membershipYear: string): Promise<Blob> {
    try {
      // Get all ea_confirmed applications for the year
      const { data, error } = await supabase
        .from('affiliated_member_applications')
        .select(`
          *,
          member:members!affiliated_member_applications_member_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('status', 'ea_confirmed')
        .eq('membership_year', membershipYear)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch applications for export:', error);
        throw new Error(error.message);
      }

      // Build CSV
      const headers = [
        'Title',
        'Full Name',
        'Date of Birth',
        'Sex',
        'Address & Postcode',
        'Email',
        'Telephone',
        'Nationality',
        'Membership Type',
        'EA URN',
        'Previous Club',
        'Emergency Contact Name',
        'Emergency Contact Relationship',
        'Emergency Contact Number',
      ];

      const rows: EAExportRow[] = (data || []).map(app => ({
        title: app.title?.charAt(0).toUpperCase() + app.title?.slice(1) || '',
        full_name: app.member?.full_name || '',
        date_of_birth: app.date_of_birth || '',
        sex: app.sex_at_birth?.charAt(0).toUpperCase() + app.sex_at_birth?.slice(1) || '',
        address_postcode: app.address_postcode || '',
        email: app.member?.email || '',
        phone: app.member?.phone || '',
        nationality: app.nationality || '',
        membership_type: app.membership_type === 'first_claim' ? '1st Claim' : '2nd Claim',
        ea_urn: app.new_ea_urn || app.ea_urn_at_application || '',
        previous_club: app.previous_club_name || '',
        emergency_contact_name: app.emergency_contact_name || '',
        emergency_contact_relationship: app.emergency_contact_relationship || '',
        emergency_contact_number: app.emergency_contact_number || '',
      }));

      // Escape CSV values
      const escapeCSV = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          Object.values(row).map(val => escapeCSV(String(val))).join(',')
        ),
      ].join('\n');

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('AffiliatedMemberService.exportApplicationsToCSV error:', error);
      throw error;
    }
  }

  // ============================================
  // SETTINGS MANAGEMENT FUNCTIONS (Admin Only)
  // ============================================

  /**
   * Create or update settings for a membership year
   */
  static async updateApplicationSettings(
    year: string,
    settings: Partial<EAApplicationSettings>
  ): Promise<void> {
    try {
      // Validate year format (YYYY-YYYY)
      if (!/^\d{4}-\d{4}$/.test(year)) {
        throw new Error('Invalid membership year format. Expected: YYYY-YYYY');
      }

      const updateObject: Record<string, unknown> = {
        membership_year: year,
        updated_at: new Date().toISOString(),
      };

      if (typeof settings.applications_open === 'boolean') {
        updateObject.applications_open = settings.applications_open;
      }

      if (settings.open_date) {
        const dateValidation = SQLSecurityValidator.validateDateForDB(settings.open_date);
        if (!dateValidation.isValid) {
          throw new Error('Invalid open date');
        }
        updateObject.open_date = dateValidation.clean;
      }

      if (settings.close_date) {
        const dateValidation = SQLSecurityValidator.validateDateForDB(settings.close_date);
        if (!dateValidation.isValid) {
          throw new Error('Invalid close date');
        }
        updateObject.close_date = dateValidation.clean;
      }

      if (settings.marathon_ballot_deadline) {
        const dateValidation = SQLSecurityValidator.validateDateForDB(settings.marathon_ballot_deadline);
        if (!dateValidation.isValid) {
          throw new Error('Invalid marathon ballot deadline');
        }
        updateObject.marathon_ballot_deadline = dateValidation.clean;
      }

      if (typeof settings.first_claim_fee === 'number') {
        if (settings.first_claim_fee <= 0) {
          throw new Error('First claim fee must be greater than 0');
        }
        updateObject.first_claim_fee = settings.first_claim_fee;
      }

      if (typeof settings.second_claim_fee === 'number') {
        if (settings.second_claim_fee <= 0) {
          throw new Error('Second claim fee must be greater than 0');
        }
        updateObject.second_claim_fee = settings.second_claim_fee;
      }

      if (typeof settings.uk_athletics_affiliation_fee === 'number') {
        if (settings.uk_athletics_affiliation_fee <= 0) {
          throw new Error('UK Athletics affiliation fee must be greater than 0');
        }
        updateObject.uk_athletics_affiliation_fee = settings.uk_athletics_affiliation_fee;
      }

      if (settings.notes !== undefined) {
        const sanitizedNotes = settings.notes
          ? InputSanitizer.sanitizeTextArea(settings.notes)
          : null;

        if (sanitizedNotes && SQLSecurityValidator.containsSQLInjection(sanitizedNotes)) {
          throw new Error('Invalid content in notes');
        }
        updateObject.notes = sanitizedNotes;
      }

      // Upsert settings
      const { error } = await supabase
        .from('ea_application_settings')
        .upsert(updateObject, { onConflict: 'membership_year' });

      if (error) {
        console.error('Failed to update application settings:', error);
        throw new Error(error.message);
      }

      console.log('Application settings updated successfully for year:', year);
    } catch (error) {
      console.error('AffiliatedMemberService.updateApplicationSettings error:', error);
      throw error;
    }
  }

  /**
   * Open/close application window
   */
  static async setApplicationWindowStatus(
    year: string,
    isOpen: boolean
  ): Promise<void> {
    await this.updateApplicationSettings(year, { applications_open: isOpen });
  }

  /**
   * Update membership fees
   */
  static async updateMembershipFees(
    year: string,
    firstClaimFee: number,
    secondClaimFee: number
  ): Promise<void> {
    await this.updateApplicationSettings(year, {
      first_claim_fee: firstClaimFee,
      second_claim_fee: secondClaimFee,
    });
  }

  /**
   * Get count of pending applications (for navigation badge)
   */
  static async getPendingApplicationsCount(): Promise<number> {
    try {
      const membershipYear = await this.getCurrentMembershipYear();

      const { count, error } = await supabase
        .from('affiliated_member_applications')
        .select('*', { count: 'exact', head: true })
        .eq('membership_year', membershipYear)
        .in('status', ['submitted', 'payment_confirmed']);

      if (error) {
        console.error('Failed to get pending count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('AffiliatedMemberService.getPendingApplicationsCount error:', error);
      return 0;
    }
  }
}

export default AffiliatedMemberService;
