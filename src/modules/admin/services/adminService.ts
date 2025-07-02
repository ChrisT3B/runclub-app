import { supabase } from '../../../services/supabase';

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
      const { error } = await supabase
        .from('members')
        .update({ 
          access_level: accessLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) {
        console.error('Failed to update member access:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('AdminService.updateMemberAccess error:', error);
      throw error;
    }
  }

  /**
   * Update member status
   */
  static async updateMemberStatus(memberId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('members')
        .update({ 
          membership_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) {
        console.error('Failed to update member status:', error);
        throw new Error(error.message);
      }
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
      const { error } = await supabase
        .from('members')
        .update({ 
          ...memberData,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) {
        console.error('Failed to update member details:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('AdminService.updateMemberDetails error:', error);
      throw error;
    }
  }
}