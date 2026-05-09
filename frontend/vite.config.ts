import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    // Vite's default 500 KB warning is below our actual guardrail
    // (scripts/check-bundle-size.sh enforces 1300 KB JS raw / 400 KB
    // gz; our current bundle sits at 1016 / 313). Raise the warning
    // to match the guardrail so the build output stays clean. Real
    // code-splitting is queued as P3 — see
    // docs/plans/postman-insomnia-parity.md "Phase L — performance".
    chunkSizeWarningLimit: 1400,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
