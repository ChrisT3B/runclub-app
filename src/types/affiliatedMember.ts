// src/types/affiliatedMember.ts
// TypeScript interfaces for EA Affiliated Member Applications

// Application status workflow
export type ApplicationStatus = 'submitted' | 'payment_confirmed' | 'ea_confirmed' | 'cancelled';

// Membership types
export type MembershipType = 'first_claim' | 'second_claim';

// Title options
export type TitleOption = 'mr' | 'mrs' | 'ms' | 'miss' | 'dr' | 'other';

// Sex at birth options
export type SexAtBirth = 'male' | 'female';

// Main application interface (matches affiliated_member_applications table)
export interface AffiliatedMemberApplication {
  id: string;
  member_id: string;

  // Personal Information (snapshot at time of application)
  title: TitleOption;
  date_of_birth: string; // Date string
  sex_at_birth: SexAtBirth;
  address_postcode: string;
  nationality: string;

  // Membership Details
  membership_type: MembershipType;
  membership_fee: number; // 30.00 or 12.00
  membership_year: string; // e.g., "2025-2026"
  is_renewal: boolean;

  // EA Registration
  ea_urn_at_application?: string; // Their URN when applying (if renewal)
  new_ea_urn?: string; // URN assigned by EA (set by membership secretary)
  previous_club_name?: string;

  // Health & Safety (snapshot)
  has_health_conditions: boolean;
  health_conditions_details?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  additional_info?: string;

  // Payment Information
  payment_reference: string;
  payment_method: string;
  payment_date?: string;
  payment_notes?: string;

  // Declarations (all 6 must be true)
  declaration_amateur: boolean;
  declaration_own_risk: boolean;
  declaration_data_privacy: boolean;
  declaration_policies: boolean;
  payment_sent_confirmed: boolean;
  payment_reference_confirmed: boolean;

  // Workflow Status
  status: ApplicationStatus;

  // Admin Tracking
  payment_confirmed_by?: string;
  payment_confirmed_at?: string;
  ea_confirmed_by?: string;
  ea_confirmed_at?: string;
  ea_confirmation_notes?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data (when fetching with member details)
  member?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

// Application settings (matches ea_application_settings table)
export interface EAApplicationSettings {
  id: string;
  membership_year: string; // e.g., "2025-2026"
  applications_open: boolean;
  open_date?: string;
  close_date?: string;
  marathon_ballot_deadline?: string;
  first_claim_fee: number;
  second_claim_fee: number;
  uk_athletics_affiliation_fee: number; // UK Athletics fee included in 1st claim
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Form submission data (what member submits)
export interface ApplicationFormData {
  title: TitleOption;
  date_of_birth: string;
  sex_at_birth: SexAtBirth;
  address_postcode: string;
  nationality: string;
  membership_type: MembershipType;
  ea_urn_at_application?: string;
  previous_club_name?: string;
  has_health_conditions: boolean;
  health_conditions_details?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
  additional_info?: string;
  payment_reference: string;
  payment_method: string;
  declaration_amateur: boolean;
  declaration_own_risk: boolean;
  declaration_data_privacy: boolean;
  declaration_policies: boolean;
  payment_sent_confirmed: boolean;
  payment_reference_confirmed: boolean;
}

// Payment confirmation data (treasurer)
export interface PaymentConfirmationData {
  application_id: string;
  payment_date: string;
  payment_notes?: string;
}

// EA confirmation data (membership secretary)
export interface EAConfirmationData {
  application_id: string;
  new_ea_urn: string;
  ea_confirmation_notes?: string;
}

// Application filters for admin queries
export interface ApplicationFilters {
  status?: ApplicationStatus;
  membershipYear?: string;
  search?: string;
}

// CSV export row format for EA portal
export interface EAExportRow {
  title: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  address_postcode: string;
  email: string;
  phone: string;
  nationality: string;
  membership_type: string;
  ea_urn: string;
  previous_club: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_number: string;
}

// Dashboard card display data
export interface EAMembershipStatus {
  isAffiliated: boolean;
  affiliationYear?: string;
  membershipType?: MembershipType;
  eaUrn?: string;
  pendingApplication?: AffiliatedMemberApplication;
  applicationsOpen: boolean;
  currentYearSettings?: EAApplicationSettings;
}
