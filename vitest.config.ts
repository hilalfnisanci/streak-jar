import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/streak-jar/",

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