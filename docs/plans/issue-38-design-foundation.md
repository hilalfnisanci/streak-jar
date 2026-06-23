# Implementation Plan — ST1: Design foundation (web fonts, tokens & shared UI primitives)

Closes #38

## Summary

ST1 is the **foundation** stage of the Premium-cozy redesign epic (ST2–ST5 build on it).
It does **not** redesign any screen. It establishes the design system and removes
duplication so later stages are fast and consistent. Four pieces:

1. **Web fonts via `next/font`** — load a display serif (Fraunces) for headings and a
   neutral sans (Inter) for body, self-hosted via `next/font/google`, wired into the
   Tailwind v4 theme (`--font-heading` / `--font-sans`) and `app/layout.tsx`.
2. **Token refinement** in `app/globals.css` — keep the cream + pastel palette, but add a
   consistent radius scale, a soft warm elevation token, and per-color tint/shade steps as
   **additive** theme tokens (no restyle of existing screens — that is ST2–ST5).
3. **Shared UI primitives** in a new `app/components/ui/` — `Button`, `Card`, `Badge`,
   `Input` + `Field`, plus a tiny `cn()` class helper. Replace the hand-rolled, repeated
   class strings on `app/page.tsx`, `app/jar/page.tsx`, `app/jars/new/page.tsx`.
4. **Single `jarColors` source of truth** in a new `lib/jar-colors.ts` — one map consumed
   everywhere; delete the three duplicated definitions.

The hard constraint throughout: **no visual or behavioral regression** vs current screens,
and `pnpm tsc`, `pnpm test`, `pnpm build` must all pass. This is a refactor + type-polish,
not a redesign.

## Scope and Assumptions

In scope (and only this):
- Add `next/font` heading + body fonts and wire the two CSS variables.
- Add additive design tokens (radius, soft-warm shadow, per-color tint/shade) to
  `@theme` in `globals.css` without changing any currently-rendered utility.
- Create `app/components/ui/` primitives and `lib/cn.ts`.
- Create `lib/jar-colors.ts` and migrate the three pages to it.
- Migrate the button/card/badge/input/field class strings on the three named pages to the
  primitives.

Explicitly **out of scope** (do not touch — keeps blast radius small and avoids
regressions; later stages own these):
- `app/components/celebration-modal.tsx` and `app/components/header.tsx` — they contain
  button/pill-like strings but are **not** in acceptance criterion #2's list of three
  pages. Leave them as-is for ST2+.
- Any layout, copy, spacing, or color change visible on screen. No screen redesign.
- `lib/storage.ts`, `lib/streak.ts`, and all test files (tests are the regression net;
  do not weaken them).

Assumptions:
- The project uses **relative imports** (no `@/` path alias in `tsconfig.json`); new
  modules will be imported relatively, matching the existing style
  (e.g. `../lib/storage`, `./components/ui/button`).
- Tailwind v4 auto-detects source files, so full **literal** class strings moved into
  `lib/jar-colors.ts` and `app/components/ui/*` are still scanned and generated. All color
  classes must stay complete literals (e.g. `"bg-coral/35"`), never interpolated fragments.
- `pnpm build` runs with network access at build time so `next/font/google` can fetch and
  self-host Fraunces/Inter into the static export (`output: "export"` in `next.config.ts`).
  Fonts are **not** yet in `pnpm-lock.yaml` because `next/font` downloads them at build, not
  as an npm dependency — no new package is added.

## Affected Areas

New files:
- `lib/cn.ts` — class-name join helper (no new dependency).
- `lib/jar-colors.ts` — single jar-color source of truth.
- `app/components/ui/button.tsx` — `Button` + `buttonClasses()`.
- `app/components/ui/card.tsx` — `Card` + `cardClasses()`.
- `app/components/ui/badge.tsx` — `Badge`.
- `app/components/ui/input.tsx` — `Input`.
- `app/components/ui/field.tsx` — `Field` (label + error wrapper).
- `app/components/ui/index.ts` — barrel re-export (optional convenience).

Modified files:
- `app/layout.tsx` — load fonts, apply font CSS-variable classes to `<html>`.
- `app/globals.css` — point `--font-sans`/`--font-heading` at the next/font variables;
  add additive radius / soft-warm-shadow / per-color tint-shade tokens.
- `app/page.tsx` — consume `lib/jar-colors.ts`; use `Button`/`buttonClasses`, `cardClasses`,
  `Badge`; delete local `jarColorStyles` and `emptyStateMarbleColors`.
- `app/jar/page.tsx` — consume `lib/jar-colors.ts`; use `Button`/`buttonClasses`, `Badge`,
  `cardClasses`; delete local `jarColorStyles`.
- `app/jars/new/page.tsx` — consume `lib/jar-colors.ts`; use `Button`/`buttonClasses`,
  `Input`, `Field`; delete local `marbleColors` / `MarbleColor` type.

Untouched (regression net + out of scope):
- `lib/storage.ts`, `lib/streak.ts`, all `__tests__/*`, `app/components/celebration-modal.tsx`,
  `app/components/header.tsx`, configs.

## Implementation Steps (ordered)

Work bottom-up: tokens/fonts → shared modules → page migrations → verify. Each step leaves
the build green.

### Step 1 — Web fonts via `next/font` (`app/layout.tsx` + `app/globals.css`)

In `app/layout.tsx`, import and configure the two Google fonts with distinct CSS-variable
names (do **not** reuse `--font-sans`/`--font-heading` as the next/font `variable` — that
would be self-referential against the `@theme` declaration):

```tsx
import { Fraunces, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-fraunces",
  display: "swap",
});
```

Apply both variable classes to `<html>` (keep the existing `<body>` classes exactly):

```tsx
<html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
  <body className="min-h-screen bg-cream font-sans text-ink antialiased">
```

In `app/globals.css`, change the two font entries inside `@theme inline` so the utilities
resolve to the self-hosted fonts, keeping the current system stacks only as **fallbacks**
(this satisfies "replace the system-font-only fallback chains" while avoiding FOUT/CLS):

```css
@theme inline {
  /* …existing color tokens unchanged… */
  --font-sans: var(--font-inter), "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --font-heading: var(--font-fraunces), "Palatino Linotype", "Book Antiqua", Georgia, serif;
}
```

Notes:
- The `@layer base { h1,h2,h3 { font-family: var(--font-heading); } }` rule and the
  `font-sans`/`font-heading` utility usages already in the JSX keep working unchanged — they
  now resolve through the next/font variables defined on `<html>`.
- `display: "swap"` + next/font's default `adjustFontFallback: true` emit `size-adjust`
  fallback metrics, which is what prevents the layout shift called out in the acceptance
  criteria. Do not set `adjustFontFallback: false`.

### Step 2 — Additive design tokens (`app/globals.css`)

Add a radius scale, a soft warm elevation token, and per-color tint/shade steps to the
`@theme` block. **Additive only** — do not redefine Tailwind's built-in `rounded-*` /
`shadow-*` scales, because the existing screens use `rounded-lg`, `shadow-sm`, `shadow-md`,
`shadow-inner`, etc., and changing those globally would be a visual regression.

Introduce, for example:

```css
@theme {
  /* radius scale for later stages to consume */
  --radius-pill: 9999px;

  /* soft warm elevation — available to ST2–ST5; existing shadows stay as-is */
  --shadow-warm: 0 1px 2px color-mix(in srgb, var(--ink) 8%, transparent),
                 0 8px 24px color-mix(in srgb, var(--ink) 6%, transparent);
}
```

For per-color tint/shade steps, add raw CSS custom properties (in `:root`) derived from the
existing base colors with `color-mix`, e.g. for each marble color a `-tint` (lighter) and
`-shade` (darker) step:

```css
:root {
  /* …existing base colors unchanged… */
  --coral-tint: color-mix(in srgb, var(--coral) 55%, white);
  --coral-shade: color-mix(in srgb, var(--coral) 80%, var(--ink));
  /* …repeat for mint, lavender, butter, sky, peach, lilac, sage… */
}
```

These are **vocabulary** for ST2–ST5; ST1 does not need to consume them on screen. Document
them in the file with a short comment block so the next stage finds them. (If the reviewer
prefers ST1 to ship zero unused tokens, the tint/shade block can be deferred to ST2 — call
this out in the PR description; the acceptance checkbox for tokens is satisfied either way
as long as the radius + elevation scale lands.)

### Step 3 — `lib/cn.ts`

Tiny dependency-free class joiner (no `clsx`/`tailwind-merge` in the project):

```ts
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
```

### Step 4 — `lib/jar-colors.ts` (single source of truth)

Reconcile the three existing maps into one. Each marble color carries every token any of
the three pages needs. Note the existing opacity values:
- `app/page.tsx`: `fill` `/35` (butter `/45`), `border` **`/60`** (butter `/70`), `tint` `/10` (butter `/15`).
- `app/jar/page.tsx`: identical except `border` **`/70`** for all colors.
- `app/jars/new/page.tsx`: `swatch` solid, `jarFill` `/30`, `border` `/70`, `preview` `/20`.

**Decision:** unify `border` to `/70` (the jar-detail value). The only resulting on-screen
change is the home-dashboard card borders going from 60% → 70% alpha — a sub-perceptible
10% opacity bump on a pastel border. This is the single intentional pixel difference and
should be noted in the PR. (Strict-zero-diff alternative: keep two border tokens,
`borderSoft` `/60` and `border` `/70`, and have `JarCard` on the dashboard use `borderSoft`.
Prefer the unified `/70` unless the reviewer wants pixel-exact dashboard borders.)

Proposed shape (all values are complete literal Tailwind classes):

```ts
export const jarColorOrder = [
  "coral", "mint", "lavender", "butter",
  "sky", "peach", "lilac", "sage",
] as const;

export type JarColorKey = (typeof jarColorOrder)[number];

export type JarColorStyle = {
  label: string;   // "Coral"          — color picker label
  solid: string;   // "bg-coral"       — marble dot, swatch, empty-state, confetti
  fill: string;    // "bg-coral/35"    — jar liquid fill (dashboard + detail)
  border: string;  // "border-coral/70"
  tint: string;    // "bg-coral/10"    — card tint
  jarFill: string; // "bg-coral/30"    — new-jar preview fill
  preview: string; // "bg-coral/20"    — new-jar preview card background
};

export const jarColors: Record<JarColorKey, JarColorStyle> = {
  coral:    { label: "Coral",    solid: "bg-coral",    fill: "bg-coral/35",    border: "border-coral/70",    tint: "bg-coral/10",  jarFill: "bg-coral/30",    preview: "bg-coral/20" },
  mint:     { label: "Mint",     solid: "bg-mint",     fill: "bg-mint/35",     border: "border-mint/70",     tint: "bg-mint/10",   jarFill: "bg-mint/30",     preview: "bg-mint/20" },
  lavender: { label: "Lavender", solid: "bg-lavender", fill: "bg-lavender/35", border: "border-lavender/70", tint: "bg-lavender/10", jarFill: "bg-lavender/30", preview: "bg-lavender/20" },
  butter:   { label: "Butter",   solid: "bg-butter",   fill: "bg-butter/45",   border: "border-butter/70",   tint: "bg-butter/15", jarFill: "bg-butter/30",   preview: "bg-butter/20" },
  sky:      { label: "Sky",      solid: "bg-sky",      fill: "bg-sky/35",      border: "border-sky/70",      tint: "bg-sky/10",    jarFill: "bg-sky/30",      preview: "bg-sky/20" },
  peach:    { label: "Peach",    solid: "bg-peach",    fill: "bg-peach/35",    border: "border-peach/70",    tint: "bg-peach/10",  jarFill: "bg-peach/30",    preview: "bg-peach/20" },
  lilac:    { label: "Lilac",    solid: "bg-lilac",    fill: "bg-lilac/35",    border: "border-lilac/70",    tint: "bg-lilac/10",  jarFill: "bg-lilac/30",    preview: "bg-lilac/20" },
  sage:     { label: "Sage",     solid: "bg-sage",     fill: "bg-sage/35",     border: "border-sage/70",     tint: "bg-sage/10",   jarFill: "bg-sage/30",     preview: "bg-sage/20" },
};

export const jarColorList = jarColorOrder.map((key) => ({ key, ...jarColors[key] }));

// Solid swatch classes in palette order (empty-state grid + confetti pieces).
export const jarColorSolids = jarColorOrder.map((key) => jarColors[key].solid);

export function getJarColor(color: string): JarColorStyle {
  return jarColors[color as JarColorKey] ?? jarColors.coral;
}
```

This collapses `getJarColorStyles` (page + jar), `emptyStateMarbleColors`, `confettiColors`
(if migrated later), and `marbleColors` into one map. (Note: `confettiColors` lives in the
out-of-scope `celebration-modal.tsx`; leave it there for now — do not migrate it in ST1.)

### Step 5 — `app/components/ui/button.tsx`

Cover all primary/secondary button strings on the three pages. Two exports: a `Button`
component (for real `<button>`s) and a `buttonClasses()` helper (for `<Link>`s that are
styled as buttons — keeps Next `Link` semantics and `role="link"` intact, which several
tests assert).

```tsx
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-lg font-semibold shadow-sm transition " +
  "focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-cream " +
  "disabled:cursor-not-allowed";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-ink text-cream hover:bg-soft-ink disabled:bg-soft-ink/45",
  secondary: "border border-line bg-white text-ink hover:border-soft-ink",
  ghost: "text-ink hover:bg-line/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",   // "Back" link
  md: "px-5 py-3 text-sm",   // default CTA
  lg: "px-5 py-4 text-base", // "Add today's marble"
};

export function buttonClasses(opts: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  const { variant = "primary", size = "md", className } = opts;
  return cn(base, variantClasses[variant], sizeClasses[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...props} />
  );
}
```

Mapping of existing call sites (preserve any extra positional/utility classes via
`className`):
- `EmptyState` "Create your first jar" `<Link>` → `buttonClasses({ size: "md" })`.
- Dashboard "+ New jar" `<Link>` → `buttonClasses({ size: "sm", className: "fixed right-5 top-5 z-10 shadow-md" })` (keep `px-4`; `sm` already gives `px-4 py-2` — adjust to `py-3` via className if exact padding matters: append `py-3`).
- `NotFoundState` "Back to jars" `<Link>` → `buttonClasses()`.
- jar "Back" `<Link>` → `buttonClasses({ variant: "secondary", size: "sm" })`.
- jar "Finish this jar" `<button>` → `<Button>`.
- jar "Add today's marble" `<button disabled>` → `<Button size="lg" className="mt-8 w-full sm:w-auto" disabled={...}>` (primary already includes `disabled:bg-soft-ink/45`).
- new-jar "Create jar" `<button type="submit">` → `<Button type="submit">`.
- new-jar "Cancel" `<Link>` → `buttonClasses({ variant: "secondary" })`.

> Match the exact padding/`shadow` of each original site by passing overrides through
> `className`; verify visually (Step 9) so no button changes size. The `acceptance` only
> forbids *hand-rolled* `bg-ink px-5 py-3 …` strings — overrides for one-off positioning are
> fine.

### Step 6 — `app/components/ui/card.tsx`

```tsx
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";

export function cardClasses(className?: string): string {
  return cn("rounded-lg border border-line bg-white shadow-sm", className);
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cardClasses(className)} {...props} />;
}
```

Call sites:
- jar-detail white info panels (`Complete` / `Jar full`) currently
  `rounded-lg border border-line bg-white/75 p-5 shadow-sm` → `<Card className="bg-white/75 p-5">…</Card>` (override `bg-white` → `bg-white/75`).
- `JarCard` (dashboard) and the jar-detail `<aside>` are **color-tinted** and one is a
  `<Link>`: use `cardClasses(cn(color.border, color.tint, "<extra layout/padding>"))` on the
  element directly so the tinted border/tint comes from `lib/jar-colors.ts`. Keep their
  hover/focus/translate classes via the `className` arg.
- new-jar `JarPreview` `<aside>` (`border-2 ... ${previewClass}`) → it uses `border-2`, not
  the Card default `border`; pass `cardClasses(cn("border-2", color.border, color.preview, "min-h-[320px] …"))` or keep it bespoke. Keeping the `border-2` weight is required to avoid a visual change — pass it explicitly.

### Step 7 — `app/components/ui/badge.tsx`

Cover the pill labels: `✓ Complete` (mint), streak `🔥` (butter), and the inline mint/butter
"in a row" / "Complete" pills.

```tsx
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";

export type BadgeTone = "success" | "streak" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  success: "border-mint/70 bg-mint/20 text-ink", // ✓ Complete (detail)
  streak: "border-butter/70 bg-butter/20 text-ink",
  neutral: "border-line bg-cream text-ink",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
```

Call sites — **preserve every `aria-label` and text node exactly** (tests assert them):
- `JarCard` "✓ Complete" ribbon (`absolute right-3 top-3 … bg-cream`) →
  `<Badge tone="success" className="absolute right-3 top-3 bg-cream">✓ Complete</Badge>`
  (override `bg-mint/20` → `bg-cream` to keep the ribbon's cream fill).
- `JarCard` streak pill (currently `aria-label={`${streakCount} day streak`}`, content
  `🔥` + count, `px-2.5 py-1`) → `<Badge tone="streak" aria-label={...} className="mt-3 px-2.5">…</Badge>`. **Keep the `aria-label` and the `🔥`/count spans verbatim** — `page.test.tsx` checks `getByLabelText("3 day streak")` → `🔥3`.
- jar-detail "✓ Complete" → `<Badge tone="success" className="mt-4 text-sm px-3">✓ Complete</Badge>` (size differs — `text-sm`, so override).
- jar-detail "N days in a row 🔥" → `<Badge tone="streak" className="mt-4 text-sm px-3">{streakCount} days in a row 🔥</Badge>`. **Text must stay exactly `{n} days in a row 🔥`** — `jar/page.test.tsx` checks `getByText("3 days in a row 🔥")` and the negative `queryByText(/days in a row/)`.

> Because several badge sites differ in `text-xs` vs `text-sm` and padding, allow those via
> `className`. Do not try to over-parameterize size into the tone — keep the primitive small
> and override per site.

### Step 8 — `app/components/ui/input.tsx` + `field.tsx`

`Input` (controlled, the page owns value/onChange/aria):

```tsx
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink",
        "shadow-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-mint/40",
        className,
      )}
      {...props}
    />
  );
}
```

`Field` — label + optional error, wired so `getByLabelText` and `aria-describedby` keep
working. It renders the label and error; the page passes the `Input` as `children` so it
keeps full control of `type`/width/value and the `aria-*` wiring:

```tsx
import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-coral" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

Call sites in `app/jars/new/page.tsx`:
- Name field →
  ```tsx
  <Field label="Name" htmlFor="jar-name" error={nameError}>
    <Input
      id="jar-name"
      value={name}
      onChange={...}
      placeholder="Daily reading"
      maxLength={60}
      required
      aria-invalid={nameError ? "true" : "false"}
      aria-describedby={nameError ? "jar-name-error" : undefined}
    />
  </Field>
  ```
- Target field → same pattern with `htmlFor="jar-target"`, `<Input type="number" className="w-36" min={5} max={365} …>`. The error `<p id="jar-target-error">` produced by `Field` matches the input's `aria-describedby`. **Keep `id`s `jar-name`/`jar-target` and error ids `*-error` exactly** — `new/page.test.tsx` uses `getByLabelText("Name")`/`("Target")` (label association) and the validation-message `getByText`s.

> The current markup nests the input directly under the field `<div>` (no wrapping
> `mt-2 div`); the wrapper above re-creates the `mt-2` spacing the original input had
> (`className="mt-2 …"`). Verify the vertical rhythm is unchanged in Step 9; if the extra
> wrapper shifts spacing, move `mt-2` onto the `Input` via `className` instead and drop the
> wrapper div.

The **color radio group** (`<fieldset>`/`<legend>` + `peer` radios) is not a text input and
is **not** migrated to `Input`/`Field`. Leave its structure; only swap its data source to
`jarColorList` from `lib/jar-colors.ts` (Step 4) and keep the `swatchClass`→`solid`,
`previewClass`→`preview`, `jarFillClass`→`jarFill`, `borderClass`→`border`, `name`→`label`
mapping. **Keep the `${color.label} jar preview` aria-label and the per-swatch `sr-only`
label text exactly** — the test checks `getByLabelText("Coral jar preview")`,
`getByLabelText("Mint")`, `getByLabelText("Sage")`.

### Step 9 — Page migrations & cleanup

For each of the three pages, in order:
1. Replace the local color map with imports from `lib/jar-colors.ts`
   (`getJarColor`, `jarColorList`, `jarColorSolids`).
2. Delete the now-dead local definitions: `jarColorStyles` + `getJarColorStyles` +
   `emptyStateMarbleColors` (`page.tsx`); `jarColorStyles` + `getJarColorStyles`
   (`jar/page.tsx`); `marbleColors` + `MarbleColor` type (`jars/new/page.tsx`).
   Map the old field names to the new ones (`dot`→`solid`; others unchanged).
3. Swap button/card/badge/input strings to the primitives per Steps 5–8.
4. Confirm no remaining hand-rolled `bg-ink px-5 py-3 …` button strings (grep).

### Step 10 — Verify (see Validation Strategy)

Run `pnpm tsc`, `pnpm test`, `pnpm build`; then a manual font/visual check.

## Validation Strategy

Automated (all must pass — acceptance criterion #5):
- `pnpm tsc` — types compile (new modules + literal-union `JarColorKey`).
- `pnpm test` — the full vitest suite (`app/__tests__/page.test.tsx`,
  `app/jar/__tests__/page.test.tsx`, `app/jars/new/__tests__/page.test.tsx`,
  `lib/streak.test.ts`) passes **unchanged**. These pin the exact accessible names, text
  nodes, label associations, `aria-label`s, hrefs, and storage shapes — they are the
  no-regression net. Do not edit them.
- `pnpm build` — Next static export succeeds and `next/font` self-hosts the fonts.

Targeted greps after migration:
- `grep -rn "jarColorStyles\|marbleColors\|emptyStateMarbleColors" app/` → only matches in
  `lib/jar-colors.ts`-derived names should remain; the three old copies are gone.
- `grep -rn "bg-ink px-" app/page.tsx app/jar/page.tsx app/jars/new/page.tsx` → no results.

Manual (acceptance criterion #1, #4 — fonts + no visual regression):
- `pnpm dev` (port 5050) and load `/`, `/jars/new`, `/jar?id=…` in a browser. Headings
  render in Fraunces, body in Inter. Use DevTools → Rendering → "disable local fonts" (or a
  clean profile) to confirm there's no system-font fallback and no visible FOUT/CLS on
  reload (Network throttled). Compare each screen side-by-side against `main` for pixel
  parity, paying attention to: dashboard card borders (the intended 60→70 alpha change),
  button sizes/padding, badge pills, and the new-jar form spacing.

## Risks and Mitigations

- **Test breakage from changed accessible names/markup.** Highest risk. Mitigation: the
  primitives are pure class wrappers; every `aria-label`, visible text, `id`/`htmlFor`,
  and `href` is preserved verbatim (called out per site in Steps 5–8). Run `pnpm test`
  after each page migration, not just at the end.
- **`getByLabelText` regression from `Field`.** If the label/input association or error `id`
  drifts, the new-jar tests fail. Mitigation: `Field` sets `htmlFor`; the page sets the
  matching `id`; error id is `${htmlFor}-error` matching the input's `aria-describedby`.
- **Tailwind not generating moved classes.** If any class becomes a non-literal fragment,
  the utility won't be generated and styling silently breaks. Mitigation: all color tokens
  in `lib/jar-colors.ts` are complete literal strings; never concatenate color + opacity.
- **Token refinement causing a global restyle.** Redefining built-in `rounded-*`/`shadow-*`
  scales would shift every screen. Mitigation: tokens are **additive** (`--shadow-warm`,
  `--radius-pill`, per-color `-tint`/`-shade`); existing utilities are untouched. ST2–ST5
  consume the new tokens.
- **next/font + static export at build.** `output: "export"` requires fonts fetched at build
  time. Mitigation: `next/font/google` self-hosts during `next build`; verified by Step 10
  `pnpm build`. No runtime/CDN font request, no new npm dependency.
- **Dashboard border alpha 60→70.** Intentional, sub-perceptible. Mitigation: documented in
  PR; zero-diff fallback (dual `border`/`borderSoft` tokens) offered in Step 4 if rejected.

## Success Criteria

Maps 1:1 to issue #38 acceptance criteria:
- [ ] Headings render in Fraunces, body in Inter, loaded via `next/font`; no FOUT/CLS in a
  fresh browser with system fonts absent.
- [ ] `app/page.tsx`, `app/jar/page.tsx`, `app/jars/new/page.tsx` import
  buttons/cards/badges/inputs from `app/components/ui/`; no hand-rolled
  `bg-ink px-5 py-3 …` button strings remain.
- [ ] Exactly one jar-color definition (`lib/jar-colors.ts`); the three previous copies
  (`jarColorStyles` ×2, `marbleColors`) are deleted.
- [ ] No visual/behavioral regression vs current screens (the one documented exception:
  dashboard card border alpha 60%→70%).
- [ ] `pnpm tsc`, `pnpm test`, `pnpm build` all pass.

## Suggested PR / commit slicing

To keep review tractable and each commit green, land in this order (each is independently
buildable and test-passing):
1. Fonts + token additions (`layout.tsx`, `globals.css`).
2. `lib/cn.ts` + `lib/jar-colors.ts` + migrate the three pages to the color source
   (no primitives yet) — deletes the three duplicate maps.
3. `app/components/ui/*` primitives + migrate the three pages' button/card/badge/input
   strings.

A single PR is acceptable given the size; the slices above are commit boundaries.
