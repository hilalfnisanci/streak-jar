# Implementation Plan — Export and import jars as JSON

Closes #82

## Status

This PR contains only the plan. It changes no application code. The implement stage builds it on
this same PR.

## Goal (from issue #82)

All data lives only in `localStorage`, so a user who changes device loses their progress. The
issue asks for these settings-menu actions:

1. **Export:** download all jars as a JSON file.
2. **Import:** pick a file, validate it, and merge it into the local data.
   - The import validates the file against a schema.
   - When an imported jar conflicts with a local jar, the user chooses what happens.

## Existing code this builds on (verified on `main` @ `3588fd4`)

| Surface | Location | Relevance |
| --- | --- | --- |
| Storage model | `lib/storage.ts` — `JARS_STORAGE_KEY` (l.1), `MarbleEntry` (l.3–8), `Jar` (l.10–18), `JarStorage` (l.20–23) | The export/import payload is a `JarStorage`. |
| Read/normalize | `lib/storage.ts` `normalizeJarStorage` (l.27–44, private), `loadJarStorage` (l.46–64) | Export reads with `loadJarStorage()`. Legacy bare `Jar[]` is already normalized here. |
| Write | `lib/storage.ts` `saveJarStorage` (l.83–85), `saveJars` (l.87–92) | Import writes only through `saveJarStorage`. |
| Other writers of the same key | `app/jars/new/page.tsx` l.68 (`saveJars([...loadJars(), newJar])`); `app/jar/page.tsx` l.186 (add marble) and l.231 (`completeJar`) | Each one re-reads storage right before it writes. Import must do the same (see "Shared state"). |
| Jar id creation | `app/jars/new/page.tsx` `createJarId` (l.19–21): `crypto.randomUUID()` with a `jar-${Date.now()}` fallback | "Keep both" needs a new id. Use the same strategy. |
| Field rules | `app/jars/new/page.tsx` l.41–56: name is trimmed and must not be empty; target is an integer from 5 to 365 | The import schema uses the same rules. |
| Colours | `lib/jar-colors.ts` `jarColorOrder` (l.1–10), `JarColorKey` | The `color` field must be one of these keys. |
| Date keys | `lib/streak.ts` `getMarbleDateSet` (exported); the regex `dateKeyPattern` is private (l.6) | The validator needs the `YYYY-MM-DD` check (see step 1). |
| Download helper | `lib/badge-image.ts` `downloadBlob(blob, fileName)` (l.386–398): object URL, `<a download>`, revoke after 1 s | Reuse it for the JSON download. It has no badge-specific logic. |
| Local day key | `lib/local-date.ts` `getLocalDateKey` | Used for the file name date. |
| Header | `app/components/header.tsx` `Header` (l.24–37), rendered from `app/layout.tsx` l.35 on every page | Add the entry point to the settings menu here. |
| Fixed CTA | `app/page.tsx` l.113–121: "+ New jar" is `fixed right-5 top-5 z-10` | It sits on the right side of the header area on Home. The settings entry must not sit under it. |
| UI primitives | `app/components/ui` — `Button`, `buttonClasses`, `Card`, `cardClasses`, `Field`, `Badge` | Use them for every control. No new UI library. |
| Dialog pattern | `app/components/badge-sheet.tsx` l.48–95 and `app/components/celebration-modal.tsx` l.36–96: focus on open, Esc, Tab trap, `role="dialog"` with `aria-modal` | Copy this pattern for the conflict dialog. Do not refactor the existing modals. |
| Routing/build | `next.config.ts`: `output: "export"`, `basePath: "/streak-jar"`, `trailingSlash: true` | The new route is a static client page. Links must use `next/link` so that `basePath` is applied. |
| Tests | Vitest + jsdom + Testing Library (`vitest.config.ts`, `vitest.setup.ts`); patterns in `app/__tests__/page.test.tsx`, `lib/*.test.ts` | Follow them. |

There is no settings menu or settings page in the code today. This plan creates a minimal one
(step 3). No new runtime dependency is added. The schema validator is written by hand, with no
zod or similar library.

## Design decisions

### Settings menu = a new `/settings` page

- Add a new client route `app/settings/page.tsx`. It has a "Your data" section with two
  `Card`s: **Export jars** and **Import jars**. This keeps the feature on a page that is easy
  to test. A dropdown in the header would need menu focus management with no existing
  precedent in the code.
- Add the entry point to `Header`: a gear icon link (`next/link`, `href="/settings"`,
  `aria-label="Settings"`, min 44×44 px hit area) placed **in the left cluster, right after
  the brand link**. It cannot sit at the far right because the fixed "+ New jar" CTA on Home
  (`app/page.tsx` l.116) covers that spot. Moving the CTA is out of scope.
- Do **not** change the existing brand `<a href="/">` in the header. (It skips `basePath`.
  That is an existing issue and out of scope.)

### Backup file format (versioned envelope)

```json
{
  "app": "streak-jar",
  "version": 1,
  "exportedAt": "2026-11-13T09:30:00.000Z",
  "data": { "jars": [ /* Jar */ ], "completed": [ /* Jar */ ] }
}
```

- File name: `streak-jar-backup-YYYY-MM-DD.json`, using the local date key. The MIME type is
  `application/json`. The JSON is pretty-printed with 2-space indentation.
- `data` is exactly `loadJarStorage()`. Export never changes storage.
- Export works even when the user has no jars (both lists empty). The button is never
  disabled, so the user can always get a file.

### Import schema (strict validation, nothing written on failure)

The parser takes the file text and returns either a validated `JarStorage` or a list of errors.
If there is any error, nothing is written.

| Path | Rule |
| --- | --- |
| file | ≤ 1 MB (`file.size` checked before reading); must be valid JSON |
| root | object; `app === "streak-jar"`; `version === 1` (a higher number gives the error "made by a newer version"); `data` is an object |
| `data.jars`, `data.completed` | arrays (each may be empty) |
| `jar.id` | non-empty string |
| `jar.name` | string, not empty after `trim()`; the trimmed value is stored |
| `jar.target` | integer, 5 ≤ target ≤ 365 (same as the create form) |
| `jar.color` | one of `jarColorOrder` |
| `jar.marbles` | array; each item is a `YYYY-MM-DD` string **or** `{ date: YYYY-MM-DD, at: string }` (same two shapes as `MarbleEntry`) |
| `jar.createdAt` | string that `Date.parse` accepts |
| `jar.completedAt` | optional; if present, a string that `Date.parse` accepts |
| ids | unique across `data.jars` ∪ `data.completed` |

- Unknown extra properties on a jar are dropped. The validator builds new `Jar` objects with only
  the known fields, so imported data cannot add arbitrary keys to storage.
- Each error message names the path, for example `data.jars[2].target: must be a whole number
  from 5 to 365`. The UI shows the first 5 errors plus "and N more". The page and its strings
  are in English, like the rest of the app.
- Round trip: an export of valid storage always passes the import validation. The test in
  step 6 covers this.

### Conflicts and merging

- **Conflict:** an imported jar has the same `id` as a local jar in `jars` or `completed`, and
  the two are **not** identical. Equality is checked field by field on the validated fields,
  with marbles compared in order. An identical jar is not a conflict. It is skipped silently
  and counted as "already up to date".
- When there are conflicts, a dialog lists each one. It shows the jar name, marbles/target and
  completed state for **This device** and for **Backup file**. Each conflict has a radio group
  with three choices:
  - **Keep mine** (default): the local jar stays as it is.
  - **Use backup**: the imported jar replaces the local one. It moves to the list it was in
    inside the backup (`jars` or `completed`) and is removed from the other list.
  - **Keep both**: the imported jar is added with a new id (`createJarId` strategy) to its
    backup list.
  The dialog also has "Keep mine for all" and "Use backup for all" shortcuts, plus
  **Import** and **Cancel** buttons. Cancel writes nothing.
- **Non-conflicting** imported jars are appended to the end of the list they were in inside the
  backup.
- After a successful import, the page shows a status message (`role="status"`), for example
  "Imported 3 jars, replaced 1, kept 2 of yours, 1 already up to date". If there are no
  conflicts, the import is applied directly without a dialog and shows the same summary.

### Shared state (single storage key)

`streak-jar.jars` already has three writers, listed in the table above. The import is a fourth
writer and replaces the whole container. To avoid overwriting changes made in another tab
between file selection and confirmation, the apply step **re-reads `loadJarStorage()` at
confirm time**. It then runs the merge against that fresh state and writes once through
`saveJarStorage`. If a chosen resolution refers to an id that no longer conflicts, the jar is
treated as non-conflicting. Export does not write. No new storage key, URL parameter or global
store is added.

## Files to change or add

| File | Change |
| --- | --- |
| `lib/storage.ts` | No change. The import uses its own strict validator, not the lenient `normalizeJarStorage`. |
| `lib/streak.ts` | Export the existing `dateKeyPattern` (l.6) with no behaviour change, so the validator can reuse it instead of copying the regex. |
| `lib/jar-id.ts` (new) | `createJarId()`, moved from `app/jars/new/page.tsx` l.19–21 with the same body. |
| `app/jars/new/page.tsx` | Import `createJarId` from `lib/jar-id.ts` instead of the local function. No behaviour change. |
| `lib/backup.ts` (new) | Pure envelope, validation and merge logic (step 1). |
| `lib/backup.test.ts` (new) | Unit tests (step 6). |
| `app/settings/page.tsx` (new) | Settings page with export and import (step 3). |
| `app/components/import-conflict-dialog.tsx` (new) | Conflict resolution dialog (step 4). |
| `app/components/header.tsx` | Gear `Link` to `/settings` (step 2). |
| `app/settings/__tests__/page.test.tsx` (new) | Page behaviour tests (step 6). |
| `README.md` | Add one line about backup and restore **only if** the README has a features list. Check before editing. |

There is no storage schema change and no migration.

## Step 1 — `lib/backup.ts` (pure)

```ts
export const BACKUP_APP_ID = "streak-jar";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 1_000_000;

export type JarBackup = {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: JarStorage;
};

export function createBackup(storage: JarStorage, now: Date): JarBackup;
export function serializeBackup(backup: JarBackup): string;          // JSON.stringify(…, null, 2)
export function getBackupFileName(today: string): string;            // streak-jar-backup-${today}.json

export type ParseResult =
  | { ok: true; storage: JarStorage }
  | { ok: false; errors: string[] };
export function parseBackup(text: string): ParseResult;              // JSON.parse + validate

export type JarLocation = "jars" | "completed";
export type JarConflict = {
  id: string;
  local: Jar; localIn: JarLocation;
  incoming: Jar; incomingIn: JarLocation;
};
export type ConflictChoice = "local" | "incoming" | "both";

export function findConflicts(local: JarStorage, incoming: JarStorage): JarConflict[];

export type MergeSummary = {
  added: number;      // new ids + "both" copies
  replaced: number;   // "incoming"
  kept: number;       // "local"
  unchanged: number;  // identical, skipped
};
export function mergeBackup(
  local: JarStorage,
  incoming: JarStorage,
  choices: Record<string, ConflictChoice>,  // missing id ⇒ "local"
  createId: () => string,
): { storage: JarStorage; summary: MergeSummary };
```

- `mergeBackup` does not change its inputs. Local jars keep their order. Appended jars keep the
  order they had in the backup.
- `parseBackup` collects every error (it does not stop at the first one) and returns them in
  document order.
- These functions do not use `window`, `localStorage` or the clock. The current time is passed
  in.

## Step 2 — Header entry point

In `app/components/header.tsx`, wrap the brand in a `flex items-center gap-2` container and add
a gear `Link` next to it:

```tsx
<Link aria-label="Settings" href="/settings" className={buttonClasses({ variant: "ghost", size: "sm", className: "h-11 w-11 p-0" })}>
  <GearGlyph />   {/* inline SVG, aria-hidden, stroke-ink like JarGlyph */}
</Link>
```

`Header` stays a server component, because `next/link` works there.

## Step 3 — `app/settings/page.tsx`

The page is `"use client"`. Its layout follows `app/jars/new/page.tsx`: `section` with
`max-w-3xl px-5 pb-16 pt-6` and an `h1` with "Settings". It has one section, "Your data", with
two cards:

1. **Export jars**: one line of help text ("Download a backup file you can import on another
   device."). The **Export jars** button runs:
   `downloadBlob(new Blob([serializeBackup(createBackup(loadJarStorage(), new Date()))], { type: "application/json" }), getBackupFileName(getLocalDateKey(new Date())))`.
   Afterwards the page shows the status "Backup downloaded".
2. **Import jars**: one line of help text. The file input is visually hidden
   (`accept="application/json,.json"`) and the **Choose file** button triggers it. When the
   user picks a file:
   - If `file.size > MAX_BACKUP_BYTES`, show the error "This file is too large to be a Streak
     Jar backup."
   - Otherwise run `await file.text()` and then `parseBackup`. On failure, show the error list
     in an `role="alert"` region. Nothing is written.
   - On success, run `findConflicts(loadJarStorage(), parsed)`. If there are no conflicts, apply
     the import right away. If there are conflicts, open `ImportConflictDialog`.
   - Reset the input value after every attempt, so picking the same file again triggers
     `change` again.
   - Apply means `const fresh = loadJarStorage(); const { storage, summary } = mergeBackup(fresh, parsed, choices, createJarId); saveJarStorage(storage);`
     and then the summary status message.
   - If the user cancels, close the dialog and show the status "Import cancelled. Nothing was
     changed."
   - The page has a "Back to jars" `Link` to `/`.

## Step 4 — `app/components/import-conflict-dialog.tsx`

- Props: `conflicts: JarConflict[]`, `onConfirm(choices)`, `onCancel()`.
- The a11y behaviour copies `badge-sheet.tsx`: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` set to the title "Some jars are already on this device". Focus moves to the
  first radio when the dialog opens. Esc means cancel. Tab is trapped inside the dialog.
- One `fieldset` per conflict, with a `legend` holding the jar name. Each fieldset has a short
  side-by-side comparison of "This device" and "Backup file": `{marbles.length} / {target}`,
  "Complete" `Badge` when `completedAt` is set, and the name when the names differ. It also has
  three native radio inputs (`name={`conflict-${id}`}`) labelled "Keep mine", "Use backup" and
  "Keep both".
- The body scrolls (`max-h-[70vh] overflow-y-auto`), so many conflicts still fit on a phone.

## Step 5 — Styling

Use only the existing Tailwind tokens (`bg-cream`, `text-ink`, `text-soft-ink`, `border-line`,
`text-coral` for errors, the same as `Field`). No `globals.css` change is expected. If the dialog
needs an entry animation, add a reduced-motion opt-out the same way as the existing
`@media (prefers-reduced-motion: reduce)` block.

## Step 6 — Tests

Keep the list small and focused on behaviour. Each case below names the failure it catches.

`lib/backup.test.ts`
1. **Round trip:** `parseBackup(serializeBackup(createBackup(storage, now)))` returns the same
   `storage`, including legacy string marbles, `{date, at}` marbles and a completed jar. This
   catches an export that cannot be imported again.
2. **Rejection** (one table, each row a different rule): invalid JSON; wrong `app`;
   `version: 2`; missing `data.completed`; `target: 3`; unknown `color`; malformed marble date;
   duplicate id across `jars`/`completed`. Each row asserts that the error is returned and that
   its message contains the path.
3. **Sanitizing:** an extra property on a jar is dropped, and a name with spaces around it is
   trimmed.
4. **Conflicts:** an identical jar with the same id is not a conflict. A changed jar with the
   same id is a conflict, and `localIn`/`incomingIn` are correct.
5. **Merge:** one scenario covers all three choices plus a new jar and an identical jar. It
   checks the resulting `jars`/`completed` contents and order, a "both" copy with the injected
   id, a "Use backup" move from `jars` to `completed`, the summary counts, and that the inputs
   were not changed.

`app/settings/__tests__/page.test.tsx` (jsdom; `URL.createObjectURL`/`revokeObjectURL` stubbed
with `vi.fn`, the way `downloadBlob` needs them; upload with `fireEvent.change` and a `File`)
1. **Export:** clicking "Export jars" creates a Blob whose text parses to an envelope with the
   seeded storage, and the link's `download` is `streak-jar-backup-<today>.json`.
2. **Invalid import:** an alert lists the error and `localStorage` stays unchanged.
3. **Conflict flow:** the dialog appears. The user chooses "Use backup" for one jar and leaves
   the other at its default. After Import, storage holds the merged result and the summary
   status shows. This test also seeds a write to `localStorage` **after** the file is chosen and
   before Import, and checks that the write survives (the confirm-time re-read).
4. **Cancel:** Cancel in the dialog leaves storage unchanged.

`app/__tests__/page.test.tsx` and the other existing tests: no change is expected. The header is
rendered by the layout, not by `Home`. Add no header snapshot test.

## Validation for the implement stage

- Run the focused tests: `pnpm vitest run lib/backup.test.ts app/settings/__tests__/page.test.tsx app/jars/new/__tests__/page.test.tsx`
  (the last file because `createJarId` moves out of it).
- `pnpm tsc` and the full `pnpm test`/`pnpm build` belong to CI.

## Out of scope

- Cloud sync, accounts, or automatic backups.
- Changing the existing brand link (`basePath`) or the "+ New jar" CTA position.
- Refactoring the duplicate date helpers in `app/jar/page.tsx`.
- Importing the legacy bare `Jar[]` format or raw `localStorage` dumps. Only the versioned
  envelope (`version: 1`) is accepted. A future `version: 2` will need its own migration in
  `parseBackup`.

## Open points for the team (not blocking)

- **Placement of the settings entry:** this plan uses a gear next to the brand, because the
  "+ New jar" CTA covers the top-right corner. A designer may prefer another spot. The change
  is limited to `header.tsx`.
- **Default conflict choice:** this plan defaults to "Keep mine", so the local data is safe.
  If the owner wants "Use backup" as the default, only the `mergeBackup` fallback and the
  initial radio state change.
