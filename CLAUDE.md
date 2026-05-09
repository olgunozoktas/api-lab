# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A native macOS API tester (Postman-style) built on **[vercel-labs/zero-native](https://github.com/vercel-labs/zero-native)** — a Zig + WebKit shell with a JS↔Zig bridge. Two-tier architecture:

- **Zig native shell** (`src/`) — bridge handlers, WKWebView host, asset serving
- **Web frontend** (`frontend/`) — Vite + React + TypeScript + Tailwind v4, builds to `frontend/dist/`

Network calls bypass WebView CORS by routing through a native Zig handler that shells out to `curl`. Everything else (UI, persistence via `localStorage`, request history) is browser-side.

The frontend is **transitioning from vanilla HTML/JS to React + Tailwind**. The legacy `src/index.html` file is still served while the React port lives in `frontend/`. Once `frontend/dist/` is wired in `app.zon` and `main.zig`, `src/index.html` will be retired.

## Common commands

```bash
# Frontend (NEVER run npm/npx/node directly — see frontend/CLAUDE.md):
cd frontend && dnpm install         # add or sync deps
cd frontend && dnpm run dev         # Vite dev server at 127.0.0.1:5173
cd frontend && dnpm run build       # produces frontend/dist/

# Zig native shell:
zig build                           # compile zig-out/bin/api-lab (~3 MB)
zig build run                       # build + launch the app
zig build run -Dzero-native-path=/path/to/zero-native   # override default ../zero-native

# Verify the binary is small + the web source loaded:
./zig-out/bin/api-lab               # tail ~/Library/Logs/dev.olgun.api-lab/zero-native.jsonl in another shell
```

## Architecture

**Bridge contract** — the only Zig↔JS surface (`src/main.zig`):

| Command         | Permissions  | Origin       | Purpose                          |
|-----------------|--------------|--------------|----------------------------------|
| `http.request`  | `network`    | `zero://app` | curl subprocess; CORS-free HTTP  |

The handler at `src/handlers/http.zig` accepts `{method, url, headers[], body, timeout_ms, follow_redirects, insecure}` and returns `{status, headers[], body, size_bytes, timing_ms, timing:{namelookup_ms, connect_ms, ttfb_ms, total_ms}, url}`. On failure: `{error, exit_code, stderr}`.

Bridge dispatch flow: JS calls `window.zero.invoke(cmd, payload)` → policy check (origin + permission) → handler invoked with fixed `output: []u8` buffer (max 1 MB result) → JSON response back.

**Asset serving** — `WebViewSource.assets({root_path, entry, origin: "zero://app", spa_fallback})` resolves `root_path` cwd-relative. `zig build run` sets cwd to project root, so `"frontend/dist"` (after build) or `"src"` (legacy mode) finds the entry HTML. Origin `zero://app` is required for `localStorage`, `Headers`, and other browser APIs that misbehave under null-origin (`baseURL:nil`).

**Persistence** lives entirely in the browser via `localStorage` (assets-mode origin makes this work). Collections, environments, history are NOT touched by Zig. The `filesystem` permission is declared in `app.zon` but currently unused.

**Frontend structure (target after React port completes):**

```
frontend/
├── src/
│   ├── main.tsx              # React mount
│   ├── App.tsx               # 3-pane layout
│   ├── main.css              # Tailwind v4 with @theme tokens
│   ├── lib/bridge.ts         # window.zero.invoke<T>() wrapper, typed
│   ├── store/                # Zustand stores: collections, env, history, ui, current
│   ├── components/           # Sidebar, RequestComposer, ResponseViewer, AuthPanel, BodyPanel, ...
│   └── lib/highlight.ts      # token-based JSON highlight (NOT regex chain — see Gotchas)
├── vite.config.ts            # @vitejs/plugin-react + @tailwindcss/vite
├── tsconfig.json
└── package.json
```

## Hard rules (project-wide)

**Max 400 lines per source file.** Applies to every React component (`.tsx` / `.jsx`), every Zig file (`.zig`), and every stand-alone TypeScript module under `frontend/src/`. When a file approaches the limit, decompose:

- React: extract subcomponents (`<Sidebar>` → `<Sidebar>` + `<CollectionList>` + `<HistoryList>`), pull JSX-free helpers into `frontend/src/lib/`.
- Zig: extract handler logic into a separate `src/handlers/<name>.zig`, lift shared utilities into `src/lib/<name>.zig`.
- Stores: split per slice (`store/collections.ts`, `store/env.ts`, …) instead of one monolithic file.

This is non-negotiable. Reviews reject any file exceeding 400 lines. Legacy files at the time of this rule landing must be refactored before extension.

## Hard gotchas (read before editing)

**Zig 0.16 std API has been heavily refactored:**

- `std.heap.GeneralPurposeAllocator(.{}){}` → use `std.heap.smp_allocator` or `std.heap.DebugAllocator(.{}){}`.
- `std.fs.makeDirAbsolute / openFileAbsolute / createFileAbsolute / deleteFileAbsolute` are gone — moved to `std.Io.Dir.*` requiring an `io: std.Io` parameter.
- `std.process.Child.wait()` requires `io`. Prefer the new `std.process.run(gpa, io, opts)` — returns `RunResult{term, stdout, stderr}`.
- `std.io.fixedBufferStream(buf)` → `std.Io.Writer.fixed(buf)` with `.end` field for the current position.
- `std.time.nanoTimestamp()` removed — use external metrics (curl `--write-out '%{json}'`) or skip.
- `std.ArrayList(T){}` literal init → `var x: std.ArrayList(T) = .empty;`.
- `app_dirs.resolveOne` takes 5 args now: `(app, platform, env, kind, output_buffer)`.
- `init.io` is in `std.process.Init` — pass it through to handler `Context`s if they need file/process I/O.

**WKWebView quirks:**

- `WebViewSource.html(bytes)` calls `[webView loadHTMLString:source baseURL:nil]` — origin is null, `localStorage` throws `SecurityError`, CSP behaves weirdly. **Always use `WebViewSource.assets()` for non-trivial UIs.**
- macOS host's `NSString initWithBytes:length:encoding:NSUTF8StringEncoding` returns **nil** for invalid UTF-8 OR (apparently) for HTML strings ≥ ~40 KB. When nil, `loadHTMLString:nil` does nothing and emits no `webview.load` event in the runtime log → blank screen, no error. Inline HTML must stay tiny (<10 KB) or use assets mode.
- `@embedFile` only allows files within the module's package path. `@embedFile("../frontend/index.html")` errors out.
- The runtime log emits an `app_shutdown` event very early in lifecycle; the runtime keeps running normally. Cosmetic, ignore.

**Frontend gotchas:**

- JSON syntax highlight via regex chain is a **trap**: the second `.replace()` matches the literal `"json-string"` inside `class="json-string"` and wraps it again, breaking the HTML. Always tokenize JSON character-by-character.
- `localStorage` only works under the `zero://app` origin (assets mode). Defensive code should try/catch with an in-memory fallback so inline-html mode doesn't crash on init.
- `Headers` constructor in WebKit rejects names with non-ASCII chars; wrap `.append()` in try/catch.

**dnpm policy (frontend/):**

The full policy lives in `frontend/CLAUDE.md` (auto-generated by `dnpm setup`). Short version: **never** run `npm`, `npx`, `yarn`, `pnpm`, `node`, or `./node_modules/.bin/*` on the host. Always `dnpm <subcommand>`. Bootstrapping a fresh project: pre-create empty `dist/`, `.astro/`, `node_modules/` directories on the host (Docker volume mount points need to exist on the read-only `/app` mount). The `Shrinkwrap.save` null-path error is a known dnpm/OrbStack quirk — packages still install correctly into the volume; ignore the lockfile error.

**Path discipline:**

- `main.zig` uses cwd-relative `"src"` (or `"frontend/dist"` after the React port). No absolute home paths.
- `build.zig` defaults to `"../zero-native"` (sibling clone). Override with `-Dzero-native-path=<path>`.
- Never commit anything from `~/`, `/Users/...`, or other user-specific paths.

## What stays out of git

`.gitignore` covers: `zig-out/`, `.zig-cache/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.vite/`, `docker-compose.node.yml`, `.dnpm/`, `handoffs/`, `docs/sessions/`, `docs/handoffs/`, `docs/backlog/.profile.jsonl`. Session-bridge content (handoff docs, backlog profile events) is private — never push.

## Public surface

Repo: <https://github.com/olgunozoktas/api-lab>. Commits authored via `19225739+olgunozoktas@users.noreply.github.com` to guarantee correct GitHub attribution.

## When stuck

Read `~/Herd/zero-native/src/bridge/root.zig` for the dispatch model, `~/Herd/zero-native/src/platform/macos/appkit_host.m` for WKWebView config, and the latest handoff doc under `~/.claude/handoffs/` for session-specific decisions.
