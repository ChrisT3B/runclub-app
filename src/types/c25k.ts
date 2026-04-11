// C25k-specific type definitions

export interface C25kHealthScreening {
  id?: string;
  member_id: string;

  // Health screening questions
  heart_condition: boolean;
  chest_pain: boolean;
  dizziness_loss_consciousness: boolean;
  chronic_medical_condition: boolean;
  prescribed_medications: boolean;
  bone_joint_soft_tissue: boolean;
  medically_supervised_only: boolean;

  // Auto-computed
  all_answered_no?: boolean;

  // Additional info
  additional_info?: string;

  created_at?: string;
  updated_at?: string;
}

export type C25kRegistrationStatus =
  | 'pending_payment'
  | 'awaiting_health_review'
  | 'physio_in_progress'
  | 'confirmed'
  | 'waitlist'
  | 'cancelled';

export type C25kPaymentType = 'bank_transfer' | 'existing_member_free';

export interface C25kRegistration {
  id?: string;
  member_id: string;

  // Programme details
  programme_year: number;
  cohort_name: string;

  // Payment
  payment_confirmed: boolean;
  payment_type?: C25kPaymentType;
  payment_amount: number;
  payment_reference?: string;
  payment_confirmed_at?: string;
  payment_confirmed_by?: string;

  // Status
  status: C25kRegistrationStatus;

  // Induction
  induction_attended: boolean;
  induction_date?: string;

  // Completion
  completed: boolean;
  completion_date?: string;
  medal_awarded: boolean;
  tshirt_awarded: boolean;

  // Legal
  accepted_terms: boolean;
  accepted_at?: string;

  created_at?: string;
  updated_at?: string;
}

export interface C25kRegistrationFormData {
  // Personal details (extended from base registration)
  title: string;
  full_name: string;
  date_of_birth: string;
  sex_at_birth: 'male' | 'female';
  address_postcode: string;
  email: string;
  phone: string;

  // Existing member
  is_existing_member: boolean;
  ea_urn?: string;

  // Health screening
  health_screening: Omit<C25kHealthScreening, 'id' | 'member_id' | 'created_at' | 'updated_at'>;

  // Emergency contact
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;

  // Additional info
  additional_info?: string;

  // Payment
  payment_type: C25kPaymentType;

  // Legal
  accepted_terms: boolean;

  // Auth (only for new member registration)
  password: string;
  confirm_password: string;
}

export interface C25kProgrammeInfo {
  year: number;
  cohort_name: string;
  start_date: string;
  induction_date: string;
  cost: number;
  places_available: number;
  places_remaining: number;
  schedule: {
    monday: string;
    wednesday: string;
    friday: string;
  };
}
