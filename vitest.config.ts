import { defineConfig } from "vitest/config";

// Exercise local calendar days in a timezone that differs from UTC.
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
