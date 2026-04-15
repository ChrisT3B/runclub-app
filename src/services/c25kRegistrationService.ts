import { supabase } from './supabase';
import { C25kRegistrationFormData } from '../types/c25k';
import { InputSanitizer } from '../utils/inputSanitizer';

export class C25kRegistrationService {

  /**
   * Register a new C25k participant (new member - creates auth account)
   * Creates auth account, pending member record, health screening, and registration
   */
  static async registerNewC25kParticipant(
    formData: C25kRegistrationFormData,
    invitationToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sanitized = this.sanitizeFormData(formData);

      // Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitized.email,
        password: formData.password,
        options: {
          data: { full_name: sanitized.full_name },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (authError || !authData.user) {
        // Detect existing account — Supabase returns various messages for duplicate emails
        const msg = authError?.message?.toLowerCase() || '';
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
          throw new Error('This email address already has an account. Please sign in at app.runalcester.co.uk first, then visit the C25k registration link again to complete your registration.');
        }
        throw new Error(authError?.message || 'Failed to create account');
      }

      // Supabase may return a user with identities=[] for existing emails (depending on config)
      if (authData.user.identities && authData.user.identities.length === 0) {
        throw new Error('This email address already has an account. Please sign in at app.runalcester.co.uk first, then visit the C25k registration link again to complete your registration.');
      }

      const userId = authData.user.id;

      // Create pending member record with C25k fields
      const { error: pendingError } = await supabase
        .from('pending_members')
        .insert([{
          id: userId,
          email: sanitized.email,
          full_name: sanitized.full_name,
          phone: sanitized.phone,
          title: sanitized.title,
          date_of_birth: formData.date_of_birth,
          sex_at_birth: formData.sex_at_birth,
          address_postcode: sanitized.address_postcode,
          ea_urn: sanitized.ea_urn || null,
          emergency_contact_name: sanitized.emergency_contact_name,
          emergency_contact_relationship: sanitized.emergency_contact_relationship,
          emergency_contact_phone: sanitized.emergency_contact_phone,
          health_conditions: sanitized.additional_info || 'See C25k health screening',
          is_c25k_participant: true
        }]);

      if (pendingError) {
        console.error('Failed to create pending member:', pendingError);
        throw new Error('Failed to create member profile');
      }

      // Store C25K data temporarily in pending_members
      // Records will be created during email verification when user is in members table
      const c25kFormData = {
        health_screening: {
          heart_condition: formData.health_screening.heart_condition,
          chest_pain: formData.health_screening.chest_pain,
          dizziness_loss_consciousness: formData.health_screening.dizziness_loss_consciousness,
          chronic_medical_condition: formData.health_screening.chronic_medical_condition,
          prescribed_medications: formData.health_screening.prescribed_medications,
          bone_joint_soft_tissue: formData.health_screening.bone_joint_soft_tissue,
          medically_supervised_only: formData.health_screening.medically_supervised_only,
          additional_info: formData.health_screening.additional_info || null
        },
        registration: {
          programme_year: 2026,
          cohort_name: 'Spring 2026',
          payment_type: formData.payment_type,
          payment_amount: formData.payment_type === 'bank_transfer' ? 30.00 : 0.00,
          payment_confirmed: false,
          status: 'pending_payment',
          accepted_terms: formData.accepted_terms,
          accepted_at: new Date().toISOString(),
          induction_date: '2026-04-23'
        },
        submitted_at: new Date().toISOString()
      };

      console.log('🏃 C25K: Storing form data in pending_members for user:', userId);

      const { error: updateError } = await supabase
        .from('pending_members')
        .update({ c25k_form_data: c25kFormData })
        .eq('id', userId);

      if (updateError) {
        console.error('🏃 C25K: Failed to store form data:', updateError);
        throw new Error('Failed to save C25K registration data. Please try again.');
      }

      console.log('🏃 C25K: Form data stored successfully. Records will be created upon email verification.');

      // Mark invitation as registered if provided
      if (invitationToken) {
        await supabase
          .from('pending_invitations')
          .update({
            status: 'registered',
            registered_at: new Date().toISOString()
          })
          .eq('token', invitationToken);
      }

      return { success: true };
    } catch (error: any) {
      console.error('C25k registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  /**
   * Register an existing member for C25k (already has an account)
   * Uses SECURITY DEFINER RPC to bypass RLS for unauthenticated users
   */
  static async registerExistingMember(
    memberId: string,
    formData: C25kRegistrationFormData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sanitized = this.sanitizeFormData(formData);

      const { data, error } = await supabase.rpc('register_existing_c25k_member', {
        p_member_id: memberId,
        p_title: sanitized.title,
        p_date_of_birth: formData.date_of_birth,
        p_sex_at_birth: formData.sex_at_birth,
        p_address_postcode: sanitized.address_postcode,
        p_ea_urn: sanitized.ea_urn || '',
        p_emergency_contact_name: sanitized.emergency_contact_name,
        p_emergency_contact_relationship: sanitized.emergency_contact_relationship,
        p_emergency_contact_phone: sanitized.emergency_contact_phone,
        p_heart_condition: formData.health_screening.heart_condition,
        p_chest_pain: formData.health_screening.chest_pain,
        p_dizziness: formData.health_screening.dizziness_loss_consciousness,
        p_chronic_condition: formData.health_screening.chronic_medical_condition,
        p_prescribed_meds: formData.health_screening.prescribed_medications,
        p_bone_joint: formData.health_screening.bone_joint_soft_tissue,
        p_medically_supervised: formData.health_screening.medically_supervised_only,
        p_additional_info: sanitized.additional_info || '',
        p_accepted_terms: formData.accepted_terms
      }) as { data: { success: boolean; error?: string } | null; error: any };

      if (error) {
        console.error('RPC error:', error);
        throw new Error(error.message || 'Registration failed');
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      return { success: true };
    } catch (error: any) {
      console.error('C25k registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  /**
   * Look up an email to check if it belongs to an existing member
   * Uses SECURITY DEFINER RPC to bypass RLS
   */
  static async checkExistingMember(email: string): Promise<{
    exists: boolean;
    member_id?: string;
    full_name?: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    ea_urn?: string;
  }> {
    const { data, error } = await supabase.rpc('check_c25k_email', {
      lookup_email: email
    }) as { data: Array<{ member_id: string; full_name: string; phone: string; emergency_contact_name: string; emergency_contact_phone: string; ea_urn: string }> | null; error: any };

    if (error || !data || data.length === 0) {
      return { exists: false };
    }

    const member = data[0];
    return {
      exists: true,
      member_id: member.member_id,
      full_name: member.full_name,
      phone: member.phone,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      ea_urn: member.ea_urn
    };
  }

  /**
   * Check if a member is already registered for C25k this year
   */
  static async isAlreadyRegistered(memberId: string): Promise<boolean> {
    const { data } = await supabase
      .from('c25k_registrations')
      .select('id')
      .eq('member_id', memberId)
      .eq('programme_year', 2026)
      .maybeSingle();

    return !!data;
  }

  /**
   * Get C25k programme information
   */
  static async getProgrammeInfo() {
    const { count: totalRegistrations } = await supabase
      .from('c25k_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('programme_year', 2026)
      .neq('status', 'cancelled');

    const placesAvailable = 12;
    const placesRemaining = Math.max(0, placesAvailable - (totalRegistrations || 0));

    return {
      year: 2026,
      cohort_name: 'Spring 2026',
      start_date: '2026-04-27',
      induction_date: '2026-04-23',
      induction_time: '18:15',
      cost: 30.00,
      places_available: placesAvailable,
      places_remaining: placesRemaining,
      schedule: {
        monday: '7:00 PM - Alcester (outside PSW)',
        wednesday: '7:00 PM - Stratford Running Track',
        friday: '6:00 PM - Alcester'
      }
    };
  }

  // --- Private helpers ---

  private static sanitizeFormData(formData: C25kRegistrationFormData) {
    return {
      title: InputSanitizer.sanitizeText(formData.title),
      full_name: InputSanitizer.sanitizeText(formData.full_name),
      email: InputSanitizer.sanitizeEmail(formData.email),
      phone: InputSanitizer.sanitizeText(formData.phone),
      address_postcode: InputSanitizer.sanitizeText(formData.address_postcode),
      ea_urn: formData.ea_urn ? InputSanitizer.sanitizeText(formData.ea_urn) : undefined,
      emergency_contact_name: InputSanitizer.sanitizeText(formData.emergency_contact_name),
      emergency_contact_relationship: InputSanitizer.sanitizeText(formData.emergency_contact_relationship),
      emergency_contact_phone: InputSanitizer.sanitizeText(formData.emergency_contact_phone),
      additional_info: formData.additional_info ? InputSanitizer.sanitizeText(formData.additional_info) : undefined
    };
  }
}
