# Implementation Plan — Export streak history as CSV

Closes #87

This PR holds only the plan. The implement stage builds it on this same PR.

## Approach

Most of the feature is already on `main` from PR #89 (`a8941f5`, `9a5718b`, `6012054`).
`lib/history-csv.ts` builds one row per valid marble day. The Settings page has a card that
downloads it through `downloadBlob` (`app/settings/page.tsx` l.81–90, l.203–214). That code
already handles these issue rules:

- UTF-8 BOM, RFC 4180 quoting and CRLF.
- Formula guard for `= + - @`, plus tab and CR.
- One row per day, using the same `isValidDateKey` rule as `getMarbleDateSet`. Invalid entries are skipped.
- Local `HH:MM` from the earliest `at`. Legacy string entries get an empty time.
- `streak_day` follows the `shiftDateKey` consecutive-day rule.
- Active jars come before completed jars, and days within a jar run oldest first.
- Storage is read-only, and an empty store still downloads the header.

The issue was revised after that merge. The current code differs from it in three places:

1. The header is `Jar,Status,Date,Time,Streak day`. The issue requires exactly
   `jar_name,jar_status,date,time,streak_day,jar_id`, which adds a `jar_id` column.
2. The card is titled "Export streak history". The issue requires "Export history (CSV)".
3. The status message is "Streak history downloaded". The issue requires "History downloaded".

This plan is a small change to the existing module and card, not a rewrite. `loadJarStorage()`
stays the only data source, so legacy `Jar[]` storage still works. `jar_id` comes from `Jar.id`.
It goes through `toCsvCell` like every other cell, so ids from imported backups are quoted and
guarded the same way. The download keeps its filename and MIME type.

**Decision:** The button label becomes "Export history (CSV)" to match the card title. This
follows the "Export jars" card, where the title and the button use the same words.

## Steps

1. **Modify `lib/history-csv.ts`.**
   - Set `HISTORY_CSV_HEADER` to `["jar_name", "jar_status", "date", "time", "streak_day", "jar_id"]`.
   - Add `jarId: string` to `HistoryRow` and fill it in `jarRows` from `jar.id`.
   - Rename `HistoryRow.jar` to `jarName` so the field matches its column.
   - In `serializeHistoryCsv`, emit cells in header order with `jarId` last.
   - Change nothing else. Row, time and streak rules already match the issue.
2. **Modify `app/settings/page.tsx`.**
   - Set the card title and button label to "Export history (CSV)".
   - Set the status message to "History downloaded".
   - Keep the card in the "Your data" grid after "Import jars". The button never gets `disabled`.
3. **Update `lib/history-csv.test.ts`.** These are contract changes, not weaker tests:
   - Extend the existing row-expectation test with `jarId`. Add a second active jar to that fixture with marbles on Nov 1, 2, 3 and 5. Its `streak_day` values must be 1, 2, 3, 1 (DoD 6).
   - Add `@` and `+` names to the formula-guard case.
   - Add an `İ ğüşıöç` name to the formula-guard case.
   - Change the empty-store case to expect the new header after the BOM.
4. **Update `app/settings/__tests__/page.test.tsx` l.93–114.**
   - Click the "Export history (CSV)" button.
   - Expect the new header and rows that end in each jar's id.
   - Expect "History downloaded".
   - Keep the existing assertions on the filename regex and that storage is unchanged.
5. **No README or other docs change.** No other code references the header or the message
   (checked with `grep`).

## Verification

Run from `/workspace`:

- `pnpm vitest run lib/history-csv.test.ts app/settings`: the updated unit and page tests pass.
  The page test checks the button, filename, exact header, `jar_id` cells, status text and
  that storage is unchanged. On Node ≥ 25, add `NODE_OPTIONS=--no-experimental-webstorage`, as
  noted in PR #89.
- `pnpm tsc`: clean after the `HistoryRow` field change.
- **Team step, not agent work:** open the file in Excel (Windows and macOS) and Google
  Sheets with an `İ ğüşıöç` jar name (DoD 9). The 3-person task test and the 28-day issue count
  (DoD 12) also belong to the team.

## Risks

- PR #88 (`feat/316916582`) is an older, still-open implementation of #87. It adds the same
  files that are already on `main`. It would conflict and should be closed without merging.
  **This is a team step.**
