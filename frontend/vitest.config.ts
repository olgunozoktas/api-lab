import { defineConfig } from "vitest/config";

// Vitest runs under jsdom by default so .test.tsx render tests can
// reach document / window / DOM APIs. Pure-Node tests stay green —
// jsdom is a superset of the node environment for the operations our
// utility tests use (envSubst, toCurl, statusText, etc.). Individual
// test files can opt back to a different environment via a docblock
// pragma: `/** @vitest-environment node */` at the top.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
});
