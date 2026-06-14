# Work Package: League Standings Social Share

## Objective
Add a "Share Standings" feature to all three league admin pages (Parkrun, Race, Improvement). Admins can configure how many positions to show, preview a clean minimal card, download it as a PNG, and copy formatted text to clipboard for pasting into Facebook or other social media.

---

## Package Installation
Before any code changes, install `html2canvas`:
```bash
npm install html2canvas
npm install --save-dev @types/html2canvas
```
Verify installation succeeds and `package.json` is updated, then proceed.

---

## Architecture Overview

Three new files:
1. `src/modules/leagues/components/LeagueShareCard.tsx` — the rendered card (canvas target)
2. `src/modules/leagues/components/LeagueShareModal.tsx` — modal with preview, controls, and export buttons
3. `src/modules/leagues/leagues-share.css` — styles for the modal chrome only (not the card)

The card uses **inline styles only** — this is a deliberate exception to the no-inline-styles rule because `html2canvas` cannot reliably read CSS variables or external stylesheets. The card is a self-contained render target, not a UI component.

The modal chrome (backdrop, container, buttons, controls) uses CSS variables via `leagues-share.css` — no inline styles there.

---

## Data Shape

Both components accept a shared `LeagueShareData` type. Define this in `src/modules/leagues/types/leagueShare.ts`:

```ts
export interface LeagueShareEntry {
  rank: number;
  name: string;
  detail: string;    // e.g. "78.48%" for parkrun, "142 pts" for race, "+6.21%" for improvement
}

export interface LeagueShareData {
  leagueName: string;
  entries: LeagueShareEntry[];
  updatedDate: string;  // formatted e.g. "14 June 2026"
}
```

---

## File 1 — `LeagueShareCard.tsx`

A pure presentational component. Renders a clean minimal standings card.

### Props
```ts
interface LeagueShareCardProps {
  data: LeagueShareData;
  topN: number;
  cardRef: React.RefObject<HTMLDivElement>;
}
```

### Layout (all inline styles)
- Outer div: `width: 600px`, `backgroundColor: '#ffffff'`, `padding: '40px'`, `fontFamily: 'system-ui, -apple-system, sans-serif'`, `boxSizing: 'border-box'`
- League name header: `fontSize: '22px'`, `fontWeight: '700'`, `color: '#111827'`, `marginBottom: '4px'`
- Updated date subheader: `fontSize: '13px'`, `color: '#6b7280'`, `marginBottom: '28px'`
- Divider line between header and entries: `borderTop: '2px solid #111827'`, `marginBottom: '16px'`
- Each entry row: `display: 'flex'`, `alignItems: 'baseline'`, `padding: '10px 0'`, `borderBottom: '1px solid #f3f4f6'`
- Rank number: `width: '36px'`, `fontSize: '15px'`, `fontWeight: '700'`, `color: '#111827'`, `flexShrink: 0`
- Name: `flex: 1`, `fontSize: '15px'`, `color: '#111827'`
- Detail (AG%/points/improvement): `fontSize: '15px'`, `fontWeight: '600'`, `color: '#374151'`, `marginLeft: '12px'`
- Footer: `marginTop: '20px'`, `fontSize: '12px'`, `color: '#9ca3af'`, text: `"Run Alcester Running Club • app.runalcester.co.uk"`

Render only `data.entries.slice(0, topN)`.

Attach `cardRef` to the outer div.

---

## File 2 — `LeagueShareModal.tsx`

### Props
```ts
interface LeagueShareModalProps {
  data: LeagueShareData;
  onClose: () => void;
}
```

### State
- `topN: number` — default 10
- `isGenerating: boolean` — true while html2canvas is running
- `copied: boolean` — true for 2 seconds after copy text succeeds
- `cardRef: React.RefObject<HTMLDivElement>` — passed to `LeagueShareCard`

### Layout
Modal overlay with:
- Header: league name + close button (X icon from Lucide)
- Controls row: a number input or stepper labelled "Show top" with min=1, max=`data.entries.length`, default=10
- Preview area: renders `<LeagueShareCard>` at 50% scale using `transform: scale(0.5); transformOrigin: 'top left'` inside a sized container so it doesn't overflow
- Action buttons row:
  - "Download PNG" button — calls `handleDownloadPNG()`
  - "Copy Text" button — calls `handleCopyText()`, shows "Copied!" for 2 seconds

### `handleDownloadPNG()`
```ts
const handleDownloadPNG = async () => {
  if (!cardRef.current) return;
  setIsGenerating(true);
  try {
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,           // retina quality
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 600,
    });
    const link = document.createElement('a');
    link.download = `${data.leagueName.replace(/\s+/g, '-').toLowerCase()}-standings.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    setIsGenerating(false);
  }
};
```

### `handleCopyText()`
```ts
const handleCopyText = async () => {
  const lines = [
    `🏃 ${data.leagueName}`,
    `Updated: ${data.updatedDate}`,
    '',
    ...data.entries.slice(0, topN).map(e =>
      `${e.rank}. ${e.name.padEnd(25)} ${e.detail}`
    ),
    '',
    'Full standings: app.runalcester.co.uk'
  ];
  await navigator.clipboard.writeText(lines.join('\n'));
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

---

## File 3 — `leagues-share.css`

New file at `src/modules/leagues/leagues-share.css`. Import it in `LeagueShareModal.tsx`.

```css
/* ── League Share Modal ──────────────────────────────────────────────── */
.league-share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
}

.league-share-modal {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
}

.league-share-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.league-share-modal__title {
  font-size: var(--font-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.league-share-modal__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--gray-50);
  border-radius: var(--radius-md);
}

.league-share-modal__controls label {
  font-size: var(--font-sm);
  color: var(--gray-700);
  font-weight: var(--font-medium);
}

.league-share-modal__controls input[type="number"] {
  width: 64px;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  color: var(--gray-900);
}

.league-share-modal__preview {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--space-4);
  background: var(--gray-50);
  padding: var(--space-4);
}

.league-share-modal__preview-inner {
  transform: scale(0.5);
  transform-origin: top left;
  /* height set dynamically via inline style to match scaled card height */
}

.league-share-modal__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

---

## Wiring — Add "Share Standings" button to each league admin page

### Parkrun League (`AdminLeaguePage.tsx` or equivalent admin hub entry point)
- Import `LeagueShareModal` and `LeagueShareData`
- Add `showShare: boolean` state, default false
- Add a "Share Standings" button (use `Share2` icon from Lucide) in the page header actions area, visible to admins only
- On click: build `LeagueShareData` from the current leaderboard entries (already fetched), set `showShare = true`
- Render `{showShare && <LeagueShareModal data={shareData} onClose={() => setShowShare(false)} />}`
- The `detail` field for parkrun entries = `${entry.age_grade_percent}%`

### Race League (equivalent admin page)
- Same pattern
- The `detail` field for race league = points total or position as appropriate to that league's data

### Improvement Report (`ParkrunImprovementReportPage.tsx`)
- Same pattern
- The `detail` field = `+${total_improvement.toFixed(2)}%`

---

## Files to Create
- `src/modules/leagues/components/LeagueShareCard.tsx`
- `src/modules/leagues/components/LeagueShareModal.tsx`
- `src/modules/leagues/types/leagueShare.ts`
- `src/modules/leagues/leagues-share.css`

## Files to Modify
- `package.json` — html2canvas added via npm install
- Parkrun league admin page — add Share button and modal
- Race league admin page — add Share button and modal
- `ParkrunImprovementReportPage.tsx` — add Share button and modal

## Files to Leave Untouched
- All existing league CSS files
- All service files
- All member-facing components
- `AppContent.tsx`
- `Sidebar.tsx`

---

## Coding Standards
- `LeagueShareCard` uses inline styles only — justified exception for html2canvas compatibility
- All other new components use CSS variables via `leagues-share.css` — no inline styles
- No `!important`
- No Tailwind
- Lucide React for icons (`Share2`, `X`, `Download`, `Copy`, `Check`)
- TypeScript throughout — no `any`
- Clean `npm run build` before committing

---

## Acceptance Criteria
- `html2canvas` installs cleanly
- "Share Standings" button visible on all three league admin pages, admin-gated
- Modal opens with live preview of the share card
- "Show top N" control updates the preview in real time
- "Download PNG" produces a clean 1200×auto PNG (2x scale) with correct standings
- "Copy Text" copies formatted text to clipboard and shows "Copied!" confirmation
- Card shows rank, name, detail, updated date, and footer URL
- Modal closes on X button click
- TypeScript compiles without errors
- No visual changes to any existing league pages
