import { defineConfig } from "vitest/config";

// Exercise local-day behavior across UTC midnight in a deterministic timezone.
process.env.TZ = "Europe/Istanbul";

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
