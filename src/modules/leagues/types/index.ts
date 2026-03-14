export type LeagueType  = 'parkrun' | 'season_points';
export type EntryStatus = 'pending' | 'approved' | 'rejected';
export type RankMovement = 'up' | 'down' | 'none';

export interface League {
  id:          string;
  name:        string;
  type:        LeagueType;
  is_active:   boolean;
  season_year: number | null;
  created_at:  string;
}

export interface ParkrunLeagueEntry {
  id:                  string;
  league_id:           string;
  user_id:             string;
  parkrun_athlete_id:  string;
  event_name:          string;
  event_date:          string;
  finish_time:         string;
  age_grade_percent:   number;
  status:              EntryStatus;
  admin_notes:         string | null;
  submitted_at:        string;
  reviewed_at:         string | null;
  reviewed_by:         string | null;
  current_rank:        number | null;
  last_rank:           number | null;
  rank_updated_at:     string | null;
  member_name?:        string;
  member_email?:       string;
}

export interface SubmitEntryFormData {
  parkrun_athlete_id:  string;
  event_name:          string;
  event_date:          string;
  finish_time:         string;
  age_grade_percent:   string;
}

export interface LeaderboardRow extends ParkrunLeagueEntry {
  rank: number;
}

export type RankFields = Pick<
  ParkrunLeagueEntry,
  'current_rank' | 'last_rank' | 'rank_updated_at'
>;

/**
 * Derives the movement indicator for a leaderboard entry.
 * Exported and used by both LeagueTable and LeagueDashboardCard.
 * Do not duplicate this logic elsewhere.
 *
 * Arrow logic:
 *   - No rank_updated_at, or updated > 7 days ago -> 'none' (dash)
 *   - No last_rank (new entrant) -> 'none'
 *   - current_rank < last_rank  -> 'up'   (lower number = better position)
 *   - current_rank > last_rank  -> 'down'
 *   - equal                     -> 'none'
 */
export function getRankMovement(entry: RankFields): RankMovement {
  if (!entry.rank_updated_at || !entry.current_rank || !entry.last_rank) return 'none';

  const updatedAt = new Date(entry.rank_updated_at);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (updatedAt < sevenDaysAgo) return 'none';

  if (entry.current_rank < entry.last_rank) return 'up';
  if (entry.current_rank > entry.last_rank) return 'down';
  return 'none';
}
