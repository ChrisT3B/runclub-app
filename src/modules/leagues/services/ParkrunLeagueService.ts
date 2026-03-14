import { supabase }             from '../../../services/supabase';
import { InputSanitizer }       from '../../../utils/inputSanitizer';
import { SQLSecurityValidator }  from '../../../utils/sqlSecurityValidator';
import { GmailSMTP }            from '../../../utils/GmailSMTP';
import { NotificationService }  from '../../communications/services/NotificationService';
import {
  League, ParkrunLeagueEntry, LeaderboardRow,
  SubmitEntryFormData, RankFields, getRankMovement
} from '../types';

function buildRejectionEmailHtml(
  name: string,
  entry: ParkrunLeagueEntry,
  reason: string
): string {
  return `
    <h2>Run Alcester — Parkrun League</h2>
    <p>Hi ${name},</p>
    <p>Your parkrun league submission could not be approved:</p>
    <ul>
      <li><strong>Event:</strong> ${entry.event_name}</li>
      <li><strong>Date:</strong> ${entry.event_date}</li>
      <li><strong>Time:</strong> ${entry.finish_time}</li>
      <li><strong>Age Grade:</strong> ${entry.age_grade_percent}%</li>
    </ul>
    <p>${reason}</p>
    <p>Log in to the app and resubmit with the correct details.</p>
    <p>Best regards,<br/>Run Alcester</p>
  `;
}

export class ParkrunLeagueService {

  /**
   * PRE-LAUNCH GATE: leagues visible to admins only.
   * TO RELEASE TO ALL USERS: delete the access_level check block below,
   * leaving only `return true`. No other files need changing.
   */
  public static async isLeagueVisible(): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    // PRE-LAUNCH: remove this block on release ─────────────────────────────
    const { data } = await supabase
      .from('members')
      .select('access_level')
      .eq('id', user.id)
      .single();
    if (data?.access_level !== 'admin') return false;
    // END PRE-LAUNCH ────────────────────────────────────────────────────────

    return true;
  }

  static async getActiveLeague(): Promise<League | null> {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('type', 'parkrun')
      .eq('is_active', true)
      .single();
    if (error) { console.error('getActiveLeague:', error); return null; }
    return data;
  }

  static async getLeaderboard(leagueId: string): Promise<LeaderboardRow[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('*, members!parkrun_league_entries_user_id_members_fkey(full_name)')
      .eq('league_id', leagueId)
      .eq('status', 'approved')
      .gte('event_date', cutoffStr)
      .order('submitted_at', { ascending: false });

    if (error) { console.error('getLeaderboard:', error); return []; }

    // De-duplicate: keep only the most recently submitted entry per user
    const seen = new Set<string>();
    const deduped = (data ?? []).filter((entry: any) => {
      if (seen.has(entry.user_id)) return false;
      seen.add(entry.user_id);
      return true;
    });

    // Sort by age grade DESC and assign rank
    deduped.sort((a: any, b: any) => b.age_grade_percent - a.age_grade_percent);

    return deduped.map((entry: any, i: number) => ({
      ...entry,
      member_name: entry.members?.full_name ?? 'Unknown',
      rank: i + 1,
    }));
  }

  static async getMyEntries(leagueId: string, year: number): Promise<ParkrunLeagueEntry[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .gte('event_date', `${year}-01-01`)
      .lte('event_date', `${year}-12-31`)
      .order('event_date', { ascending: true });

    if (error) { console.error('getMyEntries:', error); return []; }
    return data ?? [];
  }

  static async getMyLatestEntry(leagueId: string): Promise<ParkrunLeagueEntry | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) { console.error('getMyLatestEntry:', error); return null; }
    return data;
  }

  static async getMyLeaderboardPosition(leagueId: string): Promise<{
    current_rank:      number | null;
    age_grade_percent: number | null;
    movement:          ReturnType<typeof getRankMovement>;
  } | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('current_rank, last_rank, rank_updated_at, age_grade_percent')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .not('current_rank', 'is', null)
      .order('rank_updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) { console.error('getMyLeaderboardPosition:', error); return null; }
    if (!data)  return { current_rank: null, age_grade_percent: null, movement: 'none' };

    const rankFields: RankFields = {
      current_rank:    data.current_rank,
      last_rank:       data.last_rank,
      rank_updated_at: data.rank_updated_at,
    };

    return {
      current_rank:      data.current_rank,
      age_grade_percent: data.age_grade_percent,
      movement:          getRankMovement(rankFields),
    };
  }

  static async getSavedAthleteId(): Promise<string | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data } = await supabase
      .from('parkrun_league_profiles')
      .select('parkrun_athlete_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return data?.parkrun_athlete_id ?? null;
  }

  static async submitEntry(formData: SubmitEntryFormData, leagueId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Must be authenticated');

    // ── Validation & sanitization ──────────────────────────────────────
    const athleteIdClean = InputSanitizer.sanitizeText(formData.parkrun_athlete_id.trim().toUpperCase());
    if (SQLSecurityValidator.containsSQLInjection(athleteIdClean)) throw new Error('Invalid input detected in parkrun_athlete_id');
    if (!/^A\d+$/i.test(athleteIdClean)) throw new Error('Invalid parkrun athlete ID format');

    const eventNameClean = InputSanitizer.sanitizeText(formData.event_name.trim());
    if (SQLSecurityValidator.containsSQLInjection(eventNameClean)) throw new Error('Invalid input detected in event_name');

    const eventDateCheck = SQLSecurityValidator.validateDateForDB(formData.event_date);
    if (!eventDateCheck.isValid) throw new Error(eventDateCheck.error);

    const finishTimeClean = InputSanitizer.sanitizeText(formData.finish_time.trim());
    if (!/^\d{1,2}:\d{2}$/.test(finishTimeClean)) throw new Error('Invalid time format (MM:SS required)');
    const [, secs] = finishTimeClean.split(':').map(Number);
    if (secs > 59) throw new Error('Seconds must be 00-59');

    const ageGrade = parseFloat(formData.age_grade_percent);
    if (isNaN(ageGrade) || ageGrade <= 0 || ageGrade > 100) throw new Error('Age grade must be between 1 and 100');

    // ── Insert ─────────────────────────────────────────────────────────
    const { error } = await supabase
      .from('parkrun_league_entries')
      .insert({
        league_id:          leagueId,
        user_id:            user.id,
        parkrun_athlete_id: athleteIdClean,
        event_name:         eventNameClean,
        event_date:         formData.event_date,
        finish_time:        finishTimeClean,
        age_grade_percent:  ageGrade,
        status:             'pending',
      });

    if (error) throw new Error(error.message);

    // Cache athlete ID for future form pre-population
    await supabase
      .from('parkrun_league_profiles')
      .upsert({
        user_id:            user.id,
        parkrun_athlete_id: athleteIdClean,
        updated_at:         new Date().toISOString(),
      });
  }

  static async getPendingEntries(): Promise<ParkrunLeagueEntry[]> {
    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('*, members!parkrun_league_entries_user_id_members_fkey(full_name, email)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) { console.error('getPendingEntries:', error); return []; }
    return (data ?? []).map((e: any) => ({
      ...e,
      member_name:  e.members?.full_name,
      member_email: e.members?.email,
    }));
  }

  static async reviewEntry(
    entryId:     string,
    leagueId:    string,
    decision:    'approved' | 'rejected',
    adminNotes?: string
  ): Promise<void> {
    const admin = (await supabase.auth.getUser()).data.user;
    if (!admin) throw new Error('Must be authenticated');

    const { data: entry, error } = await supabase
      .from('parkrun_league_entries')
      .update({
        status:      decision,
        admin_notes: adminNotes ? InputSanitizer.sanitizeText(adminNotes.trim()) : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
      })
      .eq('id', entryId)
      .select('*, members!parkrun_league_entries_user_id_members_fkey(full_name, email)')
      .single();

    if (error) throw new Error(error.message);

    if (decision === 'approved') {
      await ParkrunLeagueService.recalculateRanks(leagueId);
    }

    if (decision === 'rejected') {
      const name   = (entry as any).members?.full_name ?? 'Member';
      const email  = (entry as any).members?.email;
      const reason = adminNotes
        ? `Reason: ${InputSanitizer.sanitizeText(adminNotes.trim())}`
        : 'No reason was provided. Please check your submission details.';

      await NotificationService.createNotification({
        title:         'League Entry Not Approved',
        message:       `Your parkrun league entry (${entry.event_name}, ${entry.event_date}, ${entry.age_grade_percent}%) was not approved. ${reason} Please resubmit with the correct details.`,
        type:          'general',
        priority:      'normal',
        recipient_ids: [entry.user_id],
        send_email:    false,
      });

      if (email) {
        await GmailSMTP.sendEmail({
          to:      email,
          subject: 'Run Alcester Parkrun League — Entry Not Approved',
          html:    buildRejectionEmailHtml(name, entry as ParkrunLeagueEntry, reason),
          text:    `Hi ${name}, your league entry for ${entry.event_name} was not approved. ${reason}`,
        });
      }
    }
  }

  private static async recalculateRanks(leagueId: string): Promise<void> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('id, user_id, age_grade_percent, current_rank, submitted_at')
      .eq('league_id', leagueId)
      .eq('status', 'approved')
      .gte('event_date', cutoffStr)
      .order('submitted_at', { ascending: false });

    if (error) { console.error('recalculateRanks fetch:', error); return; }

    // De-duplicate: one entry per user (most recent submitted_at)
    const seen = new Set<string>();
    const active = (data ?? []).filter((e: any) => {
      if (seen.has(e.user_id)) return false;
      seen.add(e.user_id);
      return true;
    });

    // Sort by age_grade_percent DESC to determine new ranks
    active.sort((a: any, b: any) => b.age_grade_percent - a.age_grade_percent);

    // Write new ranks
    const now = new Date().toISOString();
    for (let i = 0; i < active.length; i++) {
      const entry = active[i];
      const { error: updateError } = await supabase
        .from('parkrun_league_entries')
        .update({
          last_rank:       entry.current_rank ?? null,
          current_rank:    i + 1,
          rank_updated_at: now,
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error(`recalculateRanks update failed for entry ${entry.id}:`, updateError);
      }
    }

    console.log(`Ranks recalculated for league ${leagueId} — ${active.length} entries updated`);
  }
}
