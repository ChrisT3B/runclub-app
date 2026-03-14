# Club Leagues — Additions Work Package

> **Supplements:** Club Leagues Work Package v2  
> **Format:** Markdown (for Claude Code handoff)  
> **Date:** March 2026  
> **Covers:** Dashboard card · Movement arrows · Pre-launch admin gate · Rank snapshot logic

---

## Overview of Changes

This document adds three features to the Club Leagues system defined in the main work package. No previously specified behaviour changes — this is purely additive.

| Addition | Affects |
|---|---|
| Dashboard league card | New component + DashboardContent.tsx |
| Movement arrows (↑ ↓ —) | LeagueTable.tsx + DB schema + reviewEntry() |
| Pre-launch admin gate | ParkrunLeagueService.ts (one line, removable) |

---

## 1. Database Schema Changes

### 1.1 Add columns to `parkrun_league_entries`

Two new nullable columns are required. Add them to the existing table — do not recreate it.

```sql
ALTER TABLE parkrun_league_entries
  ADD COLUMN IF NOT EXISTS current_rank  INTEGER,
  ADD COLUMN IF NOT EXISTS last_rank     INTEGER,
  ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ;
```

**Column definitions:**

| Column | Type | Purpose |
|---|---|---|
| `current_rank` | INTEGER, nullable | This member's rank on the current leaderboard |
| `last_rank` | INTEGER, nullable | Their rank before the most recent recalculation |
| `rank_updated_at` | TIMESTAMPTZ, nullable | When current_rank was last written — used for the 7-day arrow reset |

**How the arrow is derived (frontend logic):**

```
if rank_updated_at is null OR now() - rank_updated_at > 7 days → show dash
if last_rank is null → show dash (new entrant, no previous position)
if current_rank < last_rank  → green up arrow   (lower number = better position)
if current_rank > last_rank  → red down arrow
if current_rank === last_rank → dash
```

> **Note:** Rank 1 is the top position. A move from rank 3 → rank 1 means `current_rank (1) < last_rank (3)` → up arrow. This is intentional.

---

## 2. Rank Recalculation — `recalculateRanks(leagueId)`

Add this **private static method** to `ParkrunLeagueService`. It is called inside `reviewEntry()` immediately after an entry is approved — not exported, not called from anywhere else.

```typescript
private static async recalculateRanks(leagueId: string): Promise<void> {
  // 1. Fetch the current leaderboard (approved entries within 6-month event_date window)
  //    Same query logic as getLeaderboard() — reuse or extract shared query
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

  // 2. De-duplicate: one entry per user (most recent submitted_at)
  const seen = new Set<string>();
  const active = (data ?? []).filter(e => {
    if (seen.has(e.user_id)) return false;
    seen.add(e.user_id);
    return true;
  });

  // 3. Sort by age_grade_percent DESC to determine new ranks
  active.sort((a, b) => b.age_grade_percent - a.age_grade_percent);

  // 4. Write new current_rank and promote old current_rank → last_rank
  const now = new Date().toISOString();
  const updates = active.map((entry, i) => ({
    id:              entry.id,
    last_rank:       entry.current_rank ?? null,   // preserve previous rank
    current_rank:    i + 1,                         // new rank (1-based)
    rank_updated_at: now,
  }));

  // 5. Upsert each row — Supabase doesn't support bulk update with different values,
  //    so loop with individual updates. For ~70 members this is acceptable.
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('parkrun_league_entries')
      .update({
        last_rank:       update.last_rank,
        current_rank:    update.current_rank,
        rank_updated_at: update.rank_updated_at,
      })
      .eq('id', update.id);

    if (updateError) {
      console.error(`recalculateRanks update failed for entry ${update.id}:`, updateError);
    }
  }

  console.log(`✅ Ranks recalculated for league ${leagueId} — ${updates.length} entries updated`);
}
```

### 2.1 Call site — inside `reviewEntry()`

Add a single call at the end of the approval branch, **after** the status update succeeds:

```typescript
// Inside reviewEntry(), after the .update() call succeeds:
if (decision === 'approved') {
  await ParkrunLeagueService.recalculateRanks(leagueId);
  // Note: leagueId must be passed into reviewEntry() — add it to the method signature
}
```

> **Method signature change:** `reviewEntry()` needs `leagueId` added as a parameter so it can pass it to `recalculateRanks()`. Update the call site in `AdminLeaguePage.tsx` accordingly.

Updated signature:
```typescript
static async reviewEntry(
  entryId:    string,
  leagueId:   string,          // ← add this
  decision:   'approved' | 'rejected',
  adminNotes?: string
): Promise<void>
```

---

## 3. TypeScript Types — Additions

Add these fields to `ParkrunLeagueEntry` in `src/modules/leagues/types/index.ts`:

```typescript
export interface ParkrunLeagueEntry {
  // ... existing fields unchanged ...

  // Rank tracking (nullable until first recalculation)
  current_rank:     number | null;
  last_rank:        number | null;
  rank_updated_at:  string | null;
}
```

Add a derived type for the arrow indicator — used by `LeagueTable` and the dashboard card:

```typescript
export type RankMovement = 'up' | 'down' | 'none';

export function getRankMovement(entry: ParkrunLeagueEntry): RankMovement {
  if (!entry.rank_updated_at) return 'none';
  if (!entry.last_rank)       return 'none';

  // Reset to dash if rank_updated_at is older than 7 days
  const updatedAt = new Date(entry.rank_updated_at);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (updatedAt < sevenDaysAgo) return 'none';

  if (entry.current_rank! < entry.last_rank) return 'up';
  if (entry.current_rank! > entry.last_rank) return 'down';
  return 'none';
}
```

> Export `getRankMovement` from `types/index.ts`. Both `LeagueTable` and the dashboard card import and use it — do not duplicate the logic.

---

## 4. LeagueTable.tsx — Arrow Column

### 4.1 Add a trend column

Update the table columns to include a leading trend indicator column:

| Column order | Header | Content |
|---|---|---|
| 1 | ↕ (no header text) | Lucide arrow icon or dash |
| 2 | Rank | `current_rank` |
| 3 | Name | member full name |
| 4 | parkrun | event name |
| 5 | Date | event_date DD/MM/YYYY |
| 6 | Time | finish_time |
| 7 | Age Grade % | age_grade_percent, right-aligned |

### 4.2 Arrow rendering

Import from Lucide React:
```typescript
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
```

Create a small inline component — do not put this logic in the table row directly:

```typescript
function RankArrow({ entry }: { entry: LeaderboardRow }) {
  const movement = getRankMovement(entry);
  if (movement === 'up')   return <TrendingUp  size={16} className="league-arrow league-arrow--up" />;
  if (movement === 'down') return <TrendingDown size={16} className="league-arrow league-arrow--down" />;
  return <Minus size={16} className="league-arrow league-arrow--none" />;
}
```

Add the following to `src/modules/leagues/leagues.css` (create the file if it does not exist yet). Use the existing project colour values — check the project CSS for the correct success green, error red, and muted grey values already in use elsewhere and apply them here. Do not hardcode hex values:

```css
.league-arrow--up   { color: var(--success-color); }
.league-arrow--down { color: var(--error-color); }
.league-arrow--none { color: var(--muted-color); }
```

> The exact CSS variable names (`--success-color`, `--error-color`, `--muted-color`) are placeholders — check the existing project CSS files for the correct names already defined and use those. Do not introduce new variable names if equivalent ones already exist.

---

## 5. Dashboard League Card

### 5.1 New component — `LeagueDashboardCard.tsx`

**Location:** `src/modules/leagues/components/LeagueDashboardCard.tsx`

This component is self-contained — it fetches its own data on mount. Do not pass leaderboard data down from DashboardContent — the dashboard already has enough data fetching responsibilities.

**Data it needs to fetch on mount:**
1. `ParkrunLeagueService.getActiveLeague()` — to know if a league exists
2. `ParkrunLeagueService.getMyLatestEntry(leagueId)` — the member's current entry (any status)
3. `ParkrunLeagueService.getMyLeaderboardPosition(leagueId)` — see Section 5.2

**Display states:**

| State | What to show |
|---|---|
| Loading | Skeleton / spinner consistent with other dashboard cards |
| No active league | Nothing — return null (card doesn't render) |
| Not entered | Card with heading "Club Leagues" + one row per active league showing "Not entered — [Join the Parkrun League →]" link to /leagues/submit |
| Entry pending | "Parkrun League: Position —, ##.##% (Awaiting approval)" |
| Entry approved, has rank | "Parkrun League: Position ##, ##.##%" + RankArrow + links |
| Entry rejected | "Parkrun League: Entry not approved — [Resubmit →]" |

**Links within the card (per league row):**
- "Submit a new result" → `/leagues/submit`
- "View league table" → `/leagues`

**Card structure:**

```tsx
<div className="card">                          {/* existing card class */}
  <div className="card-header">
    <h3 className="card-title">Club Leagues</h3>
  </div>
  <div className="card-content">
    {/* One row per active league */}
    <div className="league-card-row">
      <span className="league-card-name">Parkrun League:</span>
      <RankArrow entry={latestEntry} />
      <span className="league-card-position">Position {currentRank ?? '—'}, {ageGrade}%</span>
      {isPending && <span className="league-card-pending">Awaiting approval</span>}
      <div className="league-card-actions">
        <Link to="/leagues/submit">Submit a new result</Link>
        <Link to="/leagues">View league table</Link>
      </div>
    </div>
  </div>
</div>
```

> Match the CSS class patterns used in other dashboard cards. Do not introduce inline styles. Add any new classes needed to the existing leagues CSS file (create `src/modules/leagues/leagues.css` if it doesn't exist yet).

### 5.2 New service method — `getMyLeaderboardPosition(leagueId)`

Add to `ParkrunLeagueService`:

```typescript
static async getMyLeaderboardPosition(leagueId: string): Promise<{
  current_rank: number | null;
  age_grade_percent: number | null;
  movement: RankMovement;
} | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  // Find the user's entry that currently holds a rank
  // (the one written by the most recent recalculateRanks call)
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

  return {
    current_rank:      data.current_rank,
    age_grade_percent: data.age_grade_percent,
    movement:          getRankMovement(data as ParkrunLeagueEntry),
  };
}
```

### 5.3 Add card to DashboardContent.tsx

> **Important:** Do not refactor or restructure DashboardContent.tsx. Add the card insertion only.

Find the section in DashboardContent.tsx where the existing dashboard cards are rendered. Add `<LeagueDashboardCard />` as a new card in that grid — position it after the existing member stats card, before any LIRF-specific cards.

Import at the top of the file:
```typescript
import { LeagueDashboardCard } from '../../leagues/components/LeagueDashboardCard';
```

The component is gated by the pre-launch check (Section 6) inside `LeagueDashboardCard` itself — DashboardContent does not need any conditional logic.

---

## 6. Pre-Launch Admin Gate

### 6.1 Where the gate lives

The gate is a single check at the top of any service method that returns league data to the frontend. It lives in `ParkrunLeagueService` — **not** in the components, and **not** in the router.

Add this private static helper to `ParkrunLeagueService`:

```typescript
private static async isLeagueVisible(): Promise<boolean> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return false;

  // PRE-LAUNCH: leagues visible to admins only.
  // TO RELEASE: delete the next 5 lines (leave `return true`)
  const { data } = await supabase
    .from('members')
    .select('access_level')
    .eq('id', user.id)
    .single();
  if (data?.access_level !== 'admin') return false;
  // END PRE-LAUNCH BLOCK

  return true;
}
```

### 6.2 Apply the gate

Call `isLeagueVisible()` at the top of these public methods — return an empty/null result immediately if false:

| Method | Return if not visible |
|---|---|
| `getActiveLeague()` | `return null` |
| `getLeaderboard()` | `return []` |
| `getMyLatestEntry()` | `return null` |
| `getMyLeaderboardPosition()` | `return null` |
| `getMyEntries()` | `return []` |

Example pattern:
```typescript
static async getActiveLeague(): Promise<League | null> {
  if (!(await ParkrunLeagueService.isLeagueVisible())) return null;
  // ... rest of method unchanged
}
```

> `submitEntry()`, `getPendingEntries()`, and `reviewEntry()` do **not** need the gate — submit should remain open to all authenticated users in testing, and the admin methods are already access_level-gated via RLS.

### 6.3 Releasing to all users

When ready to release, delete lines marked `// PRE-LAUNCH` through `// END PRE-LAUNCH BLOCK` in `isLeagueVisible()`, leaving only `return true`. No other files need changing.

---

## 7. Updated `getLeaderboard()` — return rank columns

The existing `getLeaderboard()` query needs to include the new rank columns so `LeagueTable` can display them:

Update the `.select()` call:
```typescript
.select('*, current_rank, last_rank, rank_updated_at, members!inner(full_name)')
```

These columns are already on the table after Section 1.1 — the select just needs to include them explicitly.

---

## 8. Implementation Order (additions only)

Follow this order — it builds on top of the main work package implementation order, not instead of it.

1. Run the `ALTER TABLE` SQL from Section 1.1
2. Update `ParkrunLeagueEntry` type with new fields (Section 3)
3. Add `getRankMovement()` to `types/index.ts` (Section 3)
4. Add `recalculateRanks()` private method to `ParkrunLeagueService` (Section 2)
5. Update `reviewEntry()` signature to accept `leagueId` and call `recalculateRanks()` (Section 2.1)
6. Update call site in `AdminLeaguePage.tsx` to pass `leagueId` to `reviewEntry()`
7. Add `isLeagueVisible()` helper and apply gate to relevant methods (Section 6)
8. Add `getMyLeaderboardPosition()` to `ParkrunLeagueService` (Section 5.2)
9. Update `getLeaderboard()` select to include rank columns (Section 7)
10. Add `RankArrow` component and trend column to `LeagueTable.tsx` (Section 4)
11. Create `LeagueDashboardCard.tsx` (Section 5.1)
12. Add `<LeagueDashboardCard />` to `DashboardContent.tsx` (Section 5.3)
13. **Test:** Approve an entry → verify `recalculateRanks` runs → verify `current_rank` written to DB
14. **Test:** Approve a second entry with a higher age grade → verify position 1 changes → verify arrows correct
15. **Test:** Set `rank_updated_at` to 8 days ago on a test entry → verify arrow shows dash
16. **Test:** Non-admin user → verify league card does not appear on dashboard, league page returns empty
17. **Test:** Admin user → verify full league experience end-to-end

---

## 9. Key Design Decisions

| Decision | Rationale |
|---|---|
| Rank stored on entry row, not a separate snapshot table | Simplest schema — no join needed to show rank on dashboard |
| `recalculateRanks` called on approval, not on a cron | Immediate consistency — leaderboard is always current after any approval action |
| 7-day arrow reset via `rank_updated_at` | Avoids stale arrows persisting indefinitely if the leaderboard is quiet |
| Gate in service layer, not router or components | Single removal point — one block of code to delete at launch |
| `LeagueDashboardCard` fetches its own data | Keeps DashboardContent clean — no extra props or state threading required |
| Arrow colours use CSS variables | Consistent with design system — no hardcoded hex in components |

