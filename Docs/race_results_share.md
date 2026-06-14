# Work Package: Share Individual Race Results

## Objective
Extend the existing `LeagueShareModal` / `LeagueShareCard` infrastructure to support sharing individual race results from the Race League. Admins can select a race, preview the results card (split by gender), and export as PNG or copy as text.

---

## Background
The existing share infrastructure (`LeagueShareCard`, `LeagueShareModal`, `LeagueShareData`) was built generically and can be reused without modification. This work package only adds:
1. A "Share Results" button on `AdminRaceLeaguePage.tsx` per locked race
2. A data-fetch helper that calls `RaceLeagueService.getRaceEntries(raceId)` and maps results to `LeagueShareData`
3. The modal already handles male/female toggle from the standings implementation — reuse that pattern

---

## Key Facts from Codebase
- `RaceLeagueService.getRaceEntries(raceId)` returns `RaceLeagueEntry[]` ordered by `finish_time ASC`, with `member_name` resolved via `get_member_names` RPC
- `RaceLeagueEntry` has: `user_id`, `gender` (`'male' | 'female'`), `finish_time` (HH:MM:SS), `points_awarded`, `gender_position`, `member_name`
- Results are only shown when `race.results_locked === true` — this is already enforced in `RaceLeagueRacePage`
- `AdminRaceLeaguePage.tsx` manages races and already has the race list in state

---

## Change 1 — Add share helper to `RaceLeagueService.ts`

Add a new static method `getRaceShareData(raceId: string, raceName: string, raceDate: string)` that:

1. Calls `getRaceEntries(raceId)` — already resolves member names
2. Splits entries into male and female arrays
3. Returns two `LeagueShareData` objects:

```ts
static async getRaceShareData(
  raceId: string,
  raceName: string,
  raceDate: string
): Promise<{ male: LeagueShareData; female: LeagueShareData }> {
  const entries = await RaceLeagueService.getRaceEntries(raceId);
  const formattedDate = format(parseISO(raceDate), 'd MMMM yyyy');

  const toShareEntries = (gender: Gender): LeagueShareEntry[] =>
    entries
      .filter(e => e.gender === gender)
      .sort((a, b) => a.finish_time.localeCompare(b.finish_time))
      .map((e, i) => ({
        rank: i + 1,
        name: e.member_name ?? 'Unknown',
        detail: e.finish_time,
      }));

  return {
    male: {
      leagueName: `${raceName} — Men's Results`,
      entries: toShareEntries('male'),
      updatedDate: formattedDate,
    },
    female: {
      leagueName: `${raceName} — Women's Results`,
      entries: toShareEntries('female'),
      updatedDate: formattedDate,
    },
  };
}
```

Import `LeagueShareData` and `LeagueShareEntry` from `../../leagues/types/leagueShare` at the top of the file.
Import `format` and `parseISO` from `date-fns` (already used in this module).

---

## Change 2 — Add "Share Results" button to `AdminRaceLeaguePage.tsx`

### State additions
```ts
const [shareRaceId, setShareRaceId] = useState<string | null>(null);
const [shareData, setShareData] = useState<{ male: LeagueShareData; female: LeagueShareData } | null>(null);
const [shareLoading, setShareLoading] = useState(false);
```

### Handler
```ts
const handleShareRace = async (race: RaceLeagueRace) => {
  setShareLoading(true);
  setShareRaceId(race.id);
  try {
    const data = await RaceLeagueService.getRaceShareData(race.id, race.name, race.race_date);
    setShareData(data);
  } finally {
    setShareLoading(false);
  }
};
```

### Button placement
In the race list, for each race where `results_locked === true`, add a "Share Results" button alongside the existing race controls:

```tsx
{race.results_locked && (
  <button
    className="btn btn-secondary btn-sm"
    onClick={() => handleShareRace(race)}
    disabled={shareLoading && shareRaceId === race.id}
  >
    <Share2 size={14} />
    {shareLoading && shareRaceId === race.id ? 'Loading...' : 'Share Results'}
  </button>
)}
```

Import `Share2` from `lucide-react`.

### Modal render
```tsx
{shareData && (
  <LeagueShareModal
    data={shareData.male}
    secondaryData={shareData.female}
    secondaryLabel="Women"
    primaryLabel="Men"
    onClose={() => { setShareData(null); setShareRaceId(null); }}
  />
)}
```

---

## Change 3 — Update `LeagueShareModal.tsx` to accept optional secondary data

The existing modal already has a male/female toggle from the standings implementation. Check whether it already accepts a `secondaryData` prop — if so, just pass it. If not, add the prop:

```ts
interface LeagueShareModalProps {
  data: LeagueShareData;
  secondaryData?: LeagueShareData;   // add if not already present
  primaryLabel?: string;             // e.g. "Men" — add if not already present
  secondaryLabel?: string;           // e.g. "Women" — add if not already present
  onClose: () => void;
}
```

If the toggle is already implemented for standings, this change may be minimal or zero — inspect the current `LeagueShareModal` before making changes and only add what's missing.

---

## Files to Modify
- `src/modules/race-league/services/RaceLeagueService.ts` — add `getRaceShareData()` method and import `LeagueShareData`, `LeagueShareEntry`
- `src/modules/race-league/pages/AdminRaceLeaguePage.tsx` — add share state, handler, button, and modal render
- `src/modules/leagues/components/LeagueShareModal.tsx` — add `secondaryData`, `primaryLabel`, `secondaryLabel` props only if not already present from standings implementation

## Files to Leave Untouched
- `LeagueShareCard.tsx` — no changes needed
- `leagueShare.ts` types — no changes needed
- `leagues-share.css` — no changes needed
- All parkrun league files
- All member-facing components
- `AppContent.tsx`

---

## Coding Standards
- No inline styles (except inside `LeagueShareCard` which already has the justified exception)
- No `!important`
- Lucide React for icons (`Share2` already used in existing share buttons)
- TypeScript throughout
- Clean `npm run build` before committing

---

## Acceptance Criteria
- "Share Results" button appears only on locked races in `AdminRaceLeaguePage`
- Clicking opens the share modal with Men's results by default
- Toggle switches between Men's and Women's results
- "Show top N" control works correctly
- PNG download produces clean output with race name, gender, date, positions and finish times
- Copy text produces correctly formatted output
- No button appears for unlocked or upcoming races
- No changes to member-facing race league pages
- TypeScript compiles without errors
