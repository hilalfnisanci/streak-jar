# Implementation Plan — Weekly recap and shareable PNG badge

Closes #84

## Status

Plan only. No application code is changed in this PR. The implement stage builds it.

## Sources reconciled

- **Spec:** issue #84 (this plan follows it; it outranks the prototype).
- **Prototype:** `design/weekly-recap-badge/index.html`, commit `c78adb7`. That commit is **not on
  `main`**. It lives only on `origin/feat/1707108061`. Read it with
  `git show c78adb7:design/weekly-recap-badge/index.html`. Do not merge or cherry-pick it as
  part of this feature.
- **Code baseline:** `main` at `c1b8c2f`.

Where the prototype and the spec disagree, this plan uses the spec:

| Topic | Prototype | Spec / this plan |
| --- | --- | --- |
| Medal caption | "days in a row" | "of 7 days" / "of {n} days" |
| Save toast | "Saved {filename}" | "Image saved" |
| Summary comparison | all jars, missing prev counted as 0 | only jars that have a previous week, on both sides |
| Negative numbers | ASCII `-` | U+2212 `−` in visible text ("▼ −1") |
| This-week "Days so far" | hard-coded `2/7` | number of days elapsed in this week, today included |
| This-week first-week longest streak | 7 (crosses weeks) | within-week only (max 7) |
| Palette | 5 hex colours inline | all 8 jar colours from `app/globals.css` tokens |

## Existing code this builds on (verified)

| Surface | Location | Relevance |
| --- | --- | --- |
| Storage | `lib/storage.ts` — `Jar`, `MarbleEntry`, `JarStorage`, `loadJarStorage()` (lines 49–68) | Only read path. Recap never calls `saveJarStorage`/`saveJars`. |
| Local day key | `lib/local-date.ts` — `getLocalDateKey(date)` | "today", creation day and completion day keys. |
| Streak helpers | `lib/streak.ts` — `dateKeyPattern` (l.6), `getMarbleDate` (l.8–20), `shiftDateKey` (l.30–38), all module-private | Week logic must reuse these, not copy them (spec R2 / constraints). |
| Duplicate parsing | `app/jar/page.tsx` — `shiftDate`, `getMarbleDate`, `getMarbleDateSet` (l.23–40) | Same rules repeated. Leave it unchanged (out of scope). New code uses `lib/streak.ts`. |
| Completion | `app/jar/page.tsx` `completeJar` (l.200–237) | Sets `completedAt` when the jar is moved to the Trophy Shelf **or** kept on display. On a later move it keeps the first `completedAt`. |
| Home | `app/page.tsx` `Home` (l.92–143), `EmptyState` (l.16–42), `JarCard` (l.44–90) | The entry card goes between the "Your jars" heading row (l.107–120) and the grid (l.121). |
| UI primitives | `app/components/ui` — `Button`, `buttonClasses`, `Badge` (tones `success`/`streak`/`neutral`), `Card`, `cardClasses` | Reuse them for all controls (R9). |
| Colours | `lib/jar-colors.ts` `getJarColor()` (Tailwind classes); hex values in `app/globals.css` `:root` (l.3–14) | DOM uses classes. Canvas reads `--{color}` CSS variables. |
| Modal pattern | `app/components/celebration-modal.tsx` (focus on open, Esc, Tab trap) | Reference pattern for the badge sheet. Do not refactor it. |
| Reduced motion | `app/globals.css` l.383–396 `@media (prefers-reduced-motion: reduce)` | Add sheet/toast animation opt-outs here. |
| Fonts | `app/layout.tsx` — `next/font` Inter (`--font-inter`) and Fraunces (`--font-fraunces`) on `<html>` | The canvas must resolve the real (hashed) family names from these variables. |
| Routing/build | `next.config.ts` — `output: "export"`, `basePath: "/streak-jar"`, `trailingSlash: true` | New route is a static client page. Use `next/link` so `basePath` is applied. Read query params from `window.location.search` in an effect (same as `app/jar/page.tsx` l.46–52). |
| Tests | Vitest + jsdom + Testing Library. `vitest.config.ts` sets `TZ ??= "Europe/Istanbul"`. Patterns: `app/__tests__/page.test.tsx`, `lib/streak.test.ts` (fake timers + `vi.setSystemTime`) | Follow them. |

No new runtime dependency is planned (see step 4).

## Files to change or add

| File | Change |
| --- | --- |
| `lib/streak.ts` | Export `shiftDateKey` and add an exported `getMarbleDateSet(marbles: unknown[]): Set<string>`. Make `computeStreak` use it. No behaviour change. |
| `lib/week.ts` (new) | Pure week and recap derivation (step 1). |
| `lib/week.test.ts` (new) | Unit tests (step 7). |
| `lib/badge-image.ts` (new) | Badge model → canvas → PNG blob, file name, save/share helpers (step 4). |
| `lib/badge-image.test.ts` (new) | File name/slug and model tests (step 7). |
| `app/components/recap-entry-card.tsx` (new) | Home entry card (step 2). |
| `app/page.tsx` | Render `RecapEntryCard` under the heading when jars exist. |
| `app/recap/page.tsx` (new) | Recap screen (step 3). |
| `app/components/badge-sheet.tsx` (new) | Badge sheet, preview, switch, actions, error (step 5). |
| `app/components/badge-card.tsx` (new) | DOM badge preview, driven by the same `BadgeModel` as the canvas. |
| `app/globals.css` | Hatched / dotted day-slot styles, sheet + toast transitions, and reduced-motion opt-outs. Only token-based values. |
| `app/__tests__/page.test.tsx` | Extend with entry-card cases. |
| `app/recap/__tests__/page.test.tsx` (new) | Recap screen and badge sheet behaviour. |
| `README.md` | One line under features, if the README lists them. Check before editing. |

There is no storage schema or migration change.

## Step 1 — `lib/week.ts` (pure derivation, R1–R3)

All functions take `today: string` (a local date key) and a `JarStorage`. They never read the
clock or `window`, so tests fix `today` directly. Date arithmetic is done **only on date keys**
with `shiftDateKey`, which is UTC-based and therefore DST-safe (same guarantee as #74).

```ts
export type WeekKind = "last" | "this";
export type Week = { start: string; end: string; days: string[] }; // 7 keys Mon..Sun
export type DayState = "marble" | "missed" | "before" | "future";

export type JarWeek = {
  jar: Jar;
  days: DayState[];            // length 7
  marbles: number;             // distinct marble dates in days in scope
  daysInScope: number;         // 0..7
  longestStreak: number;       // 0..7, within the week only
  isFirstWeek: boolean;        // creation day falls inside this week
  isFull: boolean;             // only possible for kind "last"; daysInScope > 0 && marbles === daysInScope
  previous: number | null;     // marbles in previous week, null if jar did not exist then
  delta: number | null;        // marbles - previous
  filledOn: string | null;     // completedAt day key when it falls in this week
};

export type WeekRecap = {
  kind: WeekKind;
  week: Week;
  jars: JarWeek[];
  total: number;
  bestStreak: number;
  comparison: { delta: number; previousTotal: number } | null; // null when no listed jar has a previous week
  daysSoFar: number;           // this week only: 1..7
  allFirstWeek: boolean;       // jars.length > 0 && every listed jar isFirstWeek
};

export function getWeekStart(dateKey: string): string;       // Monday on/before dateKey
export function getWeek(today: string, kind: WeekKind): Week;
export function computeWeekRecap(storage: JarStorage, today: string, kind: WeekKind): WeekRecap;
export function formatWeekRange(week: Week): string;          // "Nov 2 – 8", "Oct 30 – Nov 5", "Dec 28 – Jan 3"
export function hasFinishedWeek(storage: JarStorage, today: string): boolean;
```

Rules:

- **Weekday of a key:** `new Date(Date.UTC(y, m - 1, d)).getUTCDay()`. Monday offset is
  `(dow + 6) % 7`. `this` week starts at `shiftDateKey(today, -offset)`. `last` starts 7 days
  earlier. The previous week of either is a further −7.
- **Creation day:** `getLocalDateKey(new Date(jar.createdAt))`. If `createdAt` cannot be parsed,
  treat the jar as created before every week (no "before" days). Do not throw.
- **Completion day:** the same conversion on `completedAt`, if it is set and valid.
- **Marble dates:** `getMarbleDateSet(jar.marbles)` from `lib/streak.ts`. Legacy strings and
  `{date, at}` objects are treated the same. Malformed entries are ignored (AC12).
- **Days in scope:** the week's days with `day >= creationDay`. For `this`, also `day <= today`.
  Slot state: `before` if `day < creationDay`, then `future` if `this` and `day > today`, then
  `marble` or `missed`.
- **Longest streak:** the longest consecutive run of `marble` slots in the 7-slot array.
- **Full / Starter:** `kind === "last" && daysInScope > 0 && marbles === daysInScope`. The badge
  is a Starter week badge when `isFirstWeek`, otherwise a Full week badge. A jar completed on
  Sunday with all 7 marbles still counts as full. "Jar filled on" only replaces the "short" line.
- **Comparison:** `previous` is non-null only when `creationDay <= previousWeek.end`. It counts
  marbles in the previous week's days in scope.
- **Jar listing (spec "Jars in a week"):** in order `storage.jars`, then `storage.completed`.
  A jar is listed when `creationDay <= week.end` **and** (it is *active* **or** `marbles >= 1`).
  *Active* means it is in `storage.jars` **and** has no `completedAt`. See open question Q1.
- **Summary:** `total` is the sum of listed `marbles`. `bestStreak` is the max `longestStreak`,
  or 0. `comparison` covers only listed jars where `previous !== null`, using both sides of
  those jars. `daysSoFar` is `offset(today) + 1`.
- **`hasFinishedWeek`:** false when every jar (active and completed) has
  `creationDay >= thisWeek.start`. This drives the "No finished week yet" variant (AC10).
- **Range format:** use a fixed English month array (`Jan`…`Dec`), not `Intl`. That gives the
  same output in every locale and in jsdom. Use an en dash with spaces: `" – "`.
  - Same month: `"Nov 2 – 8"`.
  - Otherwise: `"Oct 30 – Nov 5"`.
  - Year for the badge: the year of `week.end`.

Also export small helpers that UI and image code share, so the copy stays in one place:
`formatDelta(delta)` gives `{ symbol: "▲"|"▼"|"＝", text: "+2"|"−1"|"Same", srLabel: "2 more than last week"|"1 fewer than last week"|"same as last week" }`,
plus `pluralDays(n)` and `WEEKDAY_NAMES`.

## Step 2 — Home entry card (R4, AC1, AC2, AC8, AC10)

`app/components/recap-entry-card.tsx` is a client component that takes `storage: JarStorage` and
`today: string`. In `app/page.tsx`, `Home` already loads both lists in its effect. Pass
`{ jars, completed: completedJars }` and compute `today = getLocalDateKey(new Date())` at render.
Render the card directly after the heading row (`app/page.tsx` l.120) and before the active grid.
It sits outside the `jars.length > 0` branch, so it also shows when only Trophy Shelf jars
exist. It is never rendered in `EmptyState` (the early return at l.101 already handles that).

Variant selection (first match wins):

1. `!hasFinishedWeek` → **No finished week yet**: "Your first recap arrives Monday" / "See this
   week so far". The link goes to `/recap?week=this`. The eyebrow range and preview use *this*
   week.
2. `last.total === 0` → **Quiet**: "Last week was quiet" / "No marbles {range}. A fresh week
   started Monday." The preview shows 7 empty slots.
3. `last.allFirstWeek` → **First week**: "Your first week is in" / "{N} marbles since you
   started · badge ready" (when any jar is full) or "… · see how it went".
4. **Normal**: "{N} marbles last week" / "{k} jar filled every day · badge ready" ("jars" when k ≠ 1),
   or "See how each jar did" when k = 0.

Shared parts:

- Eyebrow: "Weekly recap · {range}".
- Preview: up to 10 marbles. Walk the listed jars in order, then their marble days Mon→Sun, and
  colour each with `getJarColor(jar.color).solid`. The preview is `aria-hidden`.
- The whole card is one `next/link` `Link` to `/recap` (or `/recap?week=this`), styled with
  `cardClasses`, at least 44px tall, with
  `aria-label="Weekly recap, {range}. {head}. {sub}. Open"`.

## Step 3 — Recap screen `app/recap/page.tsx` (R5, AC3–AC11, AC23)

This is a client page. In one effect it reads `loadJarStorage()`, `today` and
`new URLSearchParams(window.location.search).get("week") === "this"` for the initial tab. Until
loaded it renders `null`, like `app/jar/page.tsx`. Tab switches are React state only. The page
does not write to the URL or storage.

Layout (container `mx-auto w-full max-w-3xl px-5 pb-16 pt-6`, mobile-first from 360px):

- "← Your jars" `Link` to `/` (`buttonClasses({ variant: "ghost", size: "sm" })`, min-h 44px).
- Eyebrow "Weekly recap". `h1` = `formatWeekRange(week)`. Focus the `h1` (`tabIndex={-1}`) on
  mount, as the prototype does.
- Tablist `role="tablist" aria-label="Choose week"` with two `role="tab"` buttons
  (`aria-selected`, `aria-controls`, roving `tabIndex`, and ArrowLeft/ArrowRight/Home/End
  switching), plus one `role="tabpanel"` with `aria-labelledby` set to the active tab.
- **Summary row** (`Card`, 3 columns):
  - Marbles: `total`.
  - Best streak: "{n} day(s)".
  - Third cell:
    - Last week with `comparison`: "▲ +N" / "▼ −N" / "＝ 0" with the label "vs last week" and
      an `aria-label` from `formatDelta`.
    - Last week without `comparison`: "—" / "No last week yet".
    - This week: "{daysSoFar}/7" / "Days so far".
- **Notes** (`<p>` with `Card` tint):
  - This week: "This week is still going. Badges unlock Monday for every jar that gets a marble
    each day."
  - Last week with `allFirstWeek`: "Your first week! We count from the day you created each
    jar, so a late start can still be a full week. Comparisons start next week." ("Your first
    week!" in `<strong>`).
- **Quiet (last week, `jars.length > 0 && total === 0`)**: an empty block with a ghost jar.
  Use `<JarVisual variant="preview" color="…">` or a muted variant. Do not add a new jar
  drawing. It contains:
  - `h2` "A quiet week".
  - The text "No marbles went in between {Mon d} and {Mon d}. That happens — your jars kept
    every marble from before, and Monday was a fresh start."
  - A primary `Link` "Drop today's marble" to `/`.
  - Then the heading "Your jars".
  - Otherwise the heading "By jar".
- **Last week with no listed jars** (only reachable via `/recap` directly before the first
  finished week): show "Your first recap arrives Monday" and no list. See Q3.
- **Per-jar card** (`article`, `aria-label={jar.name}`, border tinted with
  `getJarColor().borderSoft`):
  - Header: a colour dot (`solid`), the name (truncated), and, when `isFull`, a
    `<Badge tone="success">✓ Full week</Badge>` or "✓ Starter week".
  - Day list `role="list" aria-label="Days this week"` with 7 `role="listitem"` slots and
    `aria-label="{Monday}: marble | no marble | before jar was created | not yet"`. The visible
    letter is `aria-hidden`. Styles:
    - marble: `solid` fill.
    - missed: `border-line` outline.
    - before: hatched (`repeating-linear-gradient` using `var(--line)`).
    - future: dotted border.
  - Stats:
    - "{marbles} / {daysInScope}" with the label "Marbles", or "Days since start" when
      `isFirstWeek` on last week.
    - "{n} day(s)" with the label "Longest streak".
    - Third stat:
      - This week: "—" / "Compare on Sun".
      - `previous === null`: "—" / "No last week yet".
      - Otherwise: `formatDelta` (arrow `aria-hidden` + text, `aria-label` = srLabel) with
        "vs {previous} last week".
  - Footer (last week only):
    - `isFull`: a primary full-width `Button` "Get your badge" that opens the sheet with this
      `JarWeek`. Keep a ref to the button so focus can return to it.
    - Else `filledOn`: "Jar filled on {Weekday} 🎉" (🎉 `aria-hidden`).
    - Else `marbles >= 1`: "{daysInScope − marbles} day(s) short of a full week badge."
    - Else nothing.
- A single toast region lives on the page: `role="status" aria-live="polite"`, always mounted,
  with text cleared after ~2.6 s using a timer that is cleaned up on unmount.

## Step 4 — Badge image `lib/badge-image.ts` (R6–R8, AC15–AC22)

**Technique: hand-drawn Canvas 2D, no new dependency.** DOM-to-image libraries
(`html-to-image`, `html2canvas`) add weight. They also have known Safari font-embedding problems
and would draw the CSS preview at screen scale. A small canvas renderer fed by the same model
as the DOM preview gives an exact 1080×1350 output and works fully offline (AC22).

```ts
export type BadgeModel = {
  kind: "full" | "starter";
  name: string;          // already resolved: jar.name or "A habit, kept"
  count: number;         // marbles
  slots: number;         // 7, or daysInScope for starter
  caption: string;       // "of 7 days" | "of {n} days"
  sub: string;           // "{range}, {year} · 🔥 {longest}-day streak"
  color: JarColorKey;
  rangeSlug: string;     // "nov-2-8" | "oct-30-nov-5"
};
export const BADGE_WIDTH = 1080, BADGE_HEIGHT = 1350;
export function getBadgeModel(jarWeek: JarWeek, week: Week, showName: boolean): BadgeModel;
export function getBadgeFileName(jarName: string, showName: boolean, week: Week): string;
export function getShareText(jarName: string, showName: boolean): string; // "I kept {name|a habit} going all week with Streak Jar."
export async function renderBadgePng(model: BadgeModel, doc?: Document): Promise<Blob>;
export function downloadBlob(blob: Blob, fileName: string): void;
export function canShareFiles(): boolean;                         // probes navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] })
export async function shareBadge(blob: Blob, fileName: string, text: string): Promise<"shared" | "dismissed">;
```

- **File name:** `streak-jar-{slug}-{rangeSlug}.png`. `slug` is `habit` when the name is hidden,
  when the name contains any non-ASCII character, or when the result is empty. Otherwise it is
  `name.toLowerCase().replace(/[^a-z0-9]+/g, "-")`, trimmed of `-`. `rangeSlug` is
  `{mon}-{d}-{d}` within one month, otherwise `{mon}-{d}-{mon}-{d}` (see Q4).
- **Colours:** resolve the hex value from `getComputedStyle(document.documentElement)
  .getPropertyValue(`--${color}`)` (and `--cream`, `--ink`, `--soft-ink`, `--line`), so the
  canvas uses the tokens from `globals.css`. Tints (the 14% card background and 35% medal) are
  computed in JS by mixing with cream/white. This matches the preview's `color-mix`.
- **Fonts:** read `--font-inter` / `--font-fraunces` from the computed style of
  `document.documentElement`. These hold next/font's generated family names. Then
  `await Promise.all([document.fonts.load(`600 120px ${fraunces}`), document.fonts.load(`700 40px ${inter}`), document.fonts.load(`600 40px ${inter}`)])`
  before drawing. A font load failure is non-fatal, because the CSS fallbacks still apply.
- **Draw** at 1080×1350, laid out proportionally to the preview:
  - Tinted background and pattern.
  - Ribbon "✓ Full week" / "✓ Starter week".
  - A medal circle with a ring of `slots` marbles. The first `count` are in the jar colour, the
    rest `--line`. On a full badge count equals slots.
  - The big number (Fraunces) and caption.
  - The name line (Fraunces, wrapped or ellipsised to 2 lines).
  - The sub line (Inter).
  - The wordmark footer: draw the header jar glyph path from `app/components/header.tsx` via
    `Path2D` plus "Streak Jar".
- **Encode:** `canvas.toBlob(resolve, "image/png")`. Reject when the 2D context is null or the
  blob is null. Any thrown error is surfaced to the sheet's error state.
- **Save:** `URL.createObjectURL`, then a temporary `<a download>` click, then `revokeObjectURL`
  (deferred). No network request is made.
- **Share:** `navigator.share({ files: [new File([blob], fileName, { type: "image/png" })], text })`.
  An `AbortError` (user dismissed) resolves to `"dismissed"`. Other errors rethrow so the error
  state shows.

## Step 5 — Badge sheet `app/components/badge-sheet.tsx` (AC14–AC20)

Props: `jarWeek`, `week`, `onClose`, `onSaved` (the page shows the "Image saved" toast).

- Scrim plus panel. The panel is `role="dialog" aria-modal="true" aria-labelledby` set to the
  "Your badge" `h2`.
  - Mobile: a bottom sheet (full width, rounded top).
  - `sm:` and wider: a centred modal, `max-w-[480px]`.
  - Slide/fade transitions are disabled under `prefers-reduced-motion`.
- Focus and keyboard follow the CelebrationModal pattern:
  - On mount, focus the ✕ button (`aria-label="Close"`, 44×44).
  - Esc closes. Scrim click closes. Tab and Shift+Tab are trapped across all focusable elements
    (button and `[role=switch]`).
  - On close, the page refocuses the stored "Get your badge" button.
- `showName` is local `useState(true)`. The sheet is unmounted on close, so it resets on every
  open (AC15). It is never persisted.
- `BadgeCard`: a DOM preview with `aspect-[4/5]`, from `getBadgeModel(...)`.
  `role="img" aria-label="Badge preview: {Full|Starter} week, {name}, {count} days, {range}"`.
- Switch: `button role="switch" aria-checked` with a visible label "Show jar name on badge",
  min-h 44px.
- Actions (`status: idle | working(kind) | error(kind)`):
  - **Share** is rendered only when `canShareFiles()` (checked in an effect after mount). In
    that case Share and Save are side by side. Otherwise Save image is the only action and
    full-width primary (AC18).
  - While working, the pressed button reads "Creating image…" and **both** are `disabled`
    (AC19).
  - Save: `renderBadgePng` → `downloadBlob(blob, getBadgeFileName(...))` → `onSaved()`.
  - Share: `renderBadgePng` → `shareBadge`. `"dismissed"` returns to idle with no toast (AC17).
  - Error: `role="alert"` with "We couldn't create the image. Your marbles are safe — this only
    affects the badge picture." and a **Try again** button that re-runs the same `kind`. The
    sheet stays open (AC20).
- There are no links, network-specific buttons or SDKs (AC22).

## Step 6 — Styles (R9)

Only add to `app/globals.css`:

- `.day-slot--before` (hatched) and `.day-slot--future` (dotted), using `var(--line)` /
  `var(--soft-ink)`.
- `.badge-sheet` / `.toast` enter transitions.
- Extend the existing `@media (prefers-reduced-motion: reduce)` block at l.383 to disable them.

Everything else uses Tailwind utilities on the existing tokens (`bg-cream`, `text-soft-ink`,
`border-line`, jar-colour classes from `getJarColor`).

## Step 7 — Tests (DoD)

Each test below names the failure it guards against. Keep the suites small. One scenario may
prove several ACs.

**`lib/week.test.ts`** (pure, fixed `today = "2026-11-10"`, no fake timers needed):

1. Week boundaries: `getWeek` for Tue Nov 10 gives last = Nov 2–8 and this = Nov 9–15. Also
   check a Sunday and a Monday "today", a month boundary (`Oct 30 – Nov 5`) and a year boundary
   (`Dec 28 – Jan 3`). This guards against an off-by-one in the week start.
2. Full week, short week and comparison: jars A (AC3, AC5: prev 5 → `delta +2`) and B (AC4:
   4/7, longest 2). Includes an equal-count jar (`delta 0`).
3. Starter week positive and negative (AC6, AC7): 5/5 full and starter, slots
   `before,before,marble…`, `previous === null`. Then 4/5 not full.
4. Quiet week plus listing: zero marbles last week gives `total 0`. A Trophy jar completed Nov 5
   is listed in last week with `filledOn` (AC11) and not listed in this week without marbles. An
   active jar created after Sunday is not listed.
5. This week (AC9): Wed–Sun `future`, `daysSoFar 2`, `isFull` always false.
6. Legacy and malformed marbles (AC12): mixed strings/objects, duplicates and garbage give the
   distinct valid count. Invalid `createdAt` does not throw.
7. DST (AC13): set `process.env.TZ = "Europe/Berlin"` for this test only (Node re-reads TZ) and
   restore it in `afterEach`. Use `createdAt` near the local midnight of Oct 25. The fully
   filled Oct 26 – Nov 1 week gives 7/7 and seven distinct day keys. If the runtime ignores the
   runtime TZ change, run this file with `TZ=Europe/Berlin` (`vitest.config.ts` uses `??=`) and
   note it in the PR.
8. `hasFinishedWeek` false when every jar was created on Nov 9 or later (AC10).

**`lib/badge-image.test.ts`**:

- File names: `streak-jar-morning-pages-nov-2-8.png`, `streak-jar-habit-nov-2-8.png` (hidden),
  a non-ASCII name gives `habit`, and the cross-month slug.
- `getBadgeModel` captions for full vs starter and the "A habit, kept" name.
- `renderBadgePng` with a stubbed `document.createElement("canvas")` whose `getContext` returns
  a recording fake and whose `toBlob` returns a blob. Assert the canvas is 1080×1350 and that
  `fillText` received the resolved name. jsdom has no canvas implementation, so this stub is
  the cheapest boundary for R6. A second case has `getContext` return `null`, which must reject.

**`app/__tests__/page.test.tsx`** (extend; fake timers at 2026-11-10 local noon):

- Normal: the card "Weekly recap · Nov 2 – 8" exists under "Your jars" and its link points to
  `/recap` (AC1). The existing empty-state test also asserts there is no "Weekly recap" (AC2).
- Quiet (AC8) and no finished week yet with the `/recap?week=this` href (AC10).

**`app/recap/__tests__/page.test.tsx`** (new; fake timers; seed `localStorage`):

1. Last week, normal data: AC3/AC4/AC5 text, AC23 `aria-selected` and arrow-key tab switching.
   Then switch to This week: "Nov 9 – 15", "2/7", "Compare on Sun", the note, and no "Get your
   badge" (AC9).
2. Starter data: hatched slot labels, "Days since start", the first-week note (AC6).
3. Quiet data: "A quiet week", the "Drop today's marble" link to `/`, and no badge button (AC8).
4. Badge sheet flow:
   - Open the sheet and check the dialog and preview label (AC14).
   - Toggle the name, which gives "A habit, kept" (AC15).
   - Save, which calls `downloadBlob` with `streak-jar-habit-nov-2-8.png` and shows the "Image
     saved" status (AC16).
   - Esc restores focus to "Get your badge".
   - Reopen, and the switch is checked again (AC15).
   - Throughout, assert that the `localStorage` value and key count are unchanged (AC21).
5. Share supported vs unsupported. Stub `navigator.canShare`/`navigator.share`:
   - Unsupported: only Save is shown (AC18).
   - Supported: Share calls `share` with a PNG file. An `AbortError` gives no alert and no
     toast (AC17).
6. Loading and error. `renderBadgePng` is mocked to a deferred promise, so both buttons are
   disabled and read "Creating image…" (AC19). It then rejects, so the alert appears. Try again
   re-calls the same action (AC20).

In the component tests, `lib/badge-image`'s `renderBadgePng` and `downloadBlob` are mocked
(`vi.mock` with `importActual` for the rest). This is a deliberate test-boundary choice: jsdom
cannot rasterise a canvas or perform downloads. The real renderer is covered by
`lib/badge-image.test.ts`. State this in the implementation PR, as the `test_integrity` lens
requires.

**Validation for the implementer:**

- Local: `pnpm tsc` and focused `pnpm vitest run lib/week.test.ts lib/badge-image.test.ts
  app/__tests__/page.test.tsx app/recap/__tests__/page.test.tsx --maxWorkers=1`.
- CI owns the full `pnpm test` and `pnpm build`. The static export must produce
  `out/recap/index.html`.

## Acceptance criteria → plan mapping

| AC | Covered by |
| --- | --- |
| AC1, AC2, AC8 (card), AC10 | Step 2. Home tests |
| AC3–AC7, AC9, AC11–AC13 | Step 1 rules + Step 3 UI. `week.test.ts` + recap tests |
| AC14–AC20 | Steps 4–5. Recap badge-sheet tests + `badge-image.test.ts` |
| AC21 | No writer in any new code path (only `loadJarStorage`). Recap test 4 asserts byte equality and key count |
| AC22 | No links/SDKs in the sheet. Save/Share use only Blob/URL/`navigator.share` |
| AC23 | Step 3 tabs/labels, Step 5 sizes. Recap test 1 |
| Manual mobile Chrome/Safari check, PNG opened in gallery | **Team step** (see below) |

## Shared-state audit

The feature adds no storage keys, URL writers or global stores. The only new shared input is
the read-only `?week=this` query on `/recap`, which only `RecapEntryCard` writes, as a link
href. The existing `streak-jar.jars` writers (`app/jar/page.tsx` `handleAddToday` and
`completeJar`, `app/jars/new/page.tsx`) are not touched and are never called from recap code.

## Open questions / interpretations (correctable via `[PLAN_INPUT]`)

- **Q1 — Completed jars kept on display.** `completeJar` sets `completedAt` for "Keep on
  display" too. Such a jar stays in `storage.jars` but can no longer receive marbles. The plan
  treats any jar with `completedAt` as *not active* for listing, wherever it is stored. "Jar
  filled on {weekday}" follows `completedAt` in the same way, not only Trophy Shelf jars.
  Without this rule, a display-kept jar would appear every week as "7 days short". The spec
  wording ("moved to the Trophy Shelf") is narrower.
- **Q2 — Days after completion.** Inside the completion week they still count as days in
  scope, as the spec says, so a mid-week completion cannot be a full week. That matches AC11.
- **Q3 — Last-week tab before any finished week.** The spec does not say what that tab shows.
  The plan shows "Your first recap arrives Monday" with no jar list and no quiet block.
- **Q4 — Cross-month file name.** The spec gives only the same-month template. The plan uses
  `oct-30-nov-5`.
- **Q5 — Card precedence.** No finished week, then Quiet, then First week, then Normal. A quiet
  first week shows the Quiet copy.

## Team steps (not agent work)

- Manually verify on a 360–430px viewport in mobile Chrome and Safari. Save the PNG, open it
  in the gallery/file viewer, and use Share where available (spec DoD). No later pipeline stage
  owns runtime visual proof.

## Rollback

Remove `RecapEntryCard` from `app/page.tsx` and delete `app/recap`. Stored data is unaffected.
