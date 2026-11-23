# Implementation Plan — Chromium smoke test for the core jar flow

Closes #94

## Approach

Add one Playwright suite against the [Next.js static export](https://nextjs.org/docs/app/guides/static-exports) at `/streak-jar/` (`next.config.ts:3–6`), without changing application behavior. Existing jsdom tests cover the form redirect and the detail handlers separately (`app/jars/new/__tests__/page.test.tsx:30`, `app/jar/__tests__/page.test.tsx:54,327,397`); the browser suite catches failures between routes and across reloads. Browser localStorage remains authoritative: seed only prior history for the completion case, as `{ jars, completed }` under `JARS_STORAGE_KEY` from `lib/storage.ts:1–43,83–91`, not the supported legacy array.

## Steps

1. **Modify `package.json` and `pnpm-lock.yaml`.** Add dev-only `@playwright/test` and `sirv`. Add `test:e2e` to install Chromium, build, then run Playwright. **Create `scripts/serve-e2e.mjs`** to serve `out/` on loopback under the real prefix, preserving the query string and returning 404s without SPA fallback. Use the static export, not `next start`.
2. **Create `playwright.config.ts`.** Launch and stop the static server with Playwright, wait on the prefixed home URL, and refuse server reuse. Match only `e2e/*.e2e.ts` outside Vitest discovery. Run headless Chromium with one worker, no retries, and a 100-second suite cap. Retain failure traces and screenshots in a unique OS temporary output directory (explicit runner-temp path in CI).
3. **Create `e2e/jar-smoke.e2e.ts`.** Use fresh contexts, `Europe/Istanbul`, and [`page.clock.setFixedTime`](https://playwright.dev/docs/api/class-clock#clock-set-fixed-time) before navigation (01:00 local, previous UTC day; keep timers running). From the empty dashboard, use “Create your first jar” and create a named jar with target 5 and a non-default color, open its dashboard card, verify 0→1 and disabled “Done for today ✓,” then reload and reassert the same jar, count and disabled state (`app/jars/new/page.tsx:35–66`, `app/jar/page.tsx:113–185,279–315`). For the other context, use Playwright `storageState` for the app origin to seed a 4-of-5 active jar once with distinct past local dates and matching ISO timestamps. Open the card, add today’s marble, await the named celebration dialog, pour, click Back, and assert the sole matching card is inside Trophy Shelf (`app/jar/page.tsx:188–247`, `app/page.tsx:127–145`).
4. **Modify `.github/workflows/ci.yml` and `README.md`.** Append an independent `Chromium smoke` job under the existing triggers. Separate frozen dependency install, Chromium/system dependency install and build from the `pnpm exec playwright test` step. Upload its temp results on failure without masking the exit status. Document `pnpm test:e2e` in one line.

## Verification

- From the repository root, run `pnpm test:e2e` after dependency installation. Both journeys pass independently; a temporary, uncommitted failing expectation yields a nonzero exit, trace and screenshot.
- On the implementation head, confirm both named jobs pass under the PR workflow and the Playwright step takes under 120 seconds. Check the same job is wired to `main` pushes and its failure-only upload reads the configured trace/screenshot directory. Keep the existing `Typecheck & tests` commands and suite unchanged. No branch protection or product fixes (including #79).
