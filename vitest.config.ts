import { defineConfig } from "vitest/config";

// Exercise local/UTC day differences by default; allow timezone matrix runs.
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
