# Visual QA — main screens (#32, #1075 demo)

Captured against the running dev build (`pnpm dev`, Next.js 15) on branch
`feat/32-qa-capture-main-screen-screenshots-1075-`.

> Note: the app sets `basePath: /streak-jar`, so the screens live under
> `http://localhost:5050/streak-jar/...`.

## Screens

| Screen | URL | Screenshot |
| --- | --- | --- |
| Home — empty state | `/streak-jar/` | `screenshots/home-empty.png` |
| New jar | `/streak-jar/jars/new/` | `screenshots/new-jar.png` |
| Home — with a jar | `/streak-jar/` | `screenshots/home-with-jar.png` |

## What was exercised

- **Home (empty):** renders the marble palette, headline, supporting copy, and
  the "Create your first jar" call to action.
- **New jar:** Name field, Target (defaults to 30), 8 color swatches, and a live
  jar preview that updates with the selected color.
- **Create flow (end to end):** filled Name = "Daily reading", Target = 30,
  selected the Sky color, clicked **Create jar** → redirected to home and the new
  "Daily reading" jar appears in the grid showing `0 / 30`.

## Findings

- No functional issues found on the captured screens.
- Console shows a single `404` for `/favicon.ico` (cosmetic, no missing favicon
  asset) — not related to these screens.
- The dark circular control at the bottom-left of each capture is the Next.js
  dev-tools overlay (development only); it is not part of the application UI.
