import { defineConfig } from "vitest/config";

// Exercise local/UTC day boundaries by default; allow other zones in CI.
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
