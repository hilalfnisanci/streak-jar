# Issue #81: Daily jar reminders

## Approach

Keep scheduling in the static app (`next.config.ts:3–6`) and use a [service worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification) only to display notifications and handle clicks. **Scope assumption: a Streak Jar tab must be open and able to run.** Catch up after suspension only on the same local day. Closed-tab delivery would require [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), a backend scheduler, and synced eligibility; browser-only scheduling does not provide it. At dispatch, reread browser storage. Mirror detail's rule (`app/jar/page.tsx:138–160,235–238`): only opted-in active, unfinished, non-full jars lacking today's valid local marble date qualify. Skip the entire check when required storage is unreadable.

## Steps

1. Modify `lib/storage.ts` for a strict reminder read supporting legacy arrays and normalized lists without changing existing readers. Create `lib/reminders.ts` for settings, eligibility and dispatch. Use `getLocalDateKey` and `getMarbleDateSet`, not UTC timestamps. Creation, add, completion and import already write through `saveJarStorage`; fresh reads see those writes without changing them.
2. Modify `app/jars/new/page.tsx:56–66`: after successfully saving the first jar (both lists previously empty), show Enable/Not now before redirecting home. Request permission from Enable; grant opts in that jar alone. Modify `app/jar/page.tsx` for the toggle (another explicit opt-in entry point) and `app/settings/page.tsx` for the shared time. Show blocked/unavailable status for denied permission or missing APIs; never block jar use or re-prompt automatically.
3. Create `app/components/reminder-scheduler.tsx`; mount it in `app/layout.tsx:31–37`. Recompute local deadlines on timer, focus, visibility and same-/cross-tab settings changes. Under one app-scoped Web Lock, merge preference writes and claim each jar/day before display; release the claim on confirmed display failure. Create `public/reminders-sw.js` and expose the existing base path from `next.config.ts` for registration. On click, focus an exact-match tab or open the scoped jar URL. Document availability in `README.md`.
4. Extend `app/{jars/new,jar,settings}/__tests__/page.test.tsx` for consent and settings. Create `app/components/__tests__/reminder-scheduler.test.tsx` for clock, storage and competing dispatch behavior.

## Verification

From `/workspace`:

- `pnpm test app/jars/new/__tests__/page.test.tsx app/jar/__tests__/page.test.tsx app/settings/__tests__/page.test.tsx app/components/__tests__/reminder-scheduler.test.tsx`: verify post-save consent/decline, persisted time and toggles, and unchanged backups. With fake time, combine both marble formats, a fresh write from another tab, completed/full jars and an eligible jar. Expect one eligible notification across tabs on same-day resume, none on unreadable storage or for yesterday.
- `pnpm dev`: on localhost at `/streak-jar/`, use a supported browser to verify a native notification opens the correct jar after closing its sending tab. jsdom cannot verify OS display or clicks.

## Interfaces

- Local-only `streak-jar.reminders.v1`: `{ time: string; enabledJarIds: string[]; lastClaimByJar: Record<string, string> }`. Validate 24-hour `HH:mm` (default `20:00`) and local `YYYY-MM-DD` claims. Missing opt-ins mean off; no changes to jar storage or backup v1. Imported replacements keep the local preference for the same ID, while new IDs start off.
- Notification data is `{ jarId: string }`; construct only `jar/?id=<encoded>` relative to the worker scope. Tag by jar ID and local day.
