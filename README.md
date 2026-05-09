# API Lab

[![CI](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml)
[![Release](https://github.com/olgunozoktas/api-lab/actions/workflows/release.yml/badge.svg)](https://github.com/olgunozoktas/api-lab/actions/workflows/release.yml)

A tiny native macOS API tester. Postman-style request composer with native HTTP transport (CORS-free), under **3 MB** binary, instant cold start.

Built on top of **[vercel-labs/zero-native](https://github.com/vercel-labs/zero-native)** — a Zig-based native shell (WebKit on macOS, WebKitGTK on Linux, WebView2 on Windows). Frontend is React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand + Radix-based shadcn primitives + CodeMirror 6 + lucide-react. Multi-language UI (TR + EN; more in 3 mechanical steps).

![API Lab screenshot](docs/screenshot.png)

## Features

- **Multi-request workspace** — open as many tabs as you want, each with its own state. ⌘+T new, ⌘+W close, ⌘+1..9 jump, ⌘+P fuzzy switcher across tabs + collections + history.
- **REST + GraphQL composer** with method picker, params/headers/auth/body/graphql tabs
- **Native HTTP** via Zig handler that shells out to `curl` — bypasses WebView CORS, exposes timing breakdown (DNS / connect / TTFB / total)
- **Browser fetch fallback** when the native bridge isn't available
- **Auth helpers**: Bearer, Basic, API Key (header)
- **JSON & GraphQL editor** powered by CodeMirror 6 (auto-close brackets, auto-indent, search, fold gutter, line numbers)
- **JSON tree response viewer** powered by `@uiw/react-json-view` (expand/collapse, copy-path)
- **Environments** with `{{var}}` substitution
- **Collections** + history (last 200 requests) — persisted via `localStorage`
- **Apple-style 3-pane UI**, dark / light / auto theme (system follows OS, explicit choice overrides)
- **i18n** — TR + EN today; adding a new language is 3 mechanical steps
- **Keyboard shortcuts** — see the [Keyboard reference](#keyboard-reference) below

## Quick start

Prerequisites:

- **Zig 0.16+** — `brew install zig`
- **`curl`** (preinstalled on macOS)
- **OrbStack** (or Docker Desktop) — required by `dnpm` (frontend builds run inside a hardened container; npm never touches your host)
- **`dnpm`** wrapper installed at `~/.local/bin/dnpm`

```bash
# Clone both repos as siblings — build.zig defaults to ../zero-native
git clone https://github.com/vercel-labs/zero-native.git
git clone https://github.com/olgunozoktas/api-lab.git

# Build the React frontend in the secure dnpm sandbox
cd api-lab/frontend
dnpm install                # one-time, then again whenever package.json changes
dnpm run build              # produces /app/dist inside the volume
dnpm sync-dist              # copy dist/ + .astro/ from volume to host

# Run the native shell (frontend/dist/ must already exist — see above)
cd ..
zig build run               # window opens; sample GitHub user request preloaded

# Optional: install the pre-commit hook (zig fmt + prettier --check)
bash scripts/install-hooks.sh
```

If your `zero-native` checkout lives elsewhere:

```bash
zig build run -Dzero-native-path=/path/to/zero-native
```

### Why two build steps?

- The frontend (Vite + React + Tailwind v4 + CodeMirror 6) builds inside a hardened Linux container with no Docker socket, dropped capabilities, network-off rebuild phase, and read-only project mount. Malicious npm packages cannot reach your home directory.
- `dnpm sync-dist` copies the volume artifacts to host so the Zig native shell can serve them via the `zero://app` asset handler.
- `zig build run` deliberately does NOT shell out to host `npm` (that would bypass the dnpm sandbox). Run `dnpm run build` first; if `frontend/dist/` is missing, the WebView will surface a clear "asset path not found" error.

### Dev mode (HMR)

```bash
cd frontend && dnpm run dev   # Vite at 127.0.0.1:5173
# In another terminal:
ZERO_NATIVE_FRONTEND_URL=http://127.0.0.1:5173/ zig build run
```

## Architecture

**Two-tier:**

- **Zig native shell** (`src/`) — bridge handlers, WKWebView host, asset serving
- **Web frontend** (`frontend/`) — Vite + React + TypeScript + Tailwind v4, builds to `frontend/dist/`

**Bridge contract** — the only Zig↔JS surface (`src/main.zig`):

| Command         | Permissions  | Origin       | Purpose                          |
|-----------------|--------------|--------------|----------------------------------|
| `http.request`  | `network`    | `zero://app` | curl subprocess; CORS-free HTTP  |

The handler at `src/handlers/http.zig` accepts `{method, url, headers[], body, timeout_ms, follow_redirects, insecure}` and returns `{status, headers[], body, size_bytes, timing_ms, timing:{namelookup_ms, connect_ms, ttfb_ms, total_ms}, url}`. On failure: `{error, exit_code, stderr}`.

**Frontend layout:**

```
frontend/src/
├── main.tsx                  # React mount
├── App.tsx                   # 3-pane layout, theme effect, ⌘ shortcuts
├── main.css                  # Tailwind v4 + @theme tokens + data-theme override
├── lib/
│   ├── i18n/                 # tr.ts (source), en.ts, index.ts, useT.ts
│   ├── bridge.ts             # window.zero.invoke<T>() typed wrapper
│   ├── sendRequest.ts        # native + fetch transport, header building
│   ├── curlGen.ts            # toCurl() formatter
│   ├── cn.ts                 # clsx + tailwind-merge
│   └── utils.ts / types.ts
├── store/                    # Zustand: collections, env, history, ui, current
└── components/
    ├── ui/                   # shadcn primitives: button, dialog, select, tabs, code-editor
    ├── TopBar.tsx + EnvEditorModal.tsx
    ├── Sidebar.tsx + CollectionList.tsx + HistoryList.tsx
    ├── RequestComposer.tsx + UrlBar.tsx + KvTable.tsx
    ├── AuthPanel.tsx + BodyPanel.tsx + GraphqlPanel.tsx
    └── ResponseViewer.tsx + ResponseHead.tsx + ResponseBody.tsx
```

Each panel that depends on app state is split into a presenter (pure props) + container (wires the store). This keeps every component reusable and testable.

## Keyboard reference

| Shortcut | Action |
|---|---|
| ⌘+Enter | Send request |
| ⌘+S | Save current request as collection |
| ⌘+N | Reset current request to a fresh empty one |
| ⌘+T | Open a new tab |
| ⌘+W | Close the current tab |
| ⌘+1 … ⌘+8 | Jump to tab N |
| ⌘+9 | Jump to the LAST tab (Postman / VSCode convention) |
| ⌘+P | Open the quick switcher (fuzzy across tabs / collections / history) |
| ⌘+F | Search inside the response body (within the editor) |
| ↑ / ↓ in switcher | Navigate results |
| ↵ in switcher | Open the highlighted item in the current tab |
| ⌘+↵ in switcher | Open in a NEW tab |

(Use `Ctrl` instead of `⌘` on Linux/Windows.)

## Testing

```bash
# Zig handler unit tests (~19 tests covering argv, header parsing, JSON encoding, error formatting)
zig build test

# Frontend Vitest suite (pure utils + store actions)
cd frontend && dnpm run test

# Frontend TypeScript strict check
cd frontend && dnpm run typecheck

# Frontend Prettier check (read-only — `prettier --write` is incompatible
# with dnpm's RO `/app` mount; format on host or via `dnpm shell` per file)
cd frontend && dnpm run format:check

# Bundle-size guardrail — fails if dist exceeds the thresholds in
# scripts/check-bundle-size.sh (raw + gzip per JS/CSS)
bash scripts/check-bundle-size.sh
```

## CI / CD

- **`ci.yml`** — runs on every push/PR to `main`:
  - **Zig job (`macos-latest`)**: installs Zig 0.16 via `mlugg/setup-zig@v2`, checks out `vercel-labs/zero-native@main` as a sibling clone, runs `zig build test` + `zig build -Doptimize=ReleaseSafe`, caches `.zig-cache` and `~/.cache/zig` for incrementality.
  - **Frontend job (`ubuntu-latest`)**: `npm ci --ignore-scripts`, lockfile-integrity check (rejects non-`registry.npmjs.org` URLs), `npm audit --audit-level=high`, TypeScript strict typecheck, Vitest, production build, bundle-size guardrail.
- **`release.yml`** — on tag push (`v*`):
  - Builds macOS arm64 (Apple Silicon) and macOS x86_64 (Intel) in parallel.
  - Each runner: setup Zig, npm ci frontend, vite build, `zig build -Doptimize=ReleaseSafe`, stage tree (binary + `frontend/dist/` + `app.zon` + README + LICENSE), tarball with `sha256` sidecar, upload as workflow artifact.
  - Aggregator: downloads both arch artifacts, creates a **draft** release via `softprops/action-gh-release@v2` with auto-generated notes. Review and publish manually.

The frontend CI job runs plain `npm ci` rather than the dev-machine `dnpm` wrapper. The threat model differs (ephemeral runner, no SSH/credential exposure, torn down per-job) and the lockfile-integrity check + `npm audit` substitute for dnpm's auto-audit pass. See `.github/workflows/ci.yml` for the inline rationale.

## Adding a new language

1. Copy `frontend/src/lib/i18n/en.ts` to a new `<code>.ts` (e.g. `de.ts`). TypeScript will fail the build if any key is missing.
2. Translate the values, keep the keys identical.
3. Register in `frontend/src/lib/i18n/index.ts`: import the file, add to `locales`, add to `LOCALE_LABEL`, append to `SUPPORTED_LOCALES`.
4. Add a `lang.<code>` label key to all locale files (TR + EN + new one).

That's it — the locale picker in the top bar picks it up automatically.

## Backlog

Project planning lives in `docs/backlog/`:

- `inbox/` — captured ideas, not yet planned
- `P1-*` / `P2-*` / `P3-*` — refined items, priority queue
- `done/` — archived after ship
- Each file mirrors a [GitHub Issue](https://github.com/olgunozoktas/api-lab/issues) for visibility (file canonical; issue is a one-way projection)

Phases on the queue (excerpt — full list in issues):

- Phase B — Tabs UI + multi-request workspace
- Phase C — WebSocket + code generation
- Phase D — Themes + accessibility + settings page
- Phase E — Imports/exports (Postman v2, OpenAPI, Bruno, HAR)
- Phase F — Tests + CI/CD
- Phase G — Cross-platform (Linux + Windows)
- Phase H — Distribution (.dmg / brew / AppImage / .exe)
- Phase I — gRPC + scripting
- Phase J — Built-in mock server
- Phase K — Optional git-based sync
- Phase L — Polish, marketing, launch

## Built with [zero-native](https://github.com/vercel-labs/zero-native)

- **Tiny binaries** — 2.9 MB native binary (Electron baseline ~100 MB)
- **Zig-native** — direct C interop, fast cold start, modern memory safety
- **Real WebKit** — no bundled Chromium, uses the platform WebView
- **Bridge model** — JS↔Zig with explicit policy + permissions, untrusted-by-default WebView

All credit for the native shell, runtime, and bridge dispatcher goes to the zero-native team. This project demonstrates what you can build on top of it.

## License

MIT — see [LICENSE](./LICENSE).
