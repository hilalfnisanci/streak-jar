import { defineConfig } from "vitest/config";

// Exercise local-day behavior where 01:00 is still the previous UTC date.
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
