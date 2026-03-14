# Club Leagues — Complete Work Package V3

> **Status:** Consolidated single-document specification — supersedes all previous versions  
> **Format:** Markdown for Claude Code  
> **Date:** March 2026  
> **Scope:** Full implementation from empty codebase — database → service → components → routing

---

## Design Summary

| Rule | Detail |
|---|---|
| Leaderboard ranking | Sorted by `age_grade_percent` DESC |
| Member's displayed entry | Most recently **submitted** approved entry (by `submitted_at` DESC) |
| Expiry | Entries excluded if `event_date` is more than 6 months ago |
| History | All entries preserved — nothing deleted, expiry applied at query time |
| Submissions | Unlimited per member — every parkrun counts |
| Approval | Every submission requires admin review before appearing on leaderboard |
| Rejection notifications | Both in-app notification and email |
| Athlete ID | Required on every submission — enables admin spot-check link |
| Leaderboard visibility | Authenticated users only — consistent with the rest of the app |
| Pre-launch gate | Admin-only, hardcoded in service layer — one block to delete at launch |
| DB structure | Dedicated `parkrun_league_entries` table — not a shared entries table |
| Movement arrows | Reflect change in rank position after each approval recalculation |
| Arrow reset | Arrow resets to dash if `rank_updated_at` is older than 7 days |
| Rank recalculation | Triggered on every entry approval — not on a schedule |

---

## 1. Database Schema

### 1.1 Create Tables

Run this entire block in the Supabase SQL Editor. Safe to re-run (uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).

```sql
-- ── leagues (registry) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('parkrun', 'season_points')),
  is_active    BOOLEAN     NOT NULL DEFAULT FALSE,
  season_year  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── parkrun_league_entries ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parkrun_league_entries (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id            UUID           NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id              UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parkrun_athlete_id   TEXT           NOT NULL,
  event_name           TEXT           NOT NULL,
  event_date           DATE           NOT NULL,
  finish_time          TEXT           NOT NULL,
  age_grade_percent    NUMERIC(5,2)   NOT NULL
                         CHECK (age_grade_percent > 0 AND age_grade_percent <= 100),
  status               TEXT           NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes          TEXT,
  submitted_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  reviewed_at          TIMESTAMPTZ,
  reviewed_by          UUID           REFERENCES auth.users(id),
  -- Rank tracking (populated by recalculateRanks on each approval)
  current_rank         INTEGER,
  last_rank            INTEGER,
  rank_updated_at      TIMESTAMPTZ
);

-- ── parkrun_league_profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parkrun_league_profiles (
  user_id              UUID        PRIMARY KEY
                         REFERENCES auth.users(id) ON DELETE CASCADE,
  parkrun_athlete_id   TEXT        NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pr_entries_league_status
  ON parkrun_league_entries(league_id, status);
CREATE INDEX IF NOT EXISTS idx_pr_entries_user_league
  ON parkrun_league_entries(user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_pr_entries_submitted
  ON parkrun_league_entries(submitted_at DESC);

-- ── Seed: active parkrun league for 2026 ─────────────────────────────────
INSERT INTO leagues (name, type, is_active, season_year)
  VALUES ('Parkrun League 2026', 'parkrun', TRUE, 2026)
  ON CONFLICT DO NOTHING;
```

**Rank column reference:**

| Column | Type | Purpose |
|---|---|---|
| `current_rank` | INTEGER, nullable | Member's rank on the current leaderboard |
| `last_rank` | INTEGER, nullable | Their rank before the most recent recalculation |
| `rank_updated_at` | TIMESTAMPTZ, nullable | When `current_rank` was last written — used for 7-day arrow reset |

### 1.2 RLS Policies

```sql
-- Enable RLS
ALTER TABLE leagues                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parkrun_league_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parkrun_league_profiles  ENABLE ROW LEVEL SECURITY;

-- ── leagues: public read, admin write ─────────────────────────────────────
CREATE POLICY "leagues_public_read" ON leagues
  FOR SELECT USING (TRUE);

CREATE POLICY "leagues_admin_write" ON leagues
  FOR ALL
  USING   (EXISTS (SELECT 1 FROM members WHERE id = auth.uid() AND access_level = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE id = auth.uid() AND access_level = 'admin'));

-- ── parkrun_league_entries ────────────────────────────────────────────────
-- Unauthenticated / all users: approved entries only
CREATE POLICY "pr_entries_public_read" ON parkrun_league_entries
  FOR SELECT USING (status = 'approved');

-- Authenticated users: also see their own pending/rejected entries
CREATE POLICY "pr_entries_own_read" ON parkrun_league_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users: insert own entries (status must be 'pending')
CREATE POLICY "pr_entries_own_insert" ON parkrun_league_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admin: full access
CREATE POLICY "pr_entries_admin_all" ON parkrun_league_entries
  FOR ALL
  USING   (EXISTS (SELECT 1 FROM members WHERE id = auth.uid() AND access_level = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE id = auth.uid() AND access_level = 'admin'));

-- ── parkrun_league_profiles ───────────────────────────────────────────────
CREATE POLICY "pr_profiles_own_all" ON parkrun_league_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pr_profiles_admin_read" ON parkrun_league_profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM members WHERE id = auth.uid() AND access_level = 'admin'));
```

---

## 2. File & Module Structure

All new files under `src/modules/leagues/`. Existing files modified: `DashboardContent.tsx` (card insertion only), `AppContent.tsx` (switch cases), and `Sidebar.tsx` (nav items). Do not restructure any of these files — targeted additions only.

```
src/modules/leagues/
├── pages/
│   ├── LeaguePage.tsx            # Leaderboard — page id: 'leagues'
│   ├── SubmitEntryPage.tsx       # Submission form — page id: 'leagues-submit'
│   └── AdminLeaguePage.tsx       # Admin review queue — page id: 'admin-leagues'
├── components/
│   ├── LeagueTable.tsx           # Ranked leaderboard table
│   ├── LeagueDashboardCard.tsx   # Dashboard summary card
│   ├── MyLeagueStatus.tsx        # Member's current entry + year progression
│   ├── SubmitEntryForm.tsx       # Submission form
│   ├── RankArrow.tsx             # Movement indicator component
│   └── PendingEntryCard.tsx      # Admin approve/reject card
├── services/
│   └── ParkrunLeagueService.ts   # All Supabase queries
├── types/
│   └── index.ts                  # TypeScript interfaces + getRankMovement()
└── leagues.css                   # CSS classes for league components
```

---

## 3. TypeScript Types (`src/modules/leagues/types/index.ts`)

```typescript
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
  event_date:          string;        // 'YYYY-MM-DD'
  finish_time:         string;        // 'MM:SS'
  age_grade_percent:   number;
  status:              EntryStatus;
  admin_notes:         string | null;
  submitted_at:        string;
  reviewed_at:         string | null;
  reviewed_by:         string | null;
  current_rank:        number | null;
  last_rank:           number | null;
  rank_updated_at:     string | null;
  // Joined fields — populated by service layer
  member_name?:        string;
  member_email?:       string;
}

export interface SubmitEntryFormData {
  parkrun_athlete_id:  string;
  event_name:          string;
  event_date:          string;
  finish_time:         string;   // 'MM:SS' — validated before submit
  age_grade_percent:   string;   // string in form, parsed to number on submit
}

// One row on the rendered leaderboard — guaranteed to have a rank
export interface LeaderboardRow extends ParkrunLeagueEntry {
  rank: number;
}

// Narrow type accepted by getRankMovement — avoids casting partial data
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
 *   - No rank_updated_at, or updated > 7 days ago → 'none' (dash)
 *   - No last_rank (new entrant) → 'none'
 *   - current_rank < last_rank  → 'up'   (lower number = better position)
 *   - current_rank > last_rank  → 'down'
 *   - equal                     → 'none'
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
```

---

## 4. Security & Input Validation

### 4.1 Existing utilities — use these, do not write custom alternatives

- **`InputSanitizer`** (`src/utils/InputSanitizer.ts`) — strips XSS payloads and trims whitespace. Call on all text fields before inserting to the database.
- **`SQLSecurityValidator`** (`src/utils/sqlSecurityValidator.ts`) — detects SQL injection patterns. Call on all user-supplied string values before they reach a Supabase query.

### 4.2 Field-level requirements

| Field | HTML Input | InputSanitizer | SQLSecurityValidator | Additional |
|---|---|---|---|---|
| `parkrun_athlete_id` | `type="text"` | ✓ | ✓ | Force `.toUpperCase()` after sanitization |
| `event_name` | `type="text"` | ✓ | ✓ | maxLength=100 enforced in input and service |
| `event_date` | `type="date"` (date picker) | — | `validateDate()` | `max=today`, `min=Jan 1 current year` on the input |
| `finish_time` | `type="text"` | ✓ | ✓ | Regex `/^\d{1,2}:\d{2}$/` applied after sanitization |
| `age_grade_percent` | `type="number" step=0.01 min=1 max=100` | — | — | `parseFloat()` + range check only |
| `admin_notes` | `type="text"` | ✓ | ✓ | Admin field — still sanitize; shown to member in notification and email HTML |

### 4.3 Validation in `submitEntry()` — apply before any Supabase call

```typescript
import { InputSanitizer }      from '../../../utils/InputSanitizer';
import { SQLSecurityValidator } from '../../../utils/sqlSecurityValidator';

// All validation must happen in the service, not only in the form component.
// The form provides UX feedback; the service provides the security guarantee.

const athleteIdClean = InputSanitizer.sanitize(formData.parkrun_athlete_id.trim().toUpperCase());
const athleteIdCheck = SQLSecurityValidator.validateString(athleteIdClean, 'parkrun_athlete_id');
if (!athleteIdCheck.isValid) throw new Error(athleteIdCheck.error);
if (!/^A\d+$/i.test(athleteIdClean)) throw new Error('Invalid parkrun athlete ID format');

const eventNameClean = InputSanitizer.sanitize(formData.event_name.trim());
const eventNameCheck = SQLSecurityValidator.validateString(eventNameClean, 'event_name');
if (!eventNameCheck.isValid) throw new Error(eventNameCheck.error);

const eventDateCheck = SQLSecurityValidator.validateDate(formData.event_date);
if (!eventDateCheck.isValid) throw new Error(eventDateCheck.error);

const finishTimeClean = InputSanitizer.sanitize(formData.finish_time.trim());
if (!/^\d{1,2}:\d{2}$/.test(finishTimeClean)) throw new Error('Invalid time format (MM:SS required)');
const [mins, secs] = finishTimeClean.split(':').map(Number);
if (secs > 59) throw new Error('Seconds must be 00–59');

const ageGrade = parseFloat(formData.age_grade_percent);
if (isNaN(ageGrade) || ageGrade <= 0 || ageGrade > 100) throw new Error('Age grade must be between 1 and 100');

// Only reach the Supabase insert if all checks pass
```

### 4.4 Defence in depth

RLS policies (Section 1.2) ensure that even if client-side validation is bypassed, the database will reject: unauthenticated inserts, inserts where `user_id !== auth.uid()`, and any attempt by a non-admin to update entry status. Service-layer validation and RLS are two independent layers — both are required.

---

## 5. `ParkrunLeagueService` (`src/modules/leagues/services/ParkrunLeagueService.ts`)

Import at top of file:

```typescript
import { supabase }             from '../../../services/supabase';
import { InputSanitizer }       from '../../../utils/InputSanitizer';
import { SQLSecurityValidator }  from '../../../utils/sqlSecurityValidator';
import { GmailSMTP }            from '../../../utils/GmailSMTP';
import { NotificationService }  from '../../communications/services/NotificationService';
import {
  League, ParkrunLeagueEntry, LeaderboardRow,
  SubmitEntryFormData, RankFields, getRankMovement
} from '../types';
```

Match the logging and error-handling style of `ScheduledRunsService` throughout — explicit `console.error` on failures, typed returns, no silent failures.

---

### 5.1 Pre-launch gate — `isLeagueVisible()`

`isLeagueVisible()` is **public** so that `LeagueDashboardCard` can call it directly on mount (see Section 6.6). It is not called internally by other service methods — the component holds the result in state and gates its own data fetches.

```typescript
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
```

---

### 5.2 `getActiveLeague()`

```typescript
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
```

---

### 5.3 `getLeaderboard(leagueId)`

Returns one `LeaderboardRow` per member — their most recently submitted approved entry — excluding entries whose `event_date` is more than 6 months ago. Sorted by `age_grade_percent` DESC.

```typescript
static async getLeaderboard(leagueId: string): Promise<LeaderboardRow[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0]; // DATE comparison on event_date

  const { data, error } = await supabase
    .from('parkrun_league_entries')
    .select('*, members!inner(full_name)')
    .eq('league_id', leagueId)
    .eq('status', 'approved')
    .gte('event_date', cutoffStr)
    .order('submitted_at', { ascending: false }); // newest first for de-duplication

  if (error) { console.error('getLeaderboard:', error); return []; }

  // De-duplicate: keep only the most recently submitted entry per user
  const seen = new Set<string>();
  const deduped = (data ?? []).filter(entry => {
    if (seen.has(entry.user_id)) return false;
    seen.add(entry.user_id);
    return true;
  });

  // Sort by age grade DESC and assign rank
  deduped.sort((a, b) => b.age_grade_percent - a.age_grade_percent);

  return deduped.map((entry, i) => ({
    ...entry,
    member_name: entry.members?.full_name ?? 'Unknown',
    rank: i + 1,
  }));
}
```

---

### 5.4 `getMyEntries(leagueId, year)`

Returns all approved entries for the current member in the given calendar year, oldest first. Used by `MyLeagueStatus` for the year-progression view.

```typescript
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
```

---

### 5.5 `getMyLatestEntry(leagueId)`

Returns the member's single most recent entry regardless of status. Used by `MyLeagueStatus` to show current submission state.

```typescript
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
```

---

### 5.6 `getMyLeaderboardPosition(leagueId)`

Returns the current member's rank, age grade, and movement indicator. Used by `LeagueDashboardCard`. Returns `null` if the user is unauthenticated or has no ranked entry.

```typescript
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

  // data is a partial select — it satisfies RankFields, no cast needed
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
```

---

### 5.7 `getSavedAthleteId()`

Returns the cached parkrun athlete ID, or `null`. Pre-populates the submission form.

```typescript
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
```

---

### 5.8 `submitEntry(formData, leagueId)`

Validates, sanitizes, then inserts a new pending entry. Does not touch previous entries — all history is preserved.

```typescript
static async submitEntry(formData: SubmitEntryFormData, leagueId: string): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Must be authenticated');

  // ── Validation & sanitization (Section 4.3) ──────────────────────────
  const athleteIdClean = InputSanitizer.sanitize(formData.parkrun_athlete_id.trim().toUpperCase());
  const athleteIdCheck = SQLSecurityValidator.validateString(athleteIdClean, 'parkrun_athlete_id');
  if (!athleteIdCheck.isValid) throw new Error(athleteIdCheck.error);
  if (!/^A\d+$/i.test(athleteIdClean)) throw new Error('Invalid parkrun athlete ID format');

  const eventNameClean = InputSanitizer.sanitize(formData.event_name.trim());
  const eventNameCheck = SQLSecurityValidator.validateString(eventNameClean, 'event_name');
  if (!eventNameCheck.isValid) throw new Error(eventNameCheck.error);

  const eventDateCheck = SQLSecurityValidator.validateDate(formData.event_date);
  if (!eventDateCheck.isValid) throw new Error(eventDateCheck.error);

  const finishTimeClean = InputSanitizer.sanitize(formData.finish_time.trim());
  if (!/^\d{1,2}:\d{2}$/.test(finishTimeClean)) throw new Error('Invalid time format (MM:SS required)');
  const [, secs] = finishTimeClean.split(':').map(Number);
  if (secs > 59) throw new Error('Seconds must be 00–59');

  const ageGrade = parseFloat(formData.age_grade_percent);
  if (isNaN(ageGrade) || ageGrade <= 0 || ageGrade > 100) throw new Error('Age grade must be between 1 and 100');

  // ── Insert ────────────────────────────────────────────────────────────
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
```

---

### 5.9 `getPendingEntries()` [admin]

Returns all pending entries across all parkrun leagues, joined with member name and email. FIFO order (oldest first).

```typescript
static async getPendingEntries(): Promise<ParkrunLeagueEntry[]> {
  const { data, error } = await supabase
    .from('parkrun_league_entries')
    .select('*, members!inner(full_name, email)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if (error) { console.error('getPendingEntries:', error); return []; }
  return (data ?? []).map(e => ({
    ...e,
    member_name:  e.members?.full_name,
    member_email: e.members?.email,
  }));
}
```

---

### 5.10 `reviewEntry(entryId, leagueId, decision, adminNotes?)` [admin]

Updates entry status. On approval, triggers rank recalculation. On rejection, sends in-app notification and email.

> **Note:** `leagueId` is required so `recalculateRanks` knows which league to process. Update the call site in `AdminLeaguePage` accordingly.

```typescript
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
      admin_notes: adminNotes ? InputSanitizer.sanitize(adminNotes.trim()) : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq('id', entryId)
    .select('*, members!inner(full_name, email)')
    .single();

  if (error) throw new Error(error.message);

  if (decision === 'approved') {
    await ParkrunLeagueService.recalculateRanks(leagueId);
  }

  if (decision === 'rejected') {
    const name   = entry.members?.full_name ?? 'Member';
    const email  = entry.members?.email;
    const reason = adminNotes
      ? `Reason: ${InputSanitizer.sanitize(adminNotes.trim())}`
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
        html:    buildRejectionEmailHtml(name, entry, reason),
        text:    `Hi ${name}, your league entry for ${entry.event_name} was not approved. ${reason}`,
      });
    }
  }
}
```

---

### 5.11 `recalculateRanks(leagueId)` [private]

Called only from `reviewEntry()` on approval. Recalculates the full leaderboard and writes `current_rank`, `last_rank`, and `rank_updated_at` to each active entry row.

```typescript
private static async recalculateRanks(leagueId: string): Promise<void> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Fetch all approved entries within the 6-month event_date window
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
  const active = (data ?? []).filter(e => {
    if (seen.has(e.user_id)) return false;
    seen.add(e.user_id);
    return true;
  });

  // Sort by age_grade_percent DESC to determine new ranks
  active.sort((a, b) => b.age_grade_percent - a.age_grade_percent);

  // Write new ranks — loop is acceptable at ~70 members
  const now = new Date().toISOString();
  for (let i = 0; i < active.length; i++) {
    const entry = active[i];
    const { error: updateError } = await supabase
      .from('parkrun_league_entries')
      .update({
        last_rank:       entry.current_rank ?? null,  // preserve old rank
        current_rank:    i + 1,
        rank_updated_at: now,
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error(`recalculateRanks update failed for entry ${entry.id}:`, updateError);
    }
  }

  console.log(`✅ Ranks recalculated for league ${leagueId} — ${active.length} entries updated`);
}
```

---

### 5.12 Email helper (module-level, not a class method)

```typescript
function buildRejectionEmailHtml(
  name: string,
  entry: ParkrunLeagueEntry,
  reason: string
): string {
  return `
    <h2>🏃 Run Alcester — Parkrun League</h2>
    <p>Hi ${name},</p>
    <p>Your parkrun league submission could not be approved:</p>
    <ul>
      <li><strong>Event:</strong> ${entry.event_name}</li>
      <li><strong>Date:</strong> ${entry.event_date}</li>
      <li><strong>Time:</strong> ${entry.finish_time}</li>
      <li><strong>Age Grade:</strong> ${entry.age_grade_percent}%</li>
    </ul>
    <p>${reason}</p>
    <p>Please log in and resubmit with the correct details.</p>
    <p>Log in to the app and resubmit with the correct details.</p>
    <p>Best regards,<br/>Run Alcester</p>
  `;
}
```

---

## 6. Components

### 6.1 `RankArrow.tsx`

```typescript
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RankFields, getRankMovement } from '../types';

interface RankArrowProps {
  entry: RankFields;
}

export function RankArrow({ entry }: RankArrowProps) {
  const movement = getRankMovement(entry);
  if (movement === 'up')   return <TrendingUp   size={16} className="league-arrow league-arrow--up" />;
  if (movement === 'down') return <TrendingDown  size={16} className="league-arrow league-arrow--down" />;
  return <Minus size={16} className="league-arrow league-arrow--none" />;
}
```

In `leagues.css` — use the correct existing CSS variable names from the project's variables.css.  
The correct variable names are:
- Success/up: `--success-color`
- Danger/down: `--danger-color` (not `--error-color`)
- Muted/none: `--gray-500` (not `--muted-color`)

```css
.league-arrow { display: inline-flex; align-items: center; }
.league-arrow--up   { color: var(--success-color); }
.league-arrow--down { color: var(--danger-color); }
.league-arrow--none { color: var(--gray-500); }
```

---

### 6.2 `LeagueTable.tsx`

Renders the public leaderboard. Columns in order:

| # | Header | Content |
|---|---|---|
| 1 | *(blank)* | `<RankArrow entry={row} />` |
| 2 | Rank | `row.rank` |
| 3 | Name | `row.member_name` |
| 4 | parkrun | `row.event_name` |
| 5 | Date | `row.event_date` formatted DD/MM/YYYY |
| 6 | Time | `row.finish_time` |
| 7 | Age Grade % | `row.age_grade_percent.toFixed(2)` right-aligned |

Do not show `parkrun_athlete_id` or any admin data in this component.

---

### 6.3 `SubmitEntryForm.tsx` — field specification

| Field | Input | Attributes | Inline error |
|---|---|---|---|
| parkrun_athlete_id | `type="text"` | `maxLength=20`, `placeholder="e.g. A1234567"` | Must be a valid parkrun ID (e.g. A1234567) |
| event_name | `type="text"` | `maxLength=100`, `placeholder="e.g. Stratford-upon-Avon"` | Please enter the parkrun event name |
| event_date | `type="date"` | `max={today}`, `min={Jan 1 current year}` | Date must be within the current year and not in the future |
| finish_time | `type="text"` | `placeholder="MM:SS e.g. 24:15"` | Enter a valid time in MM:SS format |
| age_grade_percent | `type="number"` | `min=1 max=100 step=0.01` | Enter a valid age grade % between 1 and 100 |

Include a helper link below the athlete ID field:  
*"Find your age grade % →"* — if athlete ID is pre-populated, link to `https://www.parkrun.org.uk/parkrunner/{athleteId}/` in a new tab. Otherwise link to `https://www.parkrun.org.uk/results/athleteresultshistory/`.

---

### 6.4 `MyLeagueStatus.tsx`

Visible only to authenticated members on `LeaguePage`. Two sections:

**Current entry status** — shows `getMyLatestEntry()` result with a badge:

| Status | Badge | Message |
|---|---|---|
| `pending` | Amber | "Your entry is awaiting admin review" |
| `approved` | Green | Shows leaderboard position + age grade. `<RankArrow>` inline |
| `rejected` | Red | Shows `admin_notes` + "Resubmit" button calling `onNavigate('leagues-submit')` |
| No entry | Neutral | "You haven't entered the league yet — Submit an entry to join" |

**Year progression** — shows all approved entries for the current calendar year from `getMyEntries()`, oldest first, as a table: Date | Event | Time | Age Grade %.

- Fewer than 2 entries: show table + note "Submit more parkruns to see your progression"
- 2 or more entries: also show trend indicator — arrow + difference between first and latest age grade %

---

### 6.5 `PendingEntryCard.tsx`

Used only in `AdminLeaguePage`. Each card is self-contained with its own loading/error state for approve/reject so that acting on one card does not affect others.

Each card displays:
- Member name
- Event name, event date, finish time, age grade %
- Submitted date
- "View on parkrun" link: `https://www.parkrun.org.uk/parkrunner/{parkrun_athlete_id}/` (new tab)

**Approve button:** calls `reviewEntry(id, leagueId, 'approved')` — optimistically removes the card from the queue on success.

**Reject button:** reveals an inline text input for admin notes, then calls `reviewEntry(id, leagueId, 'rejected', notes)`.

---

### 6.6 `LeagueDashboardCard.tsx`

Self-contained — fetches its own data on mount. Do not pass league data down from `DashboardContent`.

**Mount sequence:**

```typescript
// 1. Check visibility gate — do this ONCE, store in state
const visible = await ParkrunLeagueService.isLeagueVisible();
if (!visible) return; // render nothing

// 2. Fetch data in parallel
const [league, latestEntry, position] = await Promise.all([
  ParkrunLeagueService.getActiveLeague(),
  ParkrunLeagueService.getMyLatestEntry(leagueId),      // after league resolves
  ParkrunLeagueService.getMyLeaderboardPosition(leagueId),
]);
```

> `isLeagueVisible()` is called once here — not inside each service method. This avoids 3 redundant DB access_level checks on mount.

**Display states:**

| State | Display |
|---|---|
| `visible = false` | Return null — card does not render |
| No active league | Return null |
| Loading | Spinner/skeleton consistent with other dashboard cards |
| Not entered | "Parkrun League: Not entered" + "Join" button calling `onNavigate('leagues-submit')` |
| Entry pending | "Parkrun League: Position —, {age_grade}% *(Awaiting approval)*" |
| Entry approved, has rank | "Parkrun League: `<RankArrow>` Position {rank}, {age_grade}%" + action buttons |
| Entry rejected | "Parkrun League: Entry not approved" + "Resubmit" button calling `onNavigate('leagues-submit')` |

**Navigation buttons per league row** (call `onNavigate` — not `<Link>` components):
- "Submit a new result" → `onNavigate('leagues-submit')`
- "View league table" → `onNavigate('leagues')`

**`onNavigate` prop:** `LeagueDashboardCard` receives `onNavigate` as a prop passed down from `DashboardContent`. This is unavoidable given the app's navigation architecture — the "self-contained" goal applies to data fetching, not navigation callbacks.

Use existing `card`, `card-header`, `card-title`, `card-content` CSS classes consistent with other dashboard cards. Add any new classes to `leagues.css`. No inline styles.

---

## 7. Pages

### 7.1 `LeaguePage.tsx` — page id: `'leagues'`

All users who reach this page are authenticated (the app wraps all internal pages behind auth). No unauthenticated state is required.

1. Fetch active league on mount: `getActiveLeague()`
2. If null, render empty state: "No active league at the moment"
3. Fetch leaderboard: `getLeaderboard(league.id)`
4. Call `getMyLatestEntry(league.id)` → pass to `<MyLeagueStatus />`
5. Render `<MyLeagueStatus onNavigate={onNavigate} />` above the table
6. Render `<LeagueTable rows={leaderboard} />`
7. "Submit a New Entry" button → `onNavigate('leagues-submit')`

---

### 7.2 `SubmitEntryPage.tsx` — page id: `'leagues-submit'`

All users who reach this page are authenticated. No redirect needed — auth is handled by the app wrapper.

1. Fetch active league and saved athlete ID in parallel on mount
2. Pre-populate `parkrun_athlete_id` field if cached value exists
3. Render `<SubmitEntryForm />`
4. On successful submit show success state — **do not navigate away**: *"Entry submitted — an admin will review it shortly. You will be notified if there is a problem."*
5. Include "Back to League" button → `onNavigate('leagues')`

---

### 7.3 `AdminLeaguePage.tsx` — page id: `'admin-leagues'`

1. Check `access_level` from existing auth context — render "Access denied" if not admin
2. Fetch pending entries on mount: `getPendingEntries()`
3. Show count badge on the **page header**: "X entries awaiting review" (not in the Sidebar nav)
4. Render `<PendingEntryCard />` per entry — pass `leagueId` through so `reviewEntry` receives it
5. Empty state when queue is clear: "No entries awaiting review ✓"

---

## 8. Dashboard Integration

### 8.1 Card placement in `DashboardContent.tsx`

The current card render order is:
1. Recent Notifications
2. 7-Day LIRF Assignment Look-Ahead *(admin/LIRF only)*
3. Your Upcoming Runs
4. **Quick Stats** ← insert league card after this
5. *(new)* **`<LeagueDashboardCard />`**
6. Your Profile
7. EA Membership

**Do not refactor or restructure `DashboardContent.tsx`.** Add the import and the single component insertion only.

```typescript
// Add import at top of DashboardContent.tsx
import { LeagueDashboardCard } from '../../leagues/components/LeagueDashboardCard';

// Insert after the Quick Stats card in the render output
// DashboardContent receives onNavigate — pass it through to the card
<LeagueDashboardCard onNavigate={onNavigate} />
```

The visibility gate lives inside `LeagueDashboardCard` itself — `DashboardContent` needs no conditional logic.

---

## 9. Navigation & Routing

> **Architecture note:** This app does not use React Router for internal navigation. All page routing is handled via a `currentPage` string state with a `switch` statement in `AppContent.tsx`. Navigation happens via `onNavigate('page-id')` callbacks passed through the component tree from `Sidebar.tsx`.

Make these changes last — only after all pages are confirmed working locally on the feature branch.

### 9.1 `AppContent.tsx` — add switch cases

Find the existing `switch (currentPage)` statement and add three new cases. Do not restructure the switch:

```typescript
case 'leagues':
  return <LeaguePage onNavigate={onNavigate} />;

case 'leagues-submit':
  return <SubmitEntryPage onNavigate={onNavigate} />;

case 'admin-leagues':
  return <AdminLeaguePage onNavigate={onNavigate} />;
```

Add the corresponding imports at the top of `AppContent.tsx`.

### 9.2 `Sidebar.tsx` — add nav items

Add to the main nav array (visible to all authenticated users):

```typescript
{ id: 'leagues', label: 'League', icon: /* appropriate existing icon */ }
```

Add to the admin nav section:

```typescript
{ id: 'admin-leagues', label: 'League Review', icon: /* appropriate existing icon */ }
```

> **Pending count badge:** Do not add data fetching to the Sidebar. The pending count is shown on the `AdminLeaguePage` header instead (Section 7.3). Keep the Sidebar nav item simple with no badge.

### 9.3 `onNavigate` prop threading

The following components require `onNavigate` as a prop because they contain navigation actions. This is unavoidable given the app's architecture:

| Component | Receives `onNavigate` from |
|---|---|
| `LeaguePage` | `AppContent` via switch case |
| `SubmitEntryPage` | `AppContent` via switch case |
| `AdminLeaguePage` | `AppContent` via switch case |
| `MyLeagueStatus` | `LeaguePage` props |
| `LeagueDashboardCard` | `DashboardContent` props |

All navigation calls use `onNavigate('page-id')` — never `<Link to="...">` or `window.location`.

---

## 10. Implementation Order

Work on a feature branch (e.g. `feature/club-leagues`). Do not merge to main until all steps verified.

1. Run Section 1.1 SQL in Supabase (create tables + seed league row)
2. Run Section 1.2 RLS policies
3. Create `src/modules/leagues/types/index.ts`
4. Create `src/modules/leagues/services/ParkrunLeagueService.ts` — implement all methods
5. **Security test:** call `submitEntry()` directly with a SQL injection payload — must throw before reaching Supabase
6. Create `leagues.css` with arrow classes and any card classes needed
7. Create `RankArrow.tsx`
8. Create `LeagueTable.tsx` — test with hardcoded mock data
9. Create `MyLeagueStatus.tsx` — test all four status states (pending / approved / rejected / no entry)
10. Create `PendingEntryCard.tsx` — test approve and reject flows
11. Create `SubmitEntryForm.tsx` — test all validation boundary cases:
    - age grade = 0, age grade = 101
    - date in future, date in current year but event_date > 6 months ago
    - malformed MM:SS (e.g. `25:61`, `abc`, `5:3`)
    - SQL injection string in event_name and athlete_id fields
12. Create `LeagueDashboardCard.tsx`
13. Assemble `LeaguePage.tsx`
14. Assemble `SubmitEntryPage.tsx`
15. Assemble `AdminLeaguePage.tsx`
16. Add `<LeagueDashboardCard />` to `DashboardContent.tsx` (Section 8.1)
17. Add switch cases to `AppContent.tsx` (Section 9.1)
18. Add nav items to `Sidebar.tsx` (Section 9.2)
19. **E2E test:** submit → pending → admin approve → appears on leaderboard → rank written to DB
20. **E2E test:** approve second entry with higher age grade → position 1 changes → arrows correct
21. **E2E test:** submit → reject with note → in-app notification received → email received → rejection note visible to member
22. **E2E test:** set `rank_updated_at` to 8 days ago → arrow shows dash
23. **E2E test:** set a test entry's `event_date` to 7 months ago → disappears from leaderboard, remains in member year history
24. **Gate test:** non-admin user → league card does not appear on dashboard, league page returns empty leaderboard
25. **Gate test:** admin user → full league experience end-to-end

---

## 11. Pre-Launch Release Checklist

When ready to release leagues to all users:

- [ ] In `ParkrunLeagueService.ts`, find the comment `// PRE-LAUNCH: remove this block on release`
- [ ] Delete the 5-line access_level check block (leave only `return true`)
- [ ] No other files need changing
- [ ] Verify a non-admin member can see the dashboard card and navigate to the league page

---

## 12. Phase 2 Note — Season Points League

When Phase 2 is built, create a new dedicated table (e.g. `race_points_entries`) with its own schema for multi-race season points. The `leagues` registry table already supports `type = 'season_points'`. A new `RacePointsLeagueService` and new page components will be added under `src/modules/leagues/` alongside the existing parkrun files. No Phase 1 code should need modification.

---

## 13. Key Design Decisions

| Decision | Rationale |
|---|---|
| Leaderboard shows latest submitted, not best ever | Rewards current form, not a historic peak |
| 6-month expiry on `event_date` | Honest measure — can't resubmit old result to stay on the board |
| All entries preserved | Full audit trail; history view built from filters only |
| Separate table per league type | Avoids awkward shared schema for different data shapes |
| Every submission requires approval | Consistent — no special-case first-time logic |
| Rank stored on entry row, not a snapshot table | No join needed to show rank on dashboard |
| `recalculateRanks` on approval, not cron | Immediate consistency after any approval |
| 7-day arrow reset via `rank_updated_at` | Avoids stale arrows on a quiet leaderboard |
| `isLeagueVisible()` called once per component mount | Avoids redundant DB calls — component holds the result in state |
| Pre-launch gate in service layer | Single removal point — one block to delete, no UI or config needed |
| `getRankMovement` accepts `RankFields` (Pick type) | No cast required from partial selects |
| Arrow colours use CSS variables from `variables.css` | Consistent with design system — `--success-color`, `--danger-color`, `--gray-500` |
| No inline styles anywhere | All styling via CSS classes in `leagues.css` |
