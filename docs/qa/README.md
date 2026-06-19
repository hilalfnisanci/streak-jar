# Visual QA — Screenshot Harvest (#34)

Visual QA evidence for the Streak Jar **home** and **new-jar** pages, captured from
the running dev app (`pnpm dev`, Next.js, basePath `/streak-jar`).

| Page | Route | Screenshot |
| --- | --- | --- |
| Home | `/streak-jar/` | [`home.png`](./home.png) |
| New jar | `/streak-jar/jars/new/` | [`new-jar.png`](./new-jar.png) |

## What was exercised

- **Home** — empty-state renders: header/logo, marble color palette, the headline
  "Your jars will appear here. First marble's just a tap away.", supporting copy,
  and a working **Create your first jar** CTA linking to `/streak-jar/jars/new/`.
- **New jar** — form renders end to end: Name field (placeholder "Daily reading"),
  Target field (default `30`), 8-swatch Color picker (Coral selected by default),
  **Create jar** / **Cancel** actions, and a live "Coral jar preview" panel showing
  an empty jar.

## Result

✅ Both pages load (HTTP 200) and render correctly. No feature-related console
errors. The only console message is a benign `favicon.ico` 404 (no favicon asset),
which has no user impact.
