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

## Phase 1 — Database ✅ COMPLETE (run by Chris in Supabase editor)

- `leagues_type_check` constraint updated to include `'parkrun_improvement'`
- Improvement league record inserted: **`fee39efa-a3bc-4cf7-8460-ed39c87a6ce2`**
- `parkrun_improvement_entries` table created
- RLS enabled, admin-only policy `improvement_admin_all` created

---

## Phase 2 — Service (`ParkrunImprovementService.ts`)

Create `src/modules/leagues/services/ParkrunImprovementService.ts`.

### Constants
```ts
export const IMPROVEMENT_LEAGUE_ID = 'fee39efa-a3bc-4cf7-8460-ed39c87a6ce2';
export const PARKRUN_LEAGUE_ID = 'bdd0da90-ce7a-497c-b5a9-084bce466f9d';
export const IMPROVEMENT_LEAGUE_YEAR_START = '2025-12-01';
export const IMPROVEMENT_LEAGUE_YEAR_END = '2026-11-30';
```

### Method: `recalculateImprovement(userId: string)`
This is the core method. It must:

1. Fetch all approved `parkrun_league_entries` for this user in `PARKRUN_LEAGUE_ID`, where `event_date` is between `IMPROVEMENT_LEAGUE_YEAR_START` and `IMPROVEMENT_LEAGUE_YEAR_END`, ordered by `event_date ASC` then `submitted_at ASC`

2. If no entries found, delete any existing improvement entries for this user in `IMPROVEMENT_LEAGUE_ID` and return

3. Replay the baseline logic in order:
```ts
let baseline: number | null = null;
let cumulative = 0;
const improvementRows = [];

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

4. Delete existing improvement entries for this user in `IMPROVEMENT_LEAGUE_ID`, then insert the new rows

### Method: `getImprovementReport()`
Returns all members' improvement data for the admin report:
```ts
// Fetch all improvement entries for IMPROVEMENT_LEAGUE_ID
// Get unique user_ids, resolve names via get_member_names RPC
// Group entries by user_id
// Return sorted by total_improvement DESC, then member name ASC
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

In `ParkrunLeagueService.ts`, in the method that handles entry approval (where `recalculateRanks()` is called), add a call to `recalculateImprovement` after ranks are updated. **Wrap in try/catch so a failure here never blocks or rolls back an approval:**

```ts
// After recalculateRanks(leagueId):
try {
  await ParkrunImprovementService.recalculateImprovement(entry.user_id);
} catch (err) {
  console.error('recalculateImprovement failed (non-blocking):', err);
}
```

---

## Phase 4 — Admin UI

### New page: `src/modules/leagues/pages/ParkrunImprovementReportPage.tsx`

This is an admin-only page. It must:

- Be gated on `permissions.canManageMembers` (consistent with `AdminLeaguePage.tsx:35`) — redirect or show nothing if not admin
- Call `getImprovementReport()` on mount
- Show a summary table: Rank | Member | Total Improvement
- Each row is expandable (tap/click) to show the member's full entry breakdown: Date | Event | AG% | Baseline | Delta | Running Total
- Use the same expandable row pattern as the mobile leaderboard (`data-expanded`, chevron icon)
- "Export CSV" button top-right calls `exportCSV()`
- "Recalculate All" button top-right (beside Export CSV) — triggers a backfill loop over all unique `user_id`s in `parkrun_league_entries` for `PARKRUN_LEAGUE_ID`, calling `recalculateImprovement` for each. Shows a loading spinner while running. This is the one-time backfill mechanism and can remain permanently as an admin tool for resyncing data.
- Loading state while fetching

### Wire up in `LeagueAdminHubPage.tsx`
Add an "Improvement Report" card to `LeagueAdminHubPage` following the existing card pattern, navigating to `'admin-league-improvement'`.

### New route in `AppContent.tsx`
Add a new case to the switch statement:
```ts
case 'admin-league-improvement':
  return <ParkrunImprovementReportPage onNavigate={onNavigate} permissions={permissions} />;
```

---

## Files to Create
- `src/modules/leagues/services/ParkrunImprovementService.ts`
- `src/modules/leagues/pages/ParkrunImprovementReportPage.tsx`

## Files to Modify
- `src/modules/leagues/services/ParkrunLeagueService.ts` — add try/catch wrapped `recalculateImprovement` call in approval handler
- `src/modules/leagues/pages/LeagueAdminHubPage.tsx` — add Improvement Report card
- `src/AppContent.tsx` — add `'admin-league-improvement'` case

## Files to Leave Untouched
- `LeaguePage.tsx` — member-facing, do not touch
- All race league files
- All CSS files (use existing classes in `leagues.css`)
- All other components and services

---

## Coding Standards
- No inline styles — all styling via CSS variables and existing classes in `leagues.css`
- No `!important`
- No Tailwind
- Lucide React for any icons (`ChevronDown`, `ChevronUp`, `Download`, `RefreshCw`)
- TypeScript — no `any` where avoidable
- Clean `npm run build` before committing

---

## Acceptance Criteria
- `recalculateImprovement()` correctly calculates baseline, delta, and cumulative for all three scenarios: steady improvement, drop-and-recover, drop-out-and-return
- A failure in `recalculateImprovement` does not block or roll back entry approval
- Improvement data is recalculated automatically when an entry is approved
- Admin report page is accessible from `LeagueAdminHubPage` and gated on `permissions.canManageMembers`
- Report shows all members ranked by total improvement with expandable entry detail
- "Recalculate All" button triggers a full backfill and shows loading state
- CSV export downloads correctly with all columns
- No member-facing UI changes
- New route `'admin-league-improvement'` added to `AppContent.tsx`
- TypeScript compiles without errors
- Existing leaderboard and approval workflow unchanged
