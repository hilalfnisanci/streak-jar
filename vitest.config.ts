import { defineConfig } from "vitest/config";

// Exercise local/UTC day boundaries by default; TZ can select another zone.
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
