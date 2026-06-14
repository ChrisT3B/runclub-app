# Work Package: Parkrun Improvement Tracking (Admin Only)

## Objective
Implement automatic age grade improvement tracking for the Parkrun League, running Dec–Nov each year. Improvement is calculated per member using a rolling baseline rule. Results are stored in a new table, visible to admins only, with a CSV export. Members do not see this data yet.

---

## Background — The Improvement Rule
1. A member's **first approved entry in the league year** sets their baseline — no improvement recorded
2. Each subsequent approved entry is compared against the **current baseline**:
   - If new AG% **> baseline**: `delta = new - baseline`, add to `total_improvement`, reset baseline to new AG%
   - If new AG% **<= baseline**: no improvement recorded, reset baseline to new AG% (so future recovery is measured from the trough)
3. Members who drop out and return get a new baseline on return — no improvement for the gap
4. The league year runs **1st December to 30th November**

This has been validated against test data including steady improvement, drop-and-recover, and drop-out-and-return scenarios.

---

## Phase 1 — Database (SQL in Supabase Editor)

### Step 1 — Create the improvement league record
```sql
INSERT INTO leagues (name, type, is_active, start_date, end_date)
VALUES (
  'Parkrun Improvement League 2025-26',
  'parkrun_improvement',
  true,
  '2025-12-01',
  '2026-11-30'
)
RETURNING id;
```
Note the returned UUID — it is referred to as `IMPROVEMENT_LEAGUE_ID` throughout this work package.

### Step 2 — Create the `parkrun_improvement_entries` table
```sql
CREATE TABLE parkrun_improvement_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  parkrun_entry_id uuid NOT NULL REFERENCES parkrun_league_entries(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_date date NOT NULL,
  age_grade_percent numeric(5,2) NOT NULL,
  baseline_at_submission numeric(5,2) NOT NULL,
  improvement_delta numeric(5,2) NOT NULL DEFAULT 0,
  cumulative_improvement numeric(5,2) NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, parkrun_entry_id)
);
```

### Step 3 — RLS policies
```sql
ALTER TABLE parkrun_improvement_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "improvement_admin_all"
ON parkrun_improvement_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = auth.uid()
    AND members.access_level = 'admin'
  )
);
```

### Step 4 — RPC for name resolution
```sql
-- Already exists as get_member_names — no action needed
```

---

## Phase 2 — Service (`ParkrunImprovementService.ts`)

Create `src/modules/leagues/services/ParkrunImprovementService.ts`.

### Constants
```ts
export const IMPROVEMENT_LEAGUE_ID = '<paste UUID from Step 1>';
export const IMPROVEMENT_LEAGUE_YEAR_START = '2025-12-01';
export const IMPROVEMENT_LEAGUE_YEAR_END = '2026-11-30';
```

### Method: `recalculateImprovement(userId: string)`
This is the core method. It must:

1. Fetch all approved `parkrun_league_entries` for this user in the parkrun leaderboard league (`bdd0da90-ce7a-497c-b5a9-084bce466f9d`), where `event_date` is between `IMPROVEMENT_LEAGUE_YEAR_START` and `IMPROVEMENT_LEAGUE_YEAR_END`, ordered by `event_date ASC` then `submitted_at ASC`

2. If no entries found, delete any existing improvement entries for this user and return

3. Replay the baseline logic in order:
```ts
let baseline: number | null = null;
let cumulative = 0;

for (const entry of entries) {
  let delta = 0;

  if (baseline === null) {
    // First entry — set baseline, no improvement
    baseline = entry.age_grade_percent;
  } else {
    if (entry.age_grade_percent > baseline) {
      delta = Math.round((entry.age_grade_percent - baseline) * 100) / 100;
      cumulative = Math.round((cumulative + delta) * 100) / 100;
    }
    baseline = entry.age_grade_percent; // always reset baseline
  }

  improvementRows.push({
    league_id: IMPROVEMENT_LEAGUE_ID,
    user_id: userId,
    parkrun_entry_id: entry.id,
    event_name: entry.event_name,
    event_date: entry.event_date,
    age_grade_percent: entry.age_grade_percent,
    baseline_at_submission: baseline,
    improvement_delta: delta,
    cumulative_improvement: cumulative,
  });
}
```

4. Delete existing improvement entries for this user in this league, then insert the new rows

### Method: `getImprovementReport()`
Returns all members' improvement data for the admin report:
```ts
// Fetch all improvement entries for the league
// Join to get member names via get_member_names RPC
// Return sorted by cumulative_improvement DESC, then by member name
// Shape: Array<{
//   user_id: string,
//   member_name: string,
//   entries: Array<{
//     event_name, event_date, age_grade_percent,
//     baseline_at_submission, improvement_delta, cumulative_improvement
//   }>,
//   total_improvement: number  // last entry's cumulative_improvement
// }>
```

### Method: `exportCSV()`
Calls `getImprovementReport()` then formats as CSV:
```
Member,Event,Date,AG%,Baseline,Delta,Cumulative Total
Andy Brown,Stratford Upon Avon,25/04/2026,78.48,66.00,+12.48,12.48
Andy Brown,Arrow Valley,09/05/2026,79.00,78.48,+0.52,13.00
...
```
Triggers a browser download using a Blob URL.

---

## Phase 3 — Hook into Approval Workflow

In `ParkrunLeagueService.ts`, in the method that handles entry approval (where `recalculateRanks()` is called), add a call to `recalculateImprovement` after ranks are updated:

```ts
// After recalculateRanks(leagueId):
await ParkrunImprovementService.recalculateImprovement(entry.user_id);
```

---

## Phase 4 — Admin UI Component

Create `src/modules/leagues/components/ParkrunImprovementReport.tsx`.

This is an admin-only component. It must:

- Call `getImprovementReport()` on mount
- Show a table with columns: Rank | Member | Total Improvement | Entries
- "Entries" expands inline (like the mobile leaderboard pattern) to show each submission with date, event, AG%, baseline, delta, running total
- A "Export CSV" button at the top right calls `exportCSV()`
- Show a loading state while fetching
- No member-facing UI — this component is only rendered for admins

### Wire up in `LeaguePage.tsx`
In the admin section of `LeaguePage`, add a tab or section for "Improvement Report" that renders `<ParkrunImprovementReport />` when the user is an admin.

---

## Phase 5 — Historic Data Backfill

After the above is deployed and tested, run a one-time backfill by calling `recalculateImprovement` for every member who has approved entries in the Dec 2025–Nov 2026 window. This can be triggered via a temporary admin button "Recalculate All Improvement Data" that loops through all unique `user_id`s in `parkrun_league_entries` and calls the service method for each.

The backfill button can be removed after the first successful run.

---

## Files to Create
- `src/modules/leagues/services/ParkrunImprovementService.ts`
- `src/modules/leagues/components/ParkrunImprovementReport.tsx`

## Files to Modify
- `src/modules/leagues/services/ParkrunLeagueService.ts` — add `recalculateImprovement` call in approval handler
- `src/modules/leagues/pages/LeaguePage.tsx` — add improvement report section for admins

## Files to Leave Untouched
Everything else — no CSS changes, no sidebar, no member-facing components, no race league files.

---

## Coding Standards
- No inline styles — all styling via CSS variables and existing classes in `leagues.css`
- No `!important`
- No Tailwind
- Lucide React for any icons
- TypeScript — no `any` where avoidable
- Clean `npm run build` before committing

---

## Acceptance Criteria
- SQL table created with correct schema and RLS (admin only)
- `recalculateImprovement()` correctly calculates baseline, delta, and cumulative for all three scenarios: steady improvement, drop-and-recover, drop-out-and-return
- Improvement data is recalculated automatically when an entry is approved
- Admin report shows all members ranked by total improvement with expandable entry detail
- CSV export downloads correctly with all columns
- No member-facing UI changes
- TypeScript compiles without errors
- Existing leaderboard and approval workflow unchanged
