// Incident reporting (WP-IncidentReporting-v1).
// Value lists must stay in step with the check constraints on
// public.run_incidents / public.run_incident_people (Docs/WP-IncidentReporting-v1-SQL.sql).

export type IncidentType = 'injury' | 'illness' | 'near_miss' | 'hazard' | 'behaviour' | 'other';

export const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'injury', label: 'Injury' },
  { value: 'illness', label: 'Illness' },
  { value: 'near_miss', label: 'Near miss' },
  { value: 'hazard', label: 'Hazard' },
  { value: 'behaviour', label: 'Behaviour' },
  { value: 'other', label: 'Other' }
];

export type Involvement = 'casualty' | 'involved' | 'witness';

export const INVOLVEMENTS: { value: Involvement; label: string }[] = [
  { value: 'casualty', label: 'Casualty' },
  { value: 'involved', label: 'Involved' },
  { value: 'witness', label: 'Witness' }
];

// The front end owns this list; the database stores plain text.
export const ACTION_NONE = 'none';

export const ACTIONS_TAKEN: { value: string; label: string }[] = [
  { value: 'first_aid_given', label: 'First aid given' },
  { value: 'emergency_services_called', label: 'Emergency services called' },
  { value: 'defibrillator_used', label: 'Defibrillator used' },
  { value: 'taken_to_hospital', label: 'Taken to hospital' },
  { value: ACTION_NONE, label: 'None' }
];

export type FollowUpStatus = 'open' | 'closed';

export interface IncidentPersonInput {
  member_id: string | null;
  display_name: string;
  involvement: Involvement;
}

export interface IncidentDraft {
  incident_type: IncidentType | '';
  description: string;
  people: IncidentPersonInput[];
  actions_taken: string[];
  action_notes: string;
  follow_up_required: boolean | null;
}

export const EMPTY_DRAFT: IncidentDraft = {
  incident_type: '',
  description: '',
  people: [],
  actions_taken: [],
  action_notes: '',
  follow_up_required: null
};

export interface RunPerson {
  member_id: string;
  full_name: string;
}

export interface IncidentPerson {
  id: string;
  member_id: string | null;
  display_name: string;
  involvement: Involvement;
}

export interface RunIncident {
  id: string;
  run_id: string;
  reported_by: string;
  incident_type: IncidentType;
  description: string;
  actions_taken: string[];
  action_notes: string | null;
  follow_up_required: boolean;
  follow_up_status: FollowUpStatus | null;
  admin_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
  run_title: string;
  run_date: string;
  reporter_name: string;
  closed_by_name: string | null;
  people: IncidentPerson[];
}

export const incidentTypeLabel = (value: string) =>
  INCIDENT_TYPES.find(t => t.value === value)?.label ?? value;

export const involvementLabel = (value: string) =>
  INVOLVEMENTS.find(i => i.value === value)?.label ?? value;

export const actionLabel = (value: string) =>
  ACTIONS_TAKEN.find(a => a.value === value)?.label ?? value;
