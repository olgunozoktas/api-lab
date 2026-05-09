import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    // Source maps for production builds — minified stack traces like
    // `pi@zero://app/assets/index-xxxxx.js:8:27509` are useless for
    // debugging crashes (and for the AI agents users paste them into).
    // With sourcemap on, the ErrorBoundary's "Copy" button captures
    // a stack that resolves to real function + file names. The .js.map
    // sidecars stay alongside the bundle in frontend/dist/ — WKWebView
    // resolves them automatically when devtools is open.
    sourcemap: true,
    // Vite's default 500 KB warning is below our actual guardrail
    // (scripts/check-bundle-size.sh enforces 1300 KB JS raw / 400 KB
    // gz; current bundle ~1029 / 317). Raise the warning to match.
    // Real code-splitting is queued in the parity plan (Phase O).
    chunkSizeWarningLimit: 1400,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
