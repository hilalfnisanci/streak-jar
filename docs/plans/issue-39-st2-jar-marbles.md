# Implementation Plan — ST2: Signature glass jar & dimensional marbles

Closes #39

## Status

**Implemented and verified on this branch (`plan/39-st2-signature-glass-jar-dimensional-marb`).**
The work described below is realized by commit `c04e779` (`feat(jar): add shared glass jar
visual`). At the time of writing, `pnpm tsc`, `pnpm test` (37 tests, 6 files), and
`pnpm build` all pass. This document is therefore both the implementation plan *and* the
verification record: a reviewer can check the branch against each step and acceptance
criterion below.

## Summary

ST2 is the **signature visual upgrade** of the Premium-cozy redesign epic, built on the ST1
foundation (design tokens + `lib/jar-colors.ts`, merged in #43). It replaces the three flat,
duplicated `div`-based jars and flat marble dots with a single shared, premium **glass jar +
dimensional marbles** component used by every screen.

Three duplicated visuals — `MiniJar` (`app/page.tsx`), `LargeJar` (`app/jar/page.tsx`), and
`JarPreview` (`app/jars/new/page.tsx`) — collapse into one `<Jar>` component
(`app/components/jar.tsx`) with three variants: `mini`, `large`, `preview`. The glass body
and marble dimensionality are pure CSS (gradients, layered inset shadows, pseudo-element
highlights) in `app/globals.css`, so there is no new asset pipeline and no runtime cost
beyond a few extra DOM nodes per jar.

The hard constraint throughout: **no behavioral regression**. Fill percentage, marble
counts, the marble-slice windows per variant, `role="img"` + `aria-label`, reduced-motion
handling, and the `large`-variant marble-drop animation hook must all match current
behavior exactly. The actual drop-spring tuning is deferred to ST5 — ST2 only preserves the
entry point so ST5 has something to tune.

## Scope and Assumptions

In scope (and only this):

- New `app/components/jar.tsx` exporting a single `Jar` component with a discriminated-union
  prop type for the `mini` / `large` / `preview` variants, plus the shared
  `getJarFillPercent` helper.
- Glass + marble styling added to `app/globals.css` under a `.jar*` block (BEM-ish class
  names), including the `@keyframes jar-marble-drop` hook and `prefers-reduced-motion`
  overrides.
- Migrate the three pages to render `<Jar … />` and delete the inline `MiniJar` /
  `LargeJar` / `JarPreview` definitions.
- A component test (`app/components/__tests__/jar.test.tsx`) locking down fill %, marble
  counts/slices, the drop hook, and the preview aria label.

Out of scope (do not touch):

- `app/components/celebration-modal.tsx`, `app/components/header.tsx`, and the streak/day
  grid on the detail page — ST2 is the jar visual only.
- Drop-spring physics/tuning (ST5). ST2 keeps the `jar__marble--drop` hook in place but does
  not refine the animation.
- The `lib/jar-colors.ts` palette and the `fillPercent` math semantics — consumed as-is from
  ST1; the per-color classes used are `color.fill` (fill band), `color.solid` (marble body),
  `color.jarFill` (preview tint), and `color.label` (preview aria text).

Assumptions:

- ST1 is merged (it is — #43), so `getJarColor` and the design tokens (`--ink`, radius/shadow
  scale, per-color tint/shade steps) exist.
- `MarbleEntry` and `Jar` types live in `lib/storage.ts` and are imported, not redefined.
- The fill-percentage formula stays `Math.min(100, Math.round((count / target) * 100))` with
  `target <= 0 → 0`, matching pre-ST2 behavior.

## Affected Areas

| File | Change |
| --- | --- |
| `app/components/jar.tsx` | **New.** `Jar` component + `getJarFillPercent` + marble-key helper. |
| `app/globals.css` | **Add** `.jar*` glass/marble styles, `@keyframes jar-marble-drop`, reduced-motion overrides, per-variant sizing + responsive `@media (min-width: 640px)` for `large`. |
| `app/page.tsx` | Remove inline `MiniJar`; render `<Jar variant="mini" … />` inside `JarCard`. |
| `app/jar/page.tsx` | Remove inline `LargeJar`; render `<Jar variant="large" … />`; keep `getJarFillPercent` import for the "N% full" caption. |
| `app/jars/new/page.tsx` | Remove inline `JarPreview`; render `<Jar variant="preview" color={selectedColor.key} />`. |
| `app/components/__tests__/jar.test.tsx` | **New.** Behavior lock-in tests. |

## Implementation Steps (ordered)

1. **Create the component** (`app/components/jar.tsx`).
   - Import `cn` (`lib/cn`), `getJarColor` (`lib/jar-colors`), and `type MarbleEntry`
     (`lib/storage`).
   - Define a discriminated union: `FilledJarProps` (`variant: "mini" | "large"`, plus
     `color`, `marbles: MarbleEntry[]`, `name`, `target`) and `PreviewJarProps`
     (`variant: "preview"`, `color`), intersected with `{ className?: string }`. This makes
     `marbles`/`name`/`target` required for filled jars and absent for the preview at the
     type level.
   - Export `getJarFillPercent(marbleCount, target)`: return `0` when `target <= 0`, else
     `Math.min(100, Math.round((marbleCount / target) * 100))`.
   - Compute, inside `Jar`: `color = getJarColor(props.color)`; `isPreview`; `fillPercent`
     (0 for preview); `visibleMarbles` — **`mini` shows `marbles.slice(0, 12)`**, **`large`
     shows `marbles.slice(-24)`** (latest 24), preview shows none; `ariaLabel` —
     `` `${color.label} jar preview` `` for preview, else
     `` `${props.name} jar is ${fillPercent}% full` ``.
   - Render a `role="img"` root carrying `aria-label`, `cn("jar", \`jar--${variant}\`,
     className)`. Children (all `aria-hidden`): `jar__neck`, `jar__rim`, `jar__body`
     containing either `jar__preview-tint` (preview) or `jar__fill` with
     `style={{ height: \`${fillPercent}%\` }}`, then `jar__base`, the `jar__marbles` grid
     (each marble `cn("jar__marble", variant === "large" && "jar__marble--drop",
     color.solid)`), and `jar__reflection`.
   - Stable marble keys: `marble.date`-`marble.at` for object entries, `\`${marble}-${index}\``
     for legacy string entries.

2. **Add the styling** (`app/globals.css`).
   - `.jar` is `position: relative`; `.jar__neck/__rim/__body` get the glass border
     (`color-mix(in srgb, var(--ink) 68%, transparent)`).
   - **Glass body**: diagonal `linear-gradient` tinted toward the ST1 mint/cream, layered
     `box-shadow` insets (left highlight, right shade, bottom inner shadow) + an outer soft
     drop shadow. A `jar__reflection` streak (rotated, white→transparent gradient) and the
     `jar__fill::after` specular sweep sell the glass read.
   - **Dimensional marbles**: `.jar__marble` is a circle with layered `box-shadow`
     (inset bottom-right shade + inset top-left light + outer drop shadow) and a
     `::after` specular dot (top-left, blurred). Marble color comes from `color.solid`.
   - Per-variant sizing for `--mini` / `--large` / `--preview` (body radius, neck/rim
     dimensions, marble grid `grid-template-columns` + gap + marble size). `--large` gets a
     `@media (min-width: 640px)` bump (taller body, 6-column marble grid).
   - `@keyframes jar-marble-drop` + `.jar__marble--drop` animation (the ST5 hook).
   - `@media (prefers-reduced-motion: reduce)`: disable `.jar__fill` transition and the
     `.jar__marble--drop` animation (alongside the existing confetti override).

3. **Migrate `app/page.tsx`** — delete inline `MiniJar`; in `JarCard` render
   `<JarVisual color={jar.color} marbles={jar.marbles} name={jar.name} target={jar.target}
   variant="mini" />` (alias the import as `JarVisual` to avoid colliding with the `Jar`
   storage type).

4. **Migrate `app/jar/page.tsx`** — delete inline `LargeJar`; import
   `{ getJarFillPercent, Jar as JarVisual }`; render the `large` variant; keep the existing
   `fillPercent = getJarFillPercent(jar.marbles.length, jar.target)` for the visible
   "N% full" caption so the on-screen number and the aria label stay in sync.

5. **Migrate `app/jars/new/page.tsx`** — delete inline `JarPreview`; render
   `<JarVisual color={selectedColor.key} variant="preview" />`.

6. **Add tests** (`app/components/__tests__/jar.test.tsx`) — assert: `mini` with 13 marbles /
   target 30 → "43% full" aria label and exactly 12 rendered `.jar__marble`; `large` with 25
   marbles → "83% full", 24 marbles, and a `.jar__marble--drop` present; `preview` →
   "Sage jar preview", 0 marbles; and `getJarFillPercent` edge cases (`(4,0)→0`, `(8,4)→100`).

## Validation Strategy

- `pnpm tsc` — the discriminated union must reject passing `marbles`/`name`/`target` to a
  `preview` jar and require them for `mini`/`large`. **(Passes.)**
- `pnpm test` — the new jar tests plus the existing page tests (`app/__tests__/page.test.tsx`,
  `app/jar/__tests__/page.test.tsx`, `app/jars/new/__tests__/page.test.tsx`) confirm no
  regression in fill %, counts, or aria labels. **(37 tests pass.)**
- `pnpm build` — Next static export succeeds for `/`, `/jar`, `/jars/new`. **(Passes.)**
- Visual check (manual / Playwright): on home, detail, and new-jar screens the jar reads as
  glass (gradient + highlight streak) and marbles read as dimensional (shaded + shadowed +
  specular dot). Optionally toggle `prefers-reduced-motion` to confirm the drop animation and
  fill transition are suppressed.

## Risks and Mitigations

- **Behavioral drift in marble windows / fill math** → locked by tests asserting the exact
  slice limits (12 for `mini`, latest-24 for `large`) and percentages.
- **Type-name collision** (`Jar` component vs `Jar` storage type) → import the component as
  `JarVisual` on every page; verified by `tsc`.
- **Accessibility regression** → `role="img"` + the exact `"<name> jar is N% full"` /
  `"<label> jar preview"` labels are asserted via `getByRole("img", { name })`.
- **Overrunning into ST5** → only the `jar__marble--drop` hook + keyframes are added; no
  spring tuning, so ST5 has a clean entry point.
- **CSS-only dimensionality looking flat on some displays** → layered inset+outer shadows and
  a pseudo-element specular highlight per marble, validated visually across the three screens.

## Success Criteria (acceptance)

- [x] One `<Jar>` renders all three contexts; `MiniJar` / `LargeJar` / `JarPreview` removed
  (no remaining definitions in `app/` or `lib/`).
- [x] Jar reads as glass (gradient + highlight); marbles read as dimensional (shaded,
  shadowed, specular) — verifiable on home, detail, and new-jar.
- [x] Fill percentage and marble counts match current behavior exactly (tests: 43% / 12,
  83% / 24, preview 0).
- [x] `aria-label` + `role="img"` + reduced-motion behavior preserved; `large` keeps the
  marble-drop hook.
- [x] `pnpm tsc`, `pnpm test`, `pnpm build` pass.
