import { supabase } from '../../../services/supabase';
import { SQLSecurityValidator, SecureQueryBuilder } from '../../../utils/sqlSecurityValidator';
import { InputSanitizer } from '../../../utils/inputSanitizer';

export interface Member {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_conditions?: string;
  membership_status: string;
  is_paid_member: boolean;
  ea_urn?: string;
  ea_conduct_accepted: boolean;
  access_level: string;
  dbs_expiry_date?: string; // New DBS expiry field
  email_notifications_enabled?: boolean; // New field for email notifications
  date_joined?: string; // ✅ ADD THIS LINE IF MISSING
  created_at: string;
  updated_at: string;
}

export class AdminService {
  /**
   * Get all members for admin view
   */
  static async getAllMembers(): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch members:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('AdminService.getAllMembers error:', error);
      throw error;
    }
  }

  /**
   * Update member access level
   */
static async updateMemberAccess(memberId: string, accessLevel: string): Promise<void> {
  try {
    // ADD: Validate member ID and access level
    const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);
    const cleanAccessLevel = SecureQueryBuilder.validateAccessLevel(accessLevel);

    const { error } = await supabase
      .from('members')
      .update({ 
        access_level: cleanAccessLevel,  // CHANGE: now validated
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanMemberId);  // CHANGE: now validated

    if (error) {
      console.error('Failed to update member access:', error);
      throw new Error(error.message);
    }

    console.log('✅ Member access updated securely');
  } catch (error) {
    console.error('AdminService.updateMemberAccess error:', error);
    throw error;
  }
}

static async updateMemberStatus(memberId: string, status: string): Promise<void> {
  try {
    // ADD: Validate member ID and status
    const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);
    const cleanStatus = SecureQueryBuilder.validateMembershipStatus(status);

    const { error } = await supabase
      .from('members')
      .update({ 
        membership_status: cleanStatus,  // CHANGE: now validated
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanMemberId);  // CHANGE: now validated

    if (error) {
      console.error('Failed to update member status:', error);
      throw new Error(error.message);
    }

    console.log('✅ Member status updated securely');
  } catch (error) {
    console.error('AdminService.updateMemberStatus error:', error);
    throw error;
  }
}

  /**
   * Update complete member details
   */
static async updateMemberDetails(memberId: string, memberData: Partial<Member>): Promise<void> {
  try {
    // STEP 1: Validate member ID
    const cleanMemberId = SecureQueryBuilder.validateUserQuery(memberId);

    // STEP 2: Sanitize all input data
    const sanitizedData = InputSanitizer.sanitizeFormData(memberData);

    // STEP 3: Build update object
    const updateObject: any = {
      updated_at: new Date().toISOString()
    };

    // Email validation if present
    if (sanitizedData.email) {
      const emailValidation = SQLSecurityValidator.validateEmailForDB(sanitizedData.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }
      updateObject.email = emailValidation.clean;
    }

    // Access level validation if present
    if (sanitizedData.access_level) {
      updateObject.access_level = SecureQueryBuilder.validateAccessLevel(sanitizedData.access_level);
    }

    // Membership status validation if present
    if (sanitizedData.membership_status) {
      updateObject.membership_status = SecureQueryBuilder.validateMembershipStatus(sanitizedData.membership_status);
    }

    // STEP 4: Check text fields individually (FIXED TYPE ISSUES)
    if (sanitizedData.full_name) {
      if (SQLSecurityValidator.containsSQLInjection(sanitizedData.full_name)) {
        console.error('🚨 SQL injection attempt blocked in admin update:', sanitizedData.full_name);
        throw new Error('Invalid content in full_name');
      }
      updateObject.full_name = sanitizedData.full_name;
    }

    if (sanitizedData.phone) {
      if (SQLSecurityValidator.containsSQLInjection(sanitizedData.phone)) {
        console.error('🚨 SQL injection attempt blocked in admin update:', sanitizedData.phone);
        throw new Error('Invalid content in phone');
      }
      updateObject.phone = sanitizedData.phone;
    }

    if (sanitizedData.emergency_contact_name) {
      if (SQLSecurityValidator.containsSQLInjection(sanitizedData.emergency_contact_name)) {
        console.error('🚨 SQL injection attempt blocked in admin update:', sanitizedData.emergency_contact_name);
        throw new Error('Invalid content in emergency_contact_name');
      }
      updateObject.emergency_contact_name = sanitizedData.emergency_contact_name;
    }

    if (sanitizedData.emergency_contact_phone) {
      if (SQLSecurityValidator.containsSQLInjection(sanitizedData.emergency_contact_phone)) {
        console.error('🚨 SQL injection attempt blocked in admin update:', sanitizedData.emergency_contact_phone);
        throw new Error('Invalid content in emergency_contact_phone');
      }
      updateObject.emergency_contact_phone = sanitizedData.emergency_contact_phone;
    }

    if (sanitizedData.health_conditions) {
      if (SQLSecurityValidator.containsSQLInjection(sanitizedData.health_conditions)) {
        console.error('🚨 SQL injection attempt blocked in admin update:', sanitizedData.health_conditions);
        throw new Error('Invalid content in health_conditions');
      }
      updateObject.health_conditions = sanitizedData.health_conditions;
    }

    // Handle boolean fields safely
    if (typeof sanitizedData.email_notifications_enabled === 'boolean') {
      updateObject.email_notifications_enabled = sanitizedData.email_notifications_enabled;
    }

    // Handle DBS date if present
    if (sanitizedData.dbs_expiry_date) {
      const date = new Date(sanitizedData.dbs_expiry_date);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid DBS expiry date');
      }
      updateObject.dbs_expiry_date = sanitizedData.dbs_expiry_date;
    }

    // STEP 5: Execute the secure query
    const { error } = await supabase
      .from('members')
      .update(updateObject)
      .eq('id', cleanMemberId);

    if (error) {
      console.error('Failed to update member details:', error);
      throw new Error(error.message);
    }

    console.log('✅ Admin member update completed securely');
  } catch (error) {
    console.error('AdminService.updateMemberDetails error:', error);
    throw error;
  }
}}

// Also provide a default export for compatibility
export default AdminService;