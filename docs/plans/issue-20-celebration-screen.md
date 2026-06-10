# Implementation Plan — Full-jar celebration screen with completed state and reset

Closes #20

## Summary

When a jar reaches its target, the detail page must (1) fire a full-screen confetti
celebration modal exactly once — at the moment the final marble is added — (2) flip the
detail screen into a calm "Completed 🎉" state on subsequent visits with a **Replay
celebration** button, and (3) offer a confirmation-gated **Start a new round** button that
empties the jar and restores the normal add-marble flow. Completion is persisted on the
`Jar` shape so both the once-only auto-fire and the completed state survive reloads.

All work stays inside the existing single-detail-screen, `localStorage`-only,
Tailwind-v4/no-backend model. No archive view, no new dependency, no editing/deleting jars.

## Scope and Assumptions

In scope:
- Extend the `Jar` type with a completion marker and keep it backward compatible.
- Detect the fill-completing marble inside `handleAddToday` on `app/jars/[id]/page.tsx`,
  persist the marker, and open the modal.
- A new self-contained `CelebrationModal` component (confetti + congratulatory message),
  no external library.
- Completed-state UI (badge + Replay + confirmation-gated reset) on the detail page.
- CSS keyframes for the confetti in `app/globals.css`, including a
  `prefers-reduced-motion` fallback.
- Unit tests in the existing Vitest + Testing Library setup.

Out of scope (per issue): any archive / completed-jars list or separate view, editing or
deleting jars, undoing individual marbles, "best round" history, and changing the home
page (`app/page.tsx`) jar cards. Leave the home grid untouched.

Assumptions (all verified against the repo unless tagged):
- **Source of truth for "completed" is the persisted marker, not marble count.** The issue
  states existing jars without the field are treated as not-completed (backward compatible),
  so the completed UI is gated on `Boolean(jar.completedAt)`, never on
  `marbles.length >= target` alone. This makes the once-only behaviour unambiguous.
- The detail page is a client component (`"use client"`) reading/writing through
  `loadJars` / `saveJars` in `lib/storage.ts`. Confirmed at
  `app/jars/[id]/page.tsx:1-12,231-268`.
- There is **no path alias** (`@/`) and **no shadcn/dialog primitive** in this repo;
  imports are relative and there is no existing modal. Confirmed — `tsconfig.json` has no
  `paths`, and `app/components/` contains only `header.tsx`.
- Tests use Vitest globals + jsdom + `@testing-library/react`, with fake timers and
  `vi.setSystemTime`. Confirmed at `app/jars/[id]/__tests__/page.test.tsx:6-22` and
  `vitest.config.ts`. **Reset confirmation must be in-app UI, not `window.confirm`**, so it
  is testable in jsdom and consistent with the existing visual language.
- Scripts available: `pnpm tsc`, `pnpm test` (vitest run), `pnpm build`. Confirmed in
  `package.json`. There is no lint script.
- Color tokens (`coral`, `mint`, `lavender`, `butter`, `sky`, `peach`, `lilac`, `sage`,
  `ink`, `cream`, `soft-ink`, `line`, `glass`) are defined in `app/globals.css` and used
  via Tailwind `bg-*`/`text-*` utilities. Confirmed at `app/globals.css:3-35`.

## Affected Areas

| File | Change |
| --- | --- |
| `lib/storage.ts` | Add `completedAt?: string` to the `Jar` type. |
| `app/components/celebration-modal.tsx` | **New.** Self-contained full-screen confetti modal. |
| `app/jars/[id]/page.tsx` | Auto-fire on completion, completed-state UI, replay, reset. |
| `app/globals.css` | Confetti keyframes + `prefers-reduced-motion` fallback. |
| `app/jars/[id]/__tests__/page.test.tsx` | Extend with celebration / completed / reset cases. |
| `app/components/__tests__/celebration-modal.test.tsx` | **New (optional).** Component-level tests. |

The home page (`app/page.tsx`), the new-jar form (`app/jars/new/page.tsx`), `loadJars` /
`saveJars`, and `MarbleEntry` are **not** modified. `completedAt` being optional means
existing call sites that build `Jar` objects (e.g. `app/jars/new/page.tsx:143-150`) keep
compiling unchanged.

## Implementation Steps (ordered)

### 1. Extend the `Jar` type — `lib/storage.ts`

Add the optional marker to the type only; `loadJars` / `saveJars` already pass objects
through `JSON` untouched, so no serialization change is needed.

```ts
export type Jar = {
  id: string;
  name: string;
  target: number;
  color: string;
  marbles: MarbleEntry[];
  createdAt: string;
  completedAt?: string; // ISO timestamp set when the jar first reaches its target
};
```

Because the field is optional, jars persisted before this change deserialize with
`completedAt === undefined` and are treated as not-completed. No migration code required.

### 2. Build the celebration modal — `app/components/celebration-modal.tsx` (new)

A self-contained, dependency-free full-screen takeover. Requirements it must satisfy:

- Renders only when `open` is `true`; the parent owns the boolean.
- Full-viewport fixed overlay (`fixed inset-0 z-50`), dimmed backdrop, centered card using
  the app palette (`bg-cream`, `font-heading`, `text-ink`, `text-soft-ink`, button styled
  like the existing `bg-ink … text-cream` buttons in `app/jars/[id]/page.tsx:312-319`).
- Confetti: a fixed number (e.g. 40) of absolutely-positioned `<span>` dots cycling through
  the marble palette classes (`bg-coral`, `bg-mint`, …) animated by the CSS keyframes from
  step 4. Generate deterministic-ish offsets from the index (e.g. `left: ${(i * 37) % 100}%`,
  `animationDelay`, `animationDuration`) — **do not call `Math.random()`** so output is
  stable and tests are not flaky. Mark the confetti container `aria-hidden="true"`.
- Congratulatory copy, e.g. heading "Jar full! 🎉" and a line naming the jar
  (`jarName` prop) and target reached.
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-label` (or
  `aria-labelledby` pointing at the heading). On open, move focus to the close/done button
  (`useEffect` + `ref`). Close on the **Done**/close button click and on `Escape`
  (`keydown` listener added while open, removed on cleanup). Call an `onClose` prop.
- No auto-dismiss timer — the user dismisses it. This keeps the component free of
  `setTimeout` and avoids fake-timer flakiness in tests.

Suggested prop shape:

```tsx
type CelebrationModalProps = {
  open: boolean;
  jarName: string;
  target: number;
  onClose: () => void;
};
```

Render `null` when `!open`.

### 3. Wire the detail page — `app/jars/[id]/page.tsx`

**3a. New state and derived flag.** Alongside the existing `jar` / `hasLoaded` state
(`page.tsx:227-228`):

```tsx
const [isCelebrating, setIsCelebrating] = useState(false);
const [isConfirmingReset, setIsConfirmingReset] = useState(false);
```

Derive `const isCompleted = Boolean(jar?.completedAt);` after the null guards.

**3b. Mount must never auto-fire.** The existing mount `useEffect` (`page.tsx:231-238`)
only calls `setJar` / `setHasLoaded`. Leave it as-is — do **not** set `isCelebrating` from
it. This is what guarantees that reloading or revisiting a full jar does not re-trigger the
celebration; the modal only opens through `handleAddToday` (auto) or Replay (manual).

**3c. Fire on the completing marble inside `handleAddToday`** (`page.tsx:247-268`). After
building `updatedJar`, detect the transition and stamp the marker:

```tsx
const handleAddToday = () => {
  if (!jar || isDoneToday || jar.completedAt) {
    return;
  }

  const updatedMarbles = [
    ...jar.marbles,
    { date: today, at: new Date().toISOString() },
  ];
  const justCompleted = updatedMarbles.length >= jar.target;

  const updatedJar: Jar = {
    ...jar,
    marbles: updatedMarbles,
    ...(justCompleted ? { completedAt: new Date().toISOString() } : {}),
  };

  const updatedJars = loadJars().map((candidateJar) =>
    candidateJar.id === jar.id ? updatedJar : candidateJar,
  );

  saveJars(updatedJars);
  setJar(updatedJar);

  if (justCompleted) {
    setIsCelebrating(true);
  }
};
```

Note the added `jar.completedAt` guard at the top so a completed jar can never add more
marbles (the completed UI hides the button anyway; this is belt-and-suspenders). Setting
`isCelebrating` only inside the `justCompleted` branch is the single auto-fire point.

**3d. Replace the add affordance when completed.** Today the button block is
`page.tsx:312-319`. Branch on `isCompleted`:

- **Not completed:** keep the current "Add today's marble" / "Done for today ✓" button
  exactly as-is.
- **Completed:** render the calm completed block instead:
  - A "Completed 🎉" label/badge (use `font-heading`, palette colors).
  - **Replay celebration** button → `onClick={() => setIsCelebrating(true)}`.
  - **Start a new round** control with a confirmation gate:
    - When `!isConfirmingReset`: a "Start a new round" button →
      `onClick={() => setIsConfirmingReset(true)}`.
    - When `isConfirmingReset`: show "Start a new round? This empties the jar." with
      **Yes, reset** and **Cancel** buttons. Cancel → `setIsConfirmingReset(false)`.

Style the new buttons consistently with the existing primary (`bg-ink … text-cream`) and
secondary (`border border-line bg-white … text-ink`) button patterns already used on this
page and in `app/jars/new/page.tsx:257-270`.

**3e. Reset handler.** Add:

```tsx
const handleStartNewRound = () => {
  if (!jar) {
    return;
  }

  const { completedAt: _removed, ...rest } = jar;
  const updatedJar: Jar = { ...rest, marbles: [] };

  const updatedJars = loadJars().map((candidateJar) =>
    candidateJar.id === jar.id ? updatedJar : candidateJar,
  );

  saveJars(updatedJars);
  setJar(updatedJar);
  setIsConfirmingReset(false);
  setIsCelebrating(false);
};
```

This clears both `marbles` and `completedAt`, persists, and returns the jar to the normal
in-progress state. Because `completedAt` is gone, `isCompleted` becomes `false` and the
add-marble flow renders again. The jar can then be re-filled and will celebrate again as a
fresh round (the auto-fire condition keys off `!jar.completedAt`). Use object-rest to drop
the key rather than setting `undefined`, so the persisted JSON matches a never-completed jar
exactly (keeps `toEqual` assertions clean).

**3f. Render the modal.** At the end of the returned JSX (after `HistoryGrid`,
`page.tsx:323`), mount:

```tsx
<CelebrationModal
  open={isCelebrating}
  jarName={jar.name}
  target={jar.target}
  onClose={() => setIsCelebrating(false)}
/>
```

Import it relative: `import { CelebrationModal } from "../../components/celebration-modal";`.

### 4. Confetti keyframes — `app/globals.css`

Add a `@keyframes` for the falling/scattering motion and a small utility class the modal
references (e.g. `.confetti-piece`). Tailwind v4 here is configured via `@import
"tailwindcss"` and `@theme inline` (`app/globals.css:1-35`); add plain CSS after the
existing `@layer base` block. Include a reduced-motion guard:

```css
@keyframes confetti-fall {
  0%   { transform: translateY(-12vh) rotate(0deg); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translateY(112vh) rotate(540deg); opacity: 1; }
}

.confetti-piece {
  animation: confetti-fall linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .confetti-piece {
    animation: none;
    opacity: 0;
  }
}
```

The modal sets per-piece `animationDelay` / `animationDuration` / `left` via inline style
derived from the index. With reduced motion, pieces are hidden and only the message + button
show — the celebration still "fires", just without motion.

### 5. Tests

**5a. Extend `app/jars/[id]/__tests__/page.test.tsx`.** Follow the existing pattern: seed
`localStorage` under `JARS_STORAGE_KEY`, `render(<JarDetailPage />)`, assert via roles/text,
and read back `localStorage`. The `next/navigation` mock and fake timers
(`vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"))`) are already set up
(`page.test.tsx:6-22`). New cases:

1. **Auto-fire on the completing marble.** Seed a jar with `target: 3` and two marbles
   (none dated today, so the add button is enabled). Click "Add today's marble" →
   assert the dialog appears (`screen.getByRole("dialog")` and the congratulatory heading)
   and that `localStorage` now has `marbles.length === 3` and a string `completedAt`.
2. **No auto-fire on mount for an already-completed jar.** Seed a jar with
   `completedAt` set and `marbles.length === target`. Render → assert
   `screen.queryByRole("dialog")` is `null`, and the completed block ("Completed 🎉",
   "Replay celebration", "Start a new round") is shown instead of the add button.
3. **Replay re-opens the modal.** From the completed jar, click "Replay celebration" →
   dialog appears. Click the modal's Done/close → `queryByRole("dialog")` is `null` again.
4. **Start a new round is confirmation-gated.** Click "Start a new round" → assert the
   confirm prompt + "Yes, reset" appear and the jar is **not** yet cleared in
   `localStorage`. Click "Cancel" → back to the completed state, still not cleared.
5. **Confirmed reset clears the jar.** Click "Start a new round" → "Yes, reset" → assert
   `localStorage` jar has `marbles: []` and **no** `completedAt` key, the dialog is closed,
   and the "Add today's marble" button is back (enabled, since today's marble was cleared).
6. **Backward compatibility.** Seed a jar with no `completedAt` and partial marbles →
   assert it renders the normal in-progress add flow (regression guard for the optional
   field). The existing three tests must continue to pass unchanged.

For assertions that read `localStorage` back with `toEqual`, remember the reset path drops
the `completedAt` key entirely (step 3e), so the expected object should omit it.

**5b. Optional `app/components/__tests__/celebration-modal.test.tsx`.** Render with
`open={true}` → dialog + heading present, Done button focused; press `Escape` → `onClose`
called; render with `open={false}` → renders nothing. Keep it light; the page tests already
cover the integration.

## Validation Strategy

Run from the repo root, all must be green before the PR is review-ready:

1. `pnpm tsc` — no type errors (confirms the optional-field change and new component types).
2. `pnpm test` — all Vitest suites pass, including the three pre-existing detail-page tests
   and the new cases.
3. `pnpm build` — `next build` succeeds (catches client/server boundary or import issues;
   the new component must carry/inherit the client context — it is imported by a
   `"use client"` page, and should itself be a plain component without server-only APIs).

Manual smoke (optional, `pnpm dev` on port 5050): create a jar with a small target, add
marbles until the last one → confetti modal fires once; reload → calm Completed state, no
modal; Replay → modal reopens; Start a new round → confirm → jar empties and add flow
returns; refill → celebrates again.

## Risks and Mitigations

- **Re-firing on reload (core acceptance risk).** Mitigated by keying the auto-fire purely
  on the `handleAddToday` transition and never setting `isCelebrating` in the mount effect
  (step 3b/3c). The persisted `completedAt` drives the calm state only.
- **Backward compatibility with old jars.** `completedAt` is optional and absent → not
  completed; no migration. An old jar that is already at/over target but has no marker keeps
  the in-progress flow until a marble add triggers completion — acceptable and explicitly
  consistent with the issue's "treated as not-completed" rule. Note this edge in the PR.
- **`window.confirm` is non-interactive in jsdom.** Avoided entirely by using an in-app
  two-step confirmation, which is testable and matches the design system.
- **Flaky confetti / animation in tests.** Confetti offsets are derived from the index, not
  `Math.random()`; the modal has no auto-dismiss timer, so fake timers in the existing test
  setup are unaffected. CSS animations don't run in jsdom and aren't asserted.
- **Accidental scope creep into the home grid.** The completed marker is available on the
  `Jar` everywhere, but this plan deliberately does not touch `app/page.tsx`; surfacing a
  "Completed" badge on cards is a separate feature.
- **Focus/escape handling regressions.** Keep the modal's `keydown` listener and focus
  effect scoped to `open` and cleaned up on close/unmount to avoid leaking listeners.

## Success Criteria

1. Adding the marble that reaches `target` opens a full-screen confetti dialog with a
   congratulatory message automatically — and only that once; reloading or revisiting the
   full jar does not re-trigger it.
2. A completed jar shows a "Completed 🎉" state with a working **Replay celebration** button
   (re-opens the modal) and a **Start a new round** button that, after an in-app
   confirmation, empties the jar and restores the normal add-marble flow.
3. Completion state and the once-only behaviour persist across reloads via `localStorage`
   (`completedAt` on the `Jar`), and a reset jar can be filled and celebrated again as a
   fresh round.
4. `pnpm tsc`, `pnpm test`, and `pnpm build` all pass; the three existing detail-page tests
   are unchanged and still green; the home page and new-jar form are untouched.
