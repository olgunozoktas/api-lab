import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Read the version from frontend/package.json and inject it as
// `__APP_VERSION__` for the bundle. Used by the changelog modal to
// decide whether to auto-open on first launch. We read package.json
// (not a separate VERSION file) so the value is also available to
// dnpm's docker build, which only mounts `frontend/` and can't see
// repo-root files.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as {
  version: string;
};
const APP_VERSION = pkg.version;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
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
