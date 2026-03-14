# League Rules Info Panel — Implementation Instruction

> **Scope:** Additive only — no existing league functionality changes  
> **Affects:** `LeaguePage.tsx`, `leagues.css`  
> **New files:** `LeagueInfoPanel.tsx`

---

## 1. Overview

Add a collapsible info panel to `LeaguePage` that displays the league rules and submission instructions. The panel sits between the page heading and the `<MyLeagueStatus />` component. It is collapsed by default and expands on user interaction.

---

## 2. New Component — `LeagueInfoPanel.tsx`

**Location:** `src/modules/leagues/components/LeagueInfoPanel.tsx`

Use the `ChevronDown` and `ChevronUp` icons from Lucide React (already in the project) for the expand/collapse toggle. No other new dependencies.

### 2.1 Behaviour

- Collapsed by default on page load
- Clicking the header row toggles expanded/collapsed state
- State is local to the component (`useState`) — no persistence required
- The toggle icon rotates or swaps between `ChevronDown` (collapsed) and `ChevronUp` (expanded)

### 2.2 Structure

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function LeagueInfoPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="league-info-panel">
      <button
        className="league-info-panel__toggle"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls="league-info-content"
      >
        <span>How the league works</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div
          id="league-info-content"
          className="league-info-panel__content"
        >
          {/* Content defined in Section 2.3 */}
        </div>
      )}
    </div>
  );
}
```

### 2.3 Content

Render the following copy inside `league-info-panel__content`. Use semantic HTML (`<p>`, `<ol>`, `<ul>`, `<strong>`, `<a>`) — no inline styles.

---

**Panel heading (render as `<h3>`):** `🏃 Run Alcester Parkrun League`

**Intro paragraph:**
> The Run Alcester Parkrun League is open to anyone who uses the Run Alcester app — no matter your pace, age, or how long you've been running. It's just for fun, but the kind of fun that gets you out of bed on a Saturday morning.

**Sub-heading:** `How does it work?`

**Paragraph:**
> The league is ranked using parkrun's **Age Grade percentage** — a score that adjusts your finish time based on your age and gender, so everyone competes on a level playing field. Whether you're chasing a PB or just keeping consistent, there's always something to aim for. Even if your fastest days are behind you, a birthday can nudge your age grade up — and that counts.

**Paragraph:**
> The league reflects **current form**. Only results from the last 6 months appear on the leaderboard. Once your result is more than 6 months old it drops off automatically, so you'll need to submit a more recent run to stay in the league.

**Age grade link** (render as a paragraph with an anchor):
> Want to understand age grade scoring better? → `<a href="https://support.parkrun.com/hc/en-us/articles/200565263" target="_blank" rel="noopener noreferrer">What is Age Grade? — parkrun support</a>`

---

**Sub-heading:** `How do I join?`

**Ordered list:**
1. Run a parkrun — any parkrun, anywhere
2. Open the app and go to **League → Submit a New Result**
3. Enter your **parkrun venue**, **date**, **finish time**, and **age grade %** — all shown in your parkrun results email
4. Your submission will be reviewed and will appear on the leaderboard once approved

**Paragraph:**
> You can submit a new result any time. If your age grade improves — by running faster or simply having a birthday and matching your previous time — just submit again and your leaderboard position will update.

---

**Sub-heading:** `A few things worth knowing`

**Unordered list:**
- You can join at any time — there's no fixed start date
- Each person has one active entry on the leaderboard (your most recently submitted approved result)
- Results older than 6 months drop off automatically to keep the league based on current form
- Each month the admin team will post a league update — including a heads-up for anyone whose result is due to expire soon
- The leaderboard updates as results are approved — check back after submitting

---

**Closing paragraph:**
> Any questions? Post them in the Run Alcester Facebook group and we'll see you at a parkrun soon! 🏅

---

## 3. Placement in `LeaguePage.tsx`

Insert `<LeagueInfoPanel />` after the `league-page-header` div (which contains the page heading and the Submit button) and before `<MyLeagueStatus />`. Do not move or modify the header div.

```tsx
// In LeaguePage render output — do not restructure the page:

<div className="league-page-header">
  {/* existing heading and Submit button — do not change */}
</div>

<LeagueInfoPanel />                        {/* ← insert here */}

<MyLeagueStatus ... />                     {/* existing */}

<LeagueTable rows={leaderboard} />         {/* existing */}
```

Add the import at the top of `LeaguePage.tsx`:

```tsx
import { LeagueInfoPanel } from '../components/LeagueInfoPanel';
```

---

## 4. CSS — add to `leagues.css`

Add the following classes to the existing `leagues.css` file. Match the visual style of other collapsible or card elements already in the project — check for existing patterns before writing new rules. Do not use inline styles.

```css
/* ── League Info Panel ───────────────────────────────────────────────── */

.league-info-panel {
  margin-bottom: var(--space-4);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.league-info-panel__toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--gray-100);
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: var(--font-sm);
  color: var(--gray-900);
  text-align: left;
}

.league-info-panel__toggle:hover {
  background: var(--gray-200);
}

.league-info-panel__content {
  padding: var(--space-4) var(--space-6);
  background: white;
}

.league-info-panel__content h3 {
  margin-top: 0;
}

.league-info-panel__content h4 {
  margin-top: var(--space-4);
  margin-bottom: var(--space-1);
}

.league-info-panel__content p,
.league-info-panel__content li {
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--gray-600);
}

.league-info-panel__content ol,
.league-info-panel__content ul {
  padding-left: var(--space-6);
  margin-bottom: var(--space-3);
}

.league-info-panel__content a {
  color: var(--info-color);
  text-decoration: underline;
}
```

---

## 5. Accessibility

- The toggle `<button>` uses `aria-expanded` to communicate state to screen readers
- The content container has `id="league-info-content"` matching `aria-controls` on the button
- The button is a native `<button>` element — keyboard focusable and activatable with Enter/Space by default
- Do not use a `<div>` with an `onClick` for the toggle

---

## 6. Testing Checklist

- [ ] Panel renders on `LeaguePage` below the page heading
- [ ] Panel is collapsed by default on page load
- [ ] Clicking the toggle header opens the panel and shows all content
- [ ] Clicking again closes it
- [ ] Chevron icon changes direction correctly on open/close
- [ ] All links open in a new tab
- [ ] Panel is keyboard accessible (Tab to focus, Enter/Space to toggle)
- [ ] No inline styles present in the rendered output
- [ ] CSS variable names match those in `variables.css`
