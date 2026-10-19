import { defineConfig } from "vitest/config";

// Pin a non-UTC timezone to exercise the reported after-midnight regression.
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
