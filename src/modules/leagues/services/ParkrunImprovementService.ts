import { supabase } from '../../../services/supabase';

/**
 * Parkrun Improvement Tracking (admin only).
 *
 * Tracks each member's age-grade improvement across the league year using a
 * rolling-baseline rule:
 *   - The first approved entry in the year sets the baseline (no improvement).
 *   - Each subsequent entry is compared to the current baseline:
 *       new AG% >  baseline -> delta = new - baseline, add to cumulative, reset baseline to new
 *       new AG% <= baseline -> no improvement,         reset baseline to new (measure recovery from the trough)
 *
 * Data is stored in `parkrun_improvement_entries` and surfaced to admins only.
 */

export const IMPROVEMENT_LEAGUE_ID = 'fee39efa-a3bc-4cf7-8460-ed39c87a6ce2';

// The live parkrun leaderboard league that improvement is calculated from.
export const PARKRUN_LEAGUE_ID = 'bdd0da90-ce7a-497c-b5a9-084bce466f9d';

export const IMPROVEMENT_LEAGUE_YEAR_START = '2025-12-01';
export const IMPROVEMENT_LEAGUE_YEAR_END   = '2026-11-30';

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface ImprovementRow {
  league_id:              string;
  user_id:                string;
  parkrun_entry_id:       string;
  event_name:             string;
  event_date:             string;
  age_grade_percent:      number;
  baseline_at_submission: number;
  improvement_delta:      number;
  cumulative_improvement: number;
}

export interface ImprovementReportEntry {
  event_name:             string;
  event_date:             string;
  age_grade_percent:      number;
  baseline_at_submission: number;
  improvement_delta:      number;
  cumulative_improvement: number;
}

export interface ImprovementReportMember {
  user_id:           string;
  member_name:       string;
  entries:           ImprovementReportEntry[];
  total_improvement: number; // last entry's cumulative_improvement
}

export class ParkrunImprovementService {
  /**
   * Recalculates the improvement entries for a single member by replaying the
   * baseline rule over their approved parkrun entries in the league year.
   * Idempotent: deletes and rewrites this member's rows each time.
   */
  static async recalculateImprovement(userId: string): Promise<void> {
    // 1. Fetch the member's approved entries within the league year, chronologically.
    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('id, event_name, event_date, age_grade_percent')
      .eq('league_id', PARKRUN_LEAGUE_ID)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('event_date', IMPROVEMENT_LEAGUE_YEAR_START)
      .lte('event_date', IMPROVEMENT_LEAGUE_YEAR_END)
      .order('event_date',   { ascending: true })
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('recalculateImprovement fetch:', error);
      return;
    }

    const entries = data ?? [];

    // 2. No entries -> remove any stale improvement rows for this member.
    if (entries.length === 0) {
      const { error: delError } = await supabase
        .from('parkrun_improvement_entries')
        .delete()
        .eq('league_id', IMPROVEMENT_LEAGUE_ID)
        .eq('user_id', userId);
      if (delError) console.error('recalculateImprovement delete (empty):', delError);
      return;
    }

    // 3. Replay the baseline logic in order.
    let baseline: number | null = null;
    let cumulative = 0;
    const improvementRows: ImprovementRow[] = [];

    for (const entry of entries) {
      let delta = 0;

      if (baseline === null) {
        // First entry — set baseline, no improvement.
        baseline = entry.age_grade_percent;
      } else {
        if (entry.age_grade_percent > baseline) {
          delta = round2(entry.age_grade_percent - baseline);
          cumulative = round2(cumulative + delta);
        }
        baseline = entry.age_grade_percent; // always reset baseline
      }

      // After the branch above, baseline is always set to this entry's AG%.
      const baselineAtSubmission: number = baseline!;

      improvementRows.push({
        league_id:              IMPROVEMENT_LEAGUE_ID,
        user_id:                userId,
        parkrun_entry_id:       entry.id,
        event_name:             entry.event_name,
        event_date:             entry.event_date,
        age_grade_percent:      entry.age_grade_percent,
        baseline_at_submission: baselineAtSubmission,
        improvement_delta:      delta,
        cumulative_improvement: cumulative,
      });
    }

    // 4. Replace this member's rows: delete then insert.
    const { error: delError } = await supabase
      .from('parkrun_improvement_entries')
      .delete()
      .eq('league_id', IMPROVEMENT_LEAGUE_ID)
      .eq('user_id', userId);
    if (delError) {
      console.error('recalculateImprovement delete:', delError);
      return;
    }

    const { error: insError } = await supabase
      .from('parkrun_improvement_entries')
      .insert(improvementRows);
    if (insError) {
      console.error('recalculateImprovement insert:', insError);
    }
  }

  /**
   * Returns every member's improvement data for the admin report,
   * sorted by total improvement DESC, then member name.
   */
  static async getImprovementReport(): Promise<ImprovementReportMember[]> {
    const { data, error } = await supabase
      .from('parkrun_improvement_entries')
      .select('user_id, event_name, event_date, age_grade_percent, baseline_at_submission, improvement_delta, cumulative_improvement')
      .eq('league_id', IMPROVEMENT_LEAGUE_ID)
      .order('event_date',   { ascending: true })
      .order('calculated_at', { ascending: true });

    if (error) {
      console.error('getImprovementReport:', error);
      return [];
    }

    const rows = data ?? [];
    if (rows.length === 0) return [];

    // Resolve member names via the shared RPC (bypasses members-table RLS).
    const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id))];
    const nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: members } = await supabase
        .rpc('get_member_names', { user_ids: userIds });
      (members ?? []).forEach((m: { id: string; full_name: string }) => nameMap.set(m.id, m.full_name));
    }

    // Group rows by member (rows are already chronological).
    const byMember = new Map<string, ImprovementReportEntry[]>();
    for (const r of rows) {
      const list = byMember.get(r.user_id) ?? [];
      list.push({
        event_name:             r.event_name,
        event_date:             r.event_date,
        age_grade_percent:      r.age_grade_percent,
        baseline_at_submission: r.baseline_at_submission,
        improvement_delta:      r.improvement_delta,
        cumulative_improvement: r.cumulative_improvement,
      });
      byMember.set(r.user_id, list);
    }

    const report: ImprovementReportMember[] = [];
    for (const [user_id, entries] of byMember.entries()) {
      report.push({
        user_id,
        member_name:       nameMap.get(user_id) ?? 'Unknown',
        entries,
        total_improvement: entries[entries.length - 1]?.cumulative_improvement ?? 0,
      });
    }

    report.sort((a, b) => {
      if (b.total_improvement !== a.total_improvement) {
        return b.total_improvement - a.total_improvement;
      }
      return a.member_name.localeCompare(b.member_name);
    });

    return report;
  }

  /**
   * Builds a CSV of the improvement report and triggers a browser download.
   */
  static async exportCSV(): Promise<void> {
    const report = await this.getImprovementReport();

    const formatDate = (dateStr: string): string => {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const escape = (value: string): string =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

    const lines: string[] = ['Member,Event,Date,AG%,Baseline,Delta,Cumulative Total'];

    for (const member of report) {
      for (const e of member.entries) {
        const delta = `${e.improvement_delta >= 0 ? '+' : ''}${e.improvement_delta.toFixed(2)}`;
        lines.push([
          escape(member.member_name),
          escape(e.event_name),
          formatDate(e.event_date),
          e.age_grade_percent.toFixed(2),
          e.baseline_at_submission.toFixed(2),
          delta,
          e.cumulative_improvement.toFixed(2),
        ].join(','));
      }
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parkrun-improvement.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * One-time backfill: recalculates improvement for every member who has an
   * approved parkrun entry in the league year. Safe to re-run (idempotent).
   * Returns the number of members processed.
   */
  static async backfillAll(): Promise<number> {
    const { data, error } = await supabase
      .from('parkrun_league_entries')
      .select('user_id')
      .eq('league_id', PARKRUN_LEAGUE_ID)
      .eq('status', 'approved')
      .gte('event_date', IMPROVEMENT_LEAGUE_YEAR_START)
      .lte('event_date', IMPROVEMENT_LEAGUE_YEAR_END);

    if (error) {
      console.error('backfillAll fetch:', error);
      throw new Error(error.message);
    }

    const userIds = [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))];
    for (const userId of userIds) {
      await this.recalculateImprovement(userId);
    }
    return userIds.length;
  }
}
