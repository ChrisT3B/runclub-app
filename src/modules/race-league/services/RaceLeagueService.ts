import { supabase }            from '../../../services/supabase';
import { InputSanitizer }      from '../../../utils/inputSanitizer';
import { SQLSecurityValidator } from '../../../utils/sqlSecurityValidator';
import { League }              from '../../leagues/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type RaceStatus = 'upcoming' | 'submissions_open' | 'submissions_closed' | 'results_locked';
export type Gender = 'male' | 'female';

export interface RaceLeagueRace {
  id: string;
  league_id: string;
  name: string;
  race_date: string;            // YYYY-MM-DD
  location: string | null;
  distance_label: string | null;
  external_entry_url: string | null;
  submission_open: boolean;
  submission_cutoff: string | null;  // ISO timestamptz
  results_locked: boolean;
  created_at: string;
  created_by: string | null;
}

export interface RaceLeagueEntry {
  id: string;
  race_id: string;
  league_id: string;
  user_id: string;
  gender: Gender;
  finish_time: string;          // HH:MM:SS
  submitted_at: string;
  updated_at: string | null;
  gender_position: number | null;
  points_awarded: number;
  member_name?: string;         // resolved separately for admin views
}

export interface RaceLeagueStanding {
  league_id: string;
  user_id: string;
  gender: Gender;
  total_points: number;
  races_scored: number;
  last_updated: string;
  member_name?: string;         // resolved separately for display
}

export interface SubmitTimeFormData {
  finish_time: string;
  gender: Gender;
}

export interface AdminRaceFormData {
  name: string;
  race_date: string;
  location: string;
  distance_label: string;
  external_entry_url: string;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

export function getRaceStatus(race: RaceLeagueRace): RaceStatus {
  if (race.results_locked) return 'results_locked';
  if (!race.submission_open) return 'upcoming';
  const now = new Date();
  if (race.submission_cutoff && new Date(race.submission_cutoff) < now) {
    return 'submissions_closed';
  }
  return 'submissions_open';
}

export const RACE_STATUS_LABELS: Record<RaceStatus, string> = {
  upcoming:           'Upcoming',
  submissions_open:   'Submit your time',
  submissions_closed: 'Submissions closed',
  results_locked:     'Results published',
};

export const RACE_STATUS_CSS: Record<RaceStatus, string> = {
  upcoming:           'race-status--upcoming',
  submissions_open:   'race-status--open',
  submissions_closed: 'race-status--closed',
  results_locked:     'race-status--locked',
};

// ── Finish-time utilities ──────────────────────────────────────────────────────

function padFinishTime(raw: string): string {
  // "1:02:34" → "01:02:34" — private, used only in submitTime()
  return raw.split(':').map(p => p.padStart(2, '0')).join(':');
}

export function validateFinishTime(raw: string): { valid: boolean; error?: string } {
  const trimmed = raw.trim();
  if (!/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    return { valid: false, error: 'Time must be in HH:MM:SS format, e.g. 01:02:34' };
  }
  const [h, m, s] = trimmed.split(':').map(Number);
  if (h > 23) return { valid: false, error: 'Hours must be 00–23' };
  if (m > 59) return { valid: false, error: 'Minutes must be 00–59' };
  if (s > 59) return { valid: false, error: 'Seconds must be 00–59' };
  return { valid: true };
}

// ── Service ────────────────────────────────────────────────────────────────────

export class RaceLeagueService {

  // ── Pre-launch gate ────────────────────────────────────────────────────────

  public static async isLeagueVisible(): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;
    return true;
  }

  // ── League ─────────────────────────────────────────────────────────────────

  static async getActiveLeague(): Promise<League | null> {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('type', 'race_series')
      .eq('is_active', true)
      .single();
    if (error) { console.error('getActiveLeague:', error); return null; }
    return data;
  }

  // ── Races ──────────────────────────────────────────────────────────────────

  static async getRaces(leagueId: string): Promise<RaceLeagueRace[]> {
    const { data, error } = await supabase
      .from('race_league_races')
      .select('*')
      .eq('league_id', leagueId)
      .order('race_date', { ascending: true });
    if (error) { console.error('getRaces:', error); return []; }
    return data ?? [];
  }

  static async getRace(raceId: string): Promise<RaceLeagueRace | null> {
    const { data, error } = await supabase
      .from('race_league_races')
      .select('*')
      .eq('id', raceId)
      .single();
    if (error) { console.error('getRace:', error); return null; }
    return data;
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  static async getMyEntry(raceId: string): Promise<RaceLeagueEntry | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;
    const { data, error } = await supabase
      .from('race_league_entries')
      .select('*')
      .eq('race_id', raceId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) { console.error('getMyEntry:', error); return null; }
    return data;
  }

  static async getRaceEntries(raceId: string): Promise<RaceLeagueEntry[]> {
    const { data, error } = await supabase
      .from('race_league_entries')
      .select('*')
      .eq('race_id', raceId)
      .order('finish_time', { ascending: true });
    if (error) { console.error('getRaceEntries:', error); return []; }

    // Resolve member names via shared RPC to bypass members table RLS
    const userIds = (data ?? []).map((e: RaceLeagueEntry) => e.user_id);
    const memberMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: members } = await supabase
        .rpc('get_member_names', { user_ids: userIds });
      (members ?? []).forEach((m: { id: string; full_name: string }) => memberMap.set(m.id, m.full_name));
    }

    return (data ?? []).map((e: RaceLeagueEntry) => ({
      ...e,
      member_name: memberMap.get(e.user_id) ?? 'Unknown',
    }));
  }

  // ── Gender profile ─────────────────────────────────────────────────────────

  static async getSavedGender(): Promise<Gender | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;
    const { data, error } = await supabase
      .from('race_league_profiles')
      .select('preferred_gender')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) { console.error('getSavedGender:', error); return null; }
    return (data?.preferred_gender as Gender) ?? null;
  }

  // ── Submit time ────────────────────────────────────────────────────────────

  static async submitTime(raceId: string, leagueId: string, formData: SubmitTimeFormData): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Must be authenticated');

    // Validate finish time
    const timeClean = InputSanitizer.sanitizeText(formData.finish_time.trim());
    if (SQLSecurityValidator.containsSQLInjection(timeClean)) throw new Error('Invalid input');
    const validation = validateFinishTime(timeClean);
    if (!validation.valid) throw new Error(validation.error);
    const paddedTime = padFinishTime(timeClean);

    // Validate gender
    if (!['male', 'female'].includes(formData.gender)) throw new Error('Invalid gender value');

    // Verify race is open for submissions
    const { data: race, error: raceError } = await supabase
      .from('race_league_races')
      .select('submission_open, submission_cutoff, results_locked')
      .eq('id', raceId)
      .single();
    if (raceError || !race) throw new Error('Race not found');
    if (race.results_locked) throw new Error('Results have been locked for this race');
    if (!race.submission_open) throw new Error('Submissions are not open for this race');
    if (race.submission_cutoff && new Date(race.submission_cutoff) < new Date()) {
      throw new Error('The submission deadline has passed');
    }

    // Upsert entry
    const { error: entryError } = await supabase
      .from('race_league_entries')
      .upsert({
        race_id:      raceId,
        league_id:    leagueId,
        user_id:      user.id,
        gender:       formData.gender,
        finish_time:  paddedTime,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'race_id,user_id' });
    if (entryError) throw new Error(entryError.message);

    // Cache preferred gender
    await supabase
      .from('race_league_profiles')
      .upsert({
        user_id:          user.id,
        preferred_gender: formData.gender,
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  // ── Standings ──────────────────────────────────────────────────────────────

  static async getStandings(leagueId: string, gender: Gender): Promise<RaceLeagueStanding[]> {
    const { data, error } = await supabase
      .from('race_league_standings')
      .select('*')
      .eq('league_id', leagueId)
      .eq('gender', gender)
      .order('total_points', { ascending: false });
    if (error) { console.error('getStandings:', error); return []; }

    // Resolve member names via shared RPC to bypass members table RLS
    const userIds = (data ?? []).map((s: RaceLeagueStanding) => s.user_id);
    const memberMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: members } = await supabase
        .rpc('get_member_names', { user_ids: userIds });
      (members ?? []).forEach((m: { id: string; full_name: string }) => memberMap.set(m.id, m.full_name));
    }

    return (data ?? []).map((s: RaceLeagueStanding) => ({
      ...s,
      member_name: memberMap.get(s.user_id) ?? 'Unknown',
    }));
  }

  // ── Lock results (RPC) ────────────────────────────────────────────────────

  static async lockRaceResults(raceId: string): Promise<void> {
    const { error } = await supabase.rpc('lock_race_results', { p_race_id: raceId }) as { error: { message: string } | null };
    if (error) throw new Error(error.message);
  }

  // ── Admin: race CRUD ───────────────────────────────────────────────────────

  static async createRace(leagueId: string, data: AdminRaceFormData): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Must be authenticated');

    const name = InputSanitizer.sanitizeText(data.name.trim());
    const location = InputSanitizer.sanitizeText(data.location.trim());
    const distanceLabel = InputSanitizer.sanitizeText(data.distance_label.trim());
    const externalUrl = data.external_entry_url.trim();

    if (SQLSecurityValidator.containsSQLInjection(name)) throw new Error('Invalid race name');
    if (SQLSecurityValidator.containsSQLInjection(location)) throw new Error('Invalid location');

    const dateValidation = SQLSecurityValidator.validateDateForDB(data.race_date);
    if (!dateValidation.isValid) throw new Error(dateValidation.error ?? 'Invalid date');

    if (externalUrl) {
      try { new URL(externalUrl); } catch { throw new Error('Invalid URL format'); }
    }

    const { error } = await supabase
      .from('race_league_races')
      .insert({
        league_id:         leagueId,
        name,
        race_date:         dateValidation.clean,
        location:          location || null,
        distance_label:    distanceLabel || null,
        external_entry_url: externalUrl || null,
        submission_open:   false,
        results_locked:    false,
        created_by:        user.id,
      });
    if (error) throw new Error(error.message);
  }

  static async updateRace(raceId: string, data: Partial<AdminRaceFormData>): Promise<void> {
    // Fetch current race to check lock status
    const existing = await RaceLeagueService.getRace(raceId);
    if (!existing) throw new Error('Race not found');
    if (existing.results_locked) throw new Error('Cannot edit a locked race');

    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) {
      const name = InputSanitizer.sanitizeText(data.name.trim());
      if (SQLSecurityValidator.containsSQLInjection(name)) throw new Error('Invalid race name');
      updates.name = name;
    }
    if (data.race_date !== undefined) {
      const dateValidation = SQLSecurityValidator.validateDateForDB(data.race_date);
      if (!dateValidation.isValid) throw new Error(dateValidation.error ?? 'Invalid date');
      updates.race_date = dateValidation.clean;
    }
    if (data.location !== undefined) {
      const location = InputSanitizer.sanitizeText(data.location.trim());
      if (SQLSecurityValidator.containsSQLInjection(location)) throw new Error('Invalid location');
      updates.location = location || null;
    }
    if (data.distance_label !== undefined) {
      updates.distance_label = InputSanitizer.sanitizeText(data.distance_label.trim()) || null;
    }
    if (data.external_entry_url !== undefined) {
      const url = data.external_entry_url.trim();
      if (url) {
        try { new URL(url); } catch { throw new Error('Invalid URL format'); }
      }
      updates.external_entry_url = url || null;
    }

    const { error } = await supabase
      .from('race_league_races')
      .update(updates)
      .eq('id', raceId);
    if (error) throw new Error(error.message);
  }

  // ── Admin: submission control ──────────────────────────────────────────────

  static async openSubmissions(raceId: string, cutoff: string): Promise<void> {
    const cutoffDate = new Date(cutoff);
    if (isNaN(cutoffDate.getTime()) || cutoffDate.getTime() <= Date.now()) {
      throw new Error('Cutoff must be a future date and time');
    }
    const { error } = await supabase
      .from('race_league_races')
      .update({ submission_open: true, submission_cutoff: cutoff })
      .eq('id', raceId);
    if (error) throw new Error(error.message);
  }

  static async closeSubmissions(raceId: string): Promise<void> {
    const { error } = await supabase
      .from('race_league_races')
      .update({ submission_open: false })
      .eq('id', raceId);
    if (error) throw new Error(error.message);
  }

  // ── Admin: points structure ────────────────────────────────────────────────

  static async updatePointsStructure(leagueId: string, points: Record<string, number>): Promise<void> {
    for (const [key, value] of Object.entries(points)) {
      if (!/^\d+$/.test(key)) throw new Error(`Invalid position key: "${key}"`);
      const pos = parseInt(key, 10);
      if (pos < 1 || pos > 20) throw new Error(`Position must be between 1 and 20, got ${pos}`);
      if (!Number.isInteger(value) || value < 0) throw new Error(`Points for position ${pos} must be a non-negative integer`);
    }
    const { error } = await supabase
      .from('leagues')
      .update({ points_structure: points })
      .eq('id', leagueId);
    if (error) throw new Error(error.message);
  }
}
