import { defineConfig } from "vitest/config";

// Pure-Node Vitest runner. The utilities under test
// (envSubst, toCurl, isProbablyJson, statusText, humanSize, methodClass)
// are framework-agnostic — no DOM, no React, no jsdom needed.
// If we ever test a Zustand store or a hook, switch `environment` to "jsdom".
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
  },
});
