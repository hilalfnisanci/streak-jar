# Implementation Plan — ST3: Home dashboard redesign + overview stats + loading states

Closes #40

## Summary

ST3 turns the home page (`app/page.tsx`) from a bare jar grid into a polished
dashboard, the third stage of the Premium-cozy redesign epic (after ST1 design
foundation #38/#43 and ST2 glass jar #39/#44, both merged into `main`).

Five user-visible changes, all confined to `app/page.tsx` (plus its test) with **no
data-model change** and **no new shared component required** — the codebase already
keeps page-local presentational components inline (`EmptyState`, `JarCard`), and we
follow that convention:

1. **Overview header** — a stats strip above the grid: total marbles collected,
   active jars, longest current streak, and jars completed. All four are derived
   client-side from the already-loaded `loadJars()` / `loadCompletedJars()` results
   plus the existing `computeStreak()` helper.
2. **Refined jar grid + Trophy Shelf** — keep the existing ST1 `cardClasses` cards +
   ST2 `<Jar variant="mini">`; polish spacing/rhythm and the section headers. The
   completed-jars "Trophy Shelf" section stays.
3. **Loading skeletons** — gate first paint on a `hydrated` flag (mirroring the
   `hasLoaded` pattern already in `app/jar/page.tsx`) and render card + header
   skeletons until `localStorage` hydration completes, so a returning user with jars
   never sees the empty-state flash.
4. **Polished empty state** — re-home the existing `EmptyState` on the shared
   primitives (it already uses `buttonClasses` + the palette dots); light polish only.
5. **Fix the `fixed` "+ New jar" button** — it is currently
   `fixed right-5 top-5 z-10`, which floats over the global `<Header>` (rendered in
   `app/layout.tsx`) and is not in document flow. Move it into the page header row
   (the existing `flex … justify-between` already reserves the right slot) styled with
   the ST1 button classes, so it no longer overlaps and keeps a visible focus ring.

The hard constraint: **no behavioral regression and no weakened tests.** Card hrefs,
the "✓ Complete" ribbon, the per-card streak badge, the `<Jar mini>` aria labels, and
the `12 / 30` count line all stay exactly as they are. The three existing tests in
`app/__tests__/page.test.tsx` must keep passing unchanged.

## Scope and Assumptions

In scope (only this):

- Rewrite `app/page.tsx`'s default `Home` component to add: a `hydrated` state flag, a
  loading skeleton branch, an `OverviewHeader` (stats strip + title row + "+ New jar"
  button in flow), and minor spacing polish on the grid / Trophy Shelf.
- Add small page-local presentational helpers in `app/page.tsx`:
  `OverviewHeader`, `StatTile`, and `DashboardSkeleton` (names indicative). Keep
  `EmptyState` and `JarCard` essentially as-is.
- Pure-derivation stat helpers (no new lib file needed; small enough to live in
  `app/page.tsx` next to the component, matching how `JarCard` already calls
  `computeStreak` inline). If a reviewer prefers, these may instead go in a new
  `lib/overview.ts` with a unit test — see "Optional refinement" below.
- Extend `app/__tests__/page.test.tsx` with assertions for the overview stats and the
  in-flow "+ New jar" button. Existing assertions stay untouched.
- If `animate-pulse` (a Tailwind built-in) is used for the skeleton, add a
  `prefers-reduced-motion` note (Tailwind's `motion-reduce:animate-none` variant) so
  the shimmer is suppressed — consistent with the reduced-motion overrides already in
  `app/globals.css`.

Out of scope (do not touch):

- `lib/storage.ts`, `lib/streak.ts`, `lib/jar-colors.ts` — consumed as-is. **No
  data-model change.**
- `app/jar/page.tsx`, `app/jars/new/page.tsx`, `app/components/*` (jar, header, ui,
  celebration-modal). The "+ New jar" fix is a home-page layout change only; the global
  `<Header>` in `app/layout.tsx` is **not** modified.
- The `<Jar>` visual and `computeStreak` semantics (ST2/earlier).

Assumptions (stated; flag if wrong):

- **Total marbles collected** = the sum of `marbles.length` across **both** active and
  completed jars (a lifetime total reads most naturally for an at-a-glance header).
- **Active jars** = `jars.length` (the active list). Note a "kept on display" jar has
  `completedAt` set but still lives in `jars` (see `completeJar("display")` in
  `app/jar/page.tsx:201`); it therefore counts as active, which matches its placement
  on screen.
- **Longest current streak** = `max(computeStreak(jar.marbles))` over **active** jars,
  `0` when there are none. Completed jars have no live streak, so they are excluded.
- **Jars completed (Trophy Shelf count)** = `completedJars.length` (the `completed`
  list only — the Trophy Shelf section already renders exactly this list).
- RTL's `render()` flushes `useEffect` inside `act()`, so a `hydrated`-gated first
  paint still resolves to the post-hydration UI synchronously in tests — confirmed by
  the existing `hasLoaded` pattern in `app/jar/page.tsx` not breaking its tests.

## Affected Areas

| File | Change |
| --- | --- |
| `app/page.tsx` | **Rewrite `Home`.** Add `hydrated` flag + skeleton branch; add `OverviewHeader` / `StatTile` / `DashboardSkeleton`; compute the four stats; move "+ New jar" into flow; spacing polish. Keep `EmptyState` + `JarCard`. |
| `app/__tests__/page.test.tsx` | **Add** overview-stats assertions and an in-flow "+ New jar" assertion. Existing tests unchanged. |
| `app/globals.css` | **Only if** a custom skeleton shimmer is preferred over Tailwind `animate-pulse`; otherwise untouched. Default plan uses `animate-pulse` + `motion-reduce:animate-none` and touches no CSS. |
| `docs/plans/issue-40-st3-home-dashboard.md` | **New.** This plan. |

## Implementation Steps (ordered)

1. **Add a hydration flag and three render branches** in `Home` (`app/page.tsx:92`).
   - Add `const [hydrated, setHydrated] = useState(false);` alongside the existing
     `jars` / `completedJars` state. In the existing `useEffect`, after the two
     `setJars` / `setCompletedJars` calls, add `setHydrated(true);` (single effect, one
     pass).
   - Branch order in render:
     1. `if (!hydrated) return <DashboardSkeleton />;`
     2. `if (jars.length === 0 && completedJars.length === 0) return <EmptyState />;`
     3. otherwise the dashboard.
   - This distinguishes "still loading" (skeleton) from "genuinely empty" (empty
     state), satisfying the no-flash criterion. Mirror the existing pattern in
     `app/jar/page.tsx:240` (`if (!hasLoaded) return null;`) but return the skeleton
     instead of `null`.

2. **Build `DashboardSkeleton`** (new local component in `app/page.tsx`).
   - Same outer container classes as the dashboard `<section>`
     (`mx-auto … max-w-6xl px-5 pb-16 pt-6`) so layout doesn't shift on hydrate.
   - A header skeleton: a title-width bar + a row of four `StatTile`-shaped placeholder
     blocks matching the real stats strip grid.
   - A grid skeleton: three card-shaped placeholders reusing `cardClasses` with a fixed
     `min-h-72` (matching `JarCard`) so the grid height is stable.
   - Placeholder blocks: `<div className="animate-pulse motion-reduce:animate-none rounded-lg bg-line/60 …" />`
     with `aria-hidden="true"`. Give the section a `role="status"` +
     `aria-label="Loading your jars"` (or `aria-busy`) so it is announced as loading,
     not as empty.

3. **Build the overview stats** (compute + `OverviewHeader` + `StatTile`).
   - Compute inline in `Home` (post-hydration), e.g.:
     - `const totalMarbles = [...jars, ...completedJars].reduce((sum, j) => sum + j.marbles.length, 0);`
     - `const activeJars = jars.length;`
     - `const longestStreak = jars.reduce((max, j) => Math.max(max, computeStreak(j.marbles)), 0);`
     - `const completedCount = completedJars.length;`
   - `OverviewHeader` renders the title row — `<h1>Your jars</h1>` (keep this exact
     heading; tests assert it) plus the "+ New jar" button (Step 5) — and below it a
     responsive stats strip: `grid grid-cols-2 gap-3 sm:grid-cols-4` of four
     `StatTile`s.
   - `StatTile({ value, label })` renders a `cardClasses`-styled tile with the number
     in a large heading (`font-heading text-3xl`) and the label in
     `text-sm text-soft-ink`. To keep the values unambiguous for tests, wrap each tile
     so a scoped query (`within(tile)`) can read its value, and use distinct labels:
     `"Marbles"`, `"Active jars"`, `"Longest streak"`, `"Completed"`. (Plain `getByText`
     on a number like `"3"` would collide with the streak badge / count line.)

4. **Polish the grid + Trophy Shelf rhythm** (existing JSX in `app/page.tsx:121-140`).
   - Keep `JarCard` and both grids exactly as they render today
     (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, `gap-5`); only adjust top spacing so
     the grid sits below the new stats strip (e.g. `mt-8` from the header block).
   - Keep the Trophy Shelf `<section>` with its `border-t border-line pt-8` divider and
     `Trophy Shelf` heading unchanged. No change to completed-card rendering.

5. **Fix the "+ New jar" button** (`app/page.tsx:111-119`).
   - Remove `fixed right-5 top-5 z-10 py-3 shadow-md`. Render it as a `next/link`
     `<Link>` to `/jars/new` styled with `buttonClasses({ size: "sm" })` inside the
     `OverviewHeader` title row's right slot (the row is already
     `flex items-center justify-between gap-4`).
   - Keep the visible text `"+ New jar"` (tests assert the link name) and `href="/jars/new"`.
   - `buttonClasses` already includes the focus ring
     (`focus:ring-2 focus:ring-ink …`), so the button is keyboard/focus accessible and
     no longer overlaps the global header.

6. **Refresh the `EmptyState`** (`app/page.tsx:16`).
   - It already uses `buttonClasses` for the CTA and the palette dots from
     `jarColorSolids`; this is mostly already on the shared primitives. Light polish
     only (spacing/copy consistency). Do not regress the asserted text
     "Your jars will appear here. First marble's just a tap away." or the
     "Create your first jar" → `/jars/new` link.

7. **Extend the page test** (`app/__tests__/page.test.tsx`).
   - In the existing "renders stored jars as cards" test (seed: 12 + 5 + 10 marbles,
     one 3-day streak), add stat assertions against the known seed:
     - Marbles total = **27**, Active jars = **3**, Longest streak = **3**,
       Completed = **0**.
     - Query each stat tile by its label and assert its value with `within(tile)` (so
       the streak tile's `3` is not confused with the `🔥3` badge).
   - In the "trophy shelf" test (active jar with 3 marbles + 1 completed jar with 2),
     optionally assert Completed = **1**, Active jars = **1**, Marbles = **5**.
   - Add: the "+ New jar" link is present and (now that it is in flow) is **not**
     `fixed` — e.g. assert it does not carry the `fixed` class, or simply that it
     renders inside the header region. Keep the existing
     `toHaveAttribute("href", "/jars/new")` assertion.
   - Do not modify or remove any existing assertion.

### Optional refinement (reviewer's discretion)

If the team prefers the stat math to be unit-tested in isolation, extract a pure
`computeOverview(jars, completedJars)` into `lib/overview.ts` returning
`{ totalMarbles, activeJars, longestStreak, completedCount }`, with a
`lib/overview.test.ts`. This keeps `app/page.tsx` thinner and mirrors the existing
`lib/streak.ts` + `lib/streak.test.ts` split. Not required for correctness; the inline
approach matches the current `JarCard` convention.

## Validation Strategy

- `pnpm tsc` — no type changes to data model; the new local components are typed from
  `Jar` (`lib/storage.ts`). Must pass clean.
- `pnpm test` — the three existing `page.test.tsx` cases plus the new stat / button
  assertions. Verify the seed totals (27 / 3 / 3 / 0 and 5 / 1 / 0 / 1) match the
  rendered tiles. The empty-state test must still pass synchronously (the `hydrated`
  effect flushes under `act`).
- `pnpm build` — Next static build of `/` (and the untouched `/jar`, `/jars/new`)
  succeeds.
- Visual / Playwright check (manual): (a) with seeded jars, no empty-state flash on
  reload — a skeleton shows until hydration; (b) "+ New jar" sits in the header row with
  no overlap and is reachable by Tab with a visible focus ring; (c) the four stats read
  correctly; (d) toggling `prefers-reduced-motion` stops the skeleton pulse.

## Risks and Mitigations

- **Empty-state flash regression** → gated behind `hydrated`; skeleton renders first.
  Locked by the render-branch order (skeleton → empty → dashboard).
- **Skeleton breaking the synchronous empty-state test** → RTL flushes effects in
  `act`, so `hydrated` is `true` by the time assertions run; the same pattern already
  works for `hasLoaded` in `app/jar/page.tsx`. Called out so the implementer doesn't
  "fix" it by removing the gate.
- **Ambiguous stat assertions** → distinct labels + `within(tile)` scoped queries avoid
  collisions with the streak badge / `N / target` count line.
- **Mis-counting active vs completed** → assumptions enumerated above; "kept on
  display" jars (have `completedAt` but live in `jars`) intentionally count as active,
  matching their on-screen placement. Trophy Shelf count uses the `completed` list only.
- **Reduced-motion** → use `motion-reduce:animate-none` on the pulse, consistent with
  the existing `@media (prefers-reduced-motion: reduce)` block in `app/globals.css`.
- **Scope creep into shared components** → all changes live in `app/page.tsx` + its
  test; the global header and `lib/*` are untouched.

## Success Criteria (acceptance)

- [ ] Dashboard shows the overview stats — total marbles, active jars, longest current
  streak, completed count — computed correctly (verified against the seeded test:
  27 / 3 / 3 / 0).
- [ ] No empty-state flash on load for a user who has jars — a skeleton shows until
  hydration completes; "still loading" is distinct from "genuinely empty".
- [ ] "+ New jar" is in normal page flow (not `fixed`), does not overlap the global
  header, and is keyboard/focus accessible (visible focus ring via `buttonClasses`).
- [ ] Empty state, grid, and Trophy Shelf use the shared primitives (`cardClasses` /
  `buttonClasses` / `Badge`) and `<Jar>`.
- [ ] `pnpm tsc`, `pnpm test`, `pnpm build` pass; no existing test weakened or removed.
</content>
</invoke>
