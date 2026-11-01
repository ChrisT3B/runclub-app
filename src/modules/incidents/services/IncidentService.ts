// Incident reports: saved through the create_run_incident RPC (incident + people
// in one transaction), read under RLS (admins see all, leaders see their own),
// admin follow-up updates limited by column grants.
import { supabase } from '../../../services/supabase';
import type {
  FollowUpStatus,
  IncidentDraft,
  IncidentPerson,
  IncidentType,
  RunIncident,
  RunPerson
} from '../types';

const DRAFT_KEY_PREFIX = 'incidentDraft:';

const INCIDENT_SELECT = `
  id, run_id, reported_by, incident_type, description, actions_taken, action_notes,
  follow_up_required, follow_up_status, admin_notes, closed_at, closed_by, created_at, updated_at,
  run:scheduled_runs!run_incidents_run_id_fkey(run_title, run_date),
  reporter:members!run_incidents_reported_by_fkey(full_name),
  closer:members!run_incidents_closed_by_fkey(full_name),
  people:run_incident_people(id, member_id, display_name, involvement)
`;

interface IncidentRow {
  id: string;
  run_id: string;
  reported_by: string;
  incident_type: IncidentType;
  description: string;
  actions_taken: string[] | null;
  action_notes: string | null;
  follow_up_required: boolean;
  follow_up_status: FollowUpStatus | null;
  admin_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
  run: { run_title: string; run_date: string } | null;
  reporter: { full_name: string } | null;
  closer: { full_name: string } | null;
  people: IncidentPerson[] | null;
}

const toIncident = (row: IncidentRow): RunIncident => ({
  id: row.id,
  run_id: row.run_id,
  reported_by: row.reported_by,
  incident_type: row.incident_type,
  description: row.description,
  actions_taken: row.actions_taken ?? [],
  action_notes: row.action_notes,
  follow_up_required: row.follow_up_required,
  follow_up_status: row.follow_up_status,
  admin_notes: row.admin_notes,
  closed_at: row.closed_at,
  closed_by: row.closed_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
  run_title: row.run?.run_title ?? 'Unknown run',
  run_date: row.run?.run_date ?? '',
  reporter_name: row.reporter?.full_name ?? 'Unknown',
  closed_by_name: row.closer?.full_name ?? null,
  people: row.people ?? []
});

export class IncidentService {
  // ---- Leader: saving a report ----

  /** Saves the incident and its people together. Returns the new incident id. */
  static async createIncident(runId: string, draft: IncidentDraft): Promise<string> {
    const { data, error } = (await supabase.rpc('create_run_incident', {
      p_run_id: runId,
      p_incident_type: draft.incident_type,
      p_description: draft.description.trim(),
      p_actions_taken: draft.actions_taken,
      p_action_notes: draft.action_notes.trim() || null,
      p_follow_up_required: draft.follow_up_required === true,
      p_people: draft.people.map(p => ({
        member_id: p.member_id,
        display_name: p.display_name.trim(),
        involvement: p.involvement
      }))
    })) as { data: string | null; error: { message: string } | null };

    if (error) throw new Error(error.message);
    if (!data) throw new Error('The report was not saved. Please try again.');
    return data;
  }

  /**
   * Asks the server to email admins that a report was made. The email holds no
   * personal detail. Never throws: a failed email must not affect the saved report.
   */
  static async notifyAdmins(incidentId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/incident-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ incident_id: incidentId })
      });
      if (!response.ok) {
        console.warn('Incident alert email not sent:', response.status);
      }
    } catch (error) {
      console.warn('Incident alert email not sent:', error);
    }
  }

  /** Members and guests booked on or recorded in attendance for the run. */
  static async getRunPeople(runId: string): Promise<RunPerson[]> {
    const [bookings, attendance] = await Promise.all([
      supabase.from('run_bookings').select('member_id, cancelled_at').eq('run_id', runId),
      supabase.from('run_attendance').select('member_id').eq('run_id', runId)
    ]);
    if (bookings.error) throw new Error(bookings.error.message);
    if (attendance.error) throw new Error(attendance.error.message);

    const ids = new Set<string>();
    (bookings.data ?? []).forEach(b => { if (b.member_id && !b.cancelled_at) ids.add(b.member_id); });
    (attendance.data ?? []).forEach(a => { if (a.member_id) ids.add(a.member_id); });
    if (ids.size === 0) return [];

    const { data, error } = await supabase
      .from('members')
      .select('id, full_name')
      .in('id', Array.from(ids));
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map(m => ({ member_id: m.id, full_name: m.full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  // ---- Reading reports (RLS: admin sees all, leader sees own) ----

  static async getIncidents(): Promise<RunIncident[]> {
    const { data, error } = await supabase
      .from('run_incidents')
      .select(INCIDENT_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as IncidentRow[]).map(toIncident);
  }

  // ---- Admin follow-up (column grants: follow-up fields only) ----

  static async saveAdminNotes(incidentId: string, adminNotes: string): Promise<void> {
    const { error } = await supabase
      .from('run_incidents')
      .update({
        admin_notes: adminNotes.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', incidentId);
    if (error) throw new Error(error.message);
  }

  static async closeFollowUp(incidentId: string, adminId: string, adminNotes: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('run_incidents')
      .update({
        follow_up_status: 'closed',
        closed_at: now,
        closed_by: adminId,
        admin_notes: adminNotes.trim() || null,
        updated_at: now
      })
      .eq('id', incidentId)
      .eq('follow_up_status', 'open');
    if (error) throw new Error(error.message);
  }

  // ---- Local draft (kept until saved or discarded) ----

  static loadDraft(runId: string): IncidentDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY_PREFIX + runId);
      return raw ? (JSON.parse(raw) as IncidentDraft) : null;
    } catch {
      return null;
    }
  }

  static saveDraft(runId: string, draft: IncidentDraft): void {
    try {
      localStorage.setItem(DRAFT_KEY_PREFIX + runId, JSON.stringify(draft));
    } catch {
      // Storage unavailable (private mode, full): the form still works
    }
  }

  static clearDraft(runId: string): void {
    try {
      localStorage.removeItem(DRAFT_KEY_PREFIX + runId);
    } catch {
      // ignore
    }
  }

  static hasDraft(runId: string): boolean {
    return IncidentService.loadDraft(runId) !== null;
  }
}
