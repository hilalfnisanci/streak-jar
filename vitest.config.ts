import { defineConfig } from "vitest/config";

// Exercise local-day boundaries outside UTC by default; allow timezone matrices.
process.env.TZ ??= "Europe/Istanbul";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
