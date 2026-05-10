# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A native macOS API tester (Postman-style) built on **[vercel-labs/zero-native](https://github.com/vercel-labs/zero-native)** — a Zig + WebKit shell with a JS↔Zig bridge. Two-tier architecture:

- **Zig native shell** (`src/`) — bridge handlers, WKWebView host, asset serving
- **Web frontend** (`frontend/`) — Vite + React + TypeScript + Tailwind v4, builds to `frontend/dist/`

Network calls go around WebView CORS by routing through a native Zig handler that shells out to `curl`. Everything else (UI, persistence via `localStorage`, request history) is browser-side.

The frontend is **transitioning from vanilla HTML/JS to React + Tailwind**. The legacy `src/index.html` file is still served while the React port lives in `frontend/`. Once `frontend/dist/` is wired in `app.zon` and `main.zig`, `src/index.html` will be retired.

## Common commands

```bash
# Build the whole app (frontend + Zig) — preferred entry point:
./build.sh                          # debug build + LAUNCH (default; kills prior instance + clears WebKit cache)
./build.sh --no-run                 # build only, don't launch (for CI / iteration)
./build.sh --release                # ReleaseSafe build + launch
./build.sh --frontend-only          # skip Zig (implies --no-run)
./build.sh --zig-only               # skip frontend (uses existing dist/)
./build.sh --use=npm                # force host npm fallback (downgrades hardening)
./build.sh --keep-cache             # don't wipe ~/Library/Caches/API Lab/ before launch
./build.sh --reset-state            # ⚠ also wipe ~/Library/WebKit/API Lab/ (LocalStorage gone)
./build.sh -Dzero-native-path=...   # passthrough Zig flags

# Frontend (NEVER run npm/npx/node directly — see frontend/CLAUDE.md):
cd frontend && dnpm install         # add or sync deps
cd frontend && dnpm run dev         # Vite dev server at 127.0.0.1:5173
cd frontend && dnpm run build       # produces frontend/dist/
cd frontend && dnpm run test        # vitest unit tests
cd frontend && dnpm run typecheck   # tsc --noEmit
cd frontend && dnpm run format:check  # prettier check (--write blocked by RO mount)

# Frontend without dnpm (clone-and-run convenience — uses docker-compose.yml):
docker compose run --rm frontend-build      # one-shot production build
docker compose run --rm frontend-test       # vitest run
docker compose run --rm frontend-typecheck  # tsc --noEmit
docker compose up frontend-dev              # Vite dev server on 127.0.0.1:5173

# Zig native shell:
zig build                           # compile zig-out/bin/api-lab (~3 MB)
zig build test                      # run handler unit tests
zig build run                       # launch the app — needs frontend/dist/ first
zig build run -Dzero-native-path=/path/to/zero-native   # override default ../zero-native

# Verify the binary + tail logs:
./zig-out/bin/api-lab               # tail ~/Library/Logs/dev.olgun.api-lab/zero-native.jsonl in another shell

# Pre-commit hooks (zig fmt + prettier --check):
bash scripts/install-hooks.sh       # one-time per clone (idempotent; sets core.hooksPath)
```

`./build.sh` is the canonical build entry point — sequences the
frontend + Zig build in the right order, kills any already-running
api-lab instance, **wipes the WebKit asset cache** (so the new bundle
is served instead of a stale copy), and launches the freshly-built
binary. The hot-reload loop is just: edit code → `./build.sh` → app
restarts with fresh assets. Pass `--no-run` to skip the launch (CI,
build-only iteration).

The cache wipe touches `~/Library/Caches/API Lab/` only; LocalStorage
in `~/Library/WebKit/API Lab/WebsiteData/` (the user's collections,
history, environments) is preserved. Pass `--reset-state` to wipe
that too (rarely needed; useful for "force a v1→v2 migration" or
"my persisted state is wedged").

The script auto-detects the frontend builder in this order: `dnpm` →
`docker compose run frontend-build` → host `npm` (with a warning).

When iterating on just one tier, prefer `./build.sh --frontend-only`
or `./build.sh --zig-only` instead of running the underlying tools by
hand — keeps the dnpm-only policy intact when dnpm is available.

If you skip the script and run Zig directly, remember: `zig build run`
no longer shells out to host `npm` (that violated frontend/CLAUDE.md's
dnpm-only policy). You must populate `frontend/dist/` first via one
of the frontend commands above; missing `frontend/dist/` surfaces as
a `WebViewSource.assets` runtime error.

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

**Every component must be reusable.** No component may be locked to a single call-site. Concretely:

1. **Props over store access** — accept data + callbacks as props. Use `useStore` only at *page-level* components (App.tsx, modal hosts, top-level containers); leaf and middle components stay store-agnostic so they're testable, mountable in Storybook, and reusable in any context. The pattern is presenter (pure props) + container (wires the store) — split when the leaf needs more than two store reads.
2. **Sensible defaults + escape hatches** — every variant prop has a default; every styled component accepts `className` to merge with internal classes via `cn()`; every interactive component accepts standard ARIA props (`aria-label`, `aria-describedby`, etc.).
3. **Compose-friendly** — primitives use `forwardRef` so refs reach the underlying DOM; container-style components support `asChild` (Radix `Slot` pattern) where it makes sense.
4. **No hardcoded user-facing strings inside leaf components** — strings come from `t()` always. (Reinforces the i18n rule below.)
5. **No private business logic in leaves** — moving the component to another app shouldn't require touching its source. Logic that depends on this app's data shape lives in `lib/` or in the container layer.

Every component is a candidate library export. Reviews reject violations.

**i18n: every user-facing string goes through `t()`.** No hardcoded UI strings in components. Translation keys live in `frontend/src/lib/i18n/tr.ts` (source of truth — TypeScript fails the build if other locales miss any key). Adding a new language = (1) create `frontend/src/lib/i18n/<code>.ts` exporting a `Dict`-typed object, (2) register it in `frontend/src/lib/i18n/index.ts`'s `locales` map and `LOCALE_LABEL`, (3) extend `SUPPORTED_LOCALES`. No code path may call `console`-targeted strings, `confirm()`, `alert()`, placeholders, button text, or labels with literal English/Turkish text — always `t("key")`.

**Max 400 lines per source file.** Applies to every React component (`.tsx` / `.jsx`), every Zig file (`.zig`), and every stand-alone TypeScript module under `frontend/src/`. When a file approaches the limit, decompose:

- React: extract subcomponents (`<Sidebar>` → `<Sidebar>` + `<CollectionList>` + `<HistoryList>`), pull JSX-free helpers into `frontend/src/lib/`.
- Zig: extract handler logic into a separate `src/handlers/<name>.zig`, lift shared utilities into `src/lib/<name>.zig`.
- Stores: split per slice (`store/collections.ts`, `store/env.ts`, …) instead of one monolithic file.

This is non-negotiable. Reviews reject any file exceeding 400 lines. Legacy files at the time of this rule landing must be refactored before extension.

**Changelog: every user-visible change ships an entry.** Every commit / PR that touches user-facing behavior MUST drop a markdown file under `frontend/changelog/unreleased/` in the same commit. Internal-only refactors (no user-visible delta — pure renames, file splits, type-only changes) do NOT need an entry; the author judges, the reviewer pushes back if the call is wrong.

Entry format (`frontend/changelog/unreleased/<YYYY-MM-DD>-<slug>.md`):

```markdown
---
title: Short user-facing headline
date: 2026-05-10
---

One paragraph of prose explaining what changed and why the user
should care. Optional bullet list. Keep under ~300 words.
```

The bundled `frontend/src/lib/changelog.ts` glob-imports every
`frontend/changelog/{released,unreleased}/*.md` at build time. The
in-app `<ChangelogModal>` opens automatically on first launch when
`APP_VERSION > lastSeenVersion` (persisted in IDB) and is accessible
from the TopBar's clock-history button anytime. At release-cut time,
`unreleased/*.md` entries get concatenated into
`released/v<version>.md` and the unreleased slot is emptied. See
`frontend/changelog/README.md` for the full convention.

**Why under `frontend/`** — the dnpm docker build container only mounts
`frontend/` as `/app`. Anything outside that mount is invisible at
glob-resolution time, so a repo-root `changelog/` directory would silently
yield zero entries (the in-app modal would render an empty state). Same
reason `APP_VERSION` reads from `frontend/package.json` rather than a
top-level `VERSION` file.

## Secrets policy (HARD RULE — never violated)

**Never commit secrets, credentials, or anything that grants access to a system.** This applies to every commit, every PR, every workflow file, every test fixture, every code comment, every doc page — no exceptions, in any project context.

Concretely:

- **Files that must stay out of git:** `.env`, `.env.local`, `.env.production`, `.env.*` of any kind, `secrets/`, `credentials*`, `service-account*.json`, `firebase-adminsdk*.json`, `gcp-credentials*`, `aws-credentials*`, `.aws/`, `.npmrc` (when it contains an auth token), `.netrc`, `.pypirc`, `*.pem`, `*.key`, `*.cert`, `*.crt`, `*.p12`, `*.pfx`, `id_rsa*`, `id_ed25519*`, `*.gpg`, `.ssh/`. The `.gitignore` already covers all of these — do **not** remove or weaken those lines, and add new patterns when introducing a new tool that emits credential files.
- **Sample / template only.** `.env.example` and `.env.sample` are allowed (they're whitelisted in `.gitignore` via `!.env.example`/`!.env.sample`) and **must contain placeholder values only** — `API_KEY=your-key-here`, never a real key.
- **No inline secrets in source.** No API key, OAuth client secret, JWT signing secret, database password, S3 access key, GitHub PAT, npm token, Slack webhook, Stripe key, OpenAI/Anthropic key, Firebase key, or any other access-granting string may appear in source code, tests, fixtures, comments, commit messages, PR descriptions, issue bodies, or doc files. If a test needs an API key, read it from an environment variable; if a fixture needs a token, mark the fixture body as `"REPLACE_ME_AT_RUNTIME"` and require the test runner to inject the real value.
- **No secrets in CI workflows.** Use GitHub Actions secrets (`${{ secrets.NAME }}`) — never paste a value into the workflow file. Don't print secrets to logs. Don't pass secrets via `env:` in a way that exposes them in `set -x` output.
- **If a secret leaks**, rotate it immediately — committing it, then editing it, is not enough; the value is in git history forever. Treat any leaked secret as compromised, rotate the key with the issuing provider, and force-push only after explicit user approval.
- **Before every commit**, mentally scan staged files for: real-looking tokens (`sk-...`, `ghp_...`, `xoxb-...`, `AKIA...`), `.env` files, anything matching the gitignored patterns above. If anything looks credential-shaped, abort the commit and show the user.
- **Public surface awareness.** This repo is published at https://github.com/olgunozoktas/api-lab; anything pushed is world-readable instantly and indexed by GitHub's secret-scanning bots within minutes. Treat every push as a publication event.

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
- **Worktree gotcha**: git worktrees live one level deeper than the primary checkout (e.g. `Herd/api-lab-wt/<slug>/`), so the `../zero-native` default resolves to `Herd/api-lab-wt/zero-native/` which doesn't exist. Either pass `-Dzero-native-path=...` to every `zig build` call inside a worktree, or symlink the canonical clone once: `ln -s ~/Herd/zero-native ~/Herd/api-lab-wt/zero-native`. Build-time auto-discovery isn't ergonomic right now (Zig 0.16 moved synchronous `std.fs.cwd().access` behind std.Io.Dir which can't be opened in a build script without an io param).
- Never commit anything from `~/`, `/Users/...`, or other user-specific paths.

## What stays out of git

`.gitignore` covers: `zig-out/`, `.zig-cache/`, `frontend/node_modules/`, `frontend/dist/`, `frontend/.vite/`, `docker-compose.node.yml`, `.dnpm/`, `handoffs/`, `docs/sessions/`, `docs/handoffs/`, `docs/backlog/.profile.jsonl`. Session-bridge content (handoff docs, backlog profile events) is private — never push.

## Public surface

Repo: <https://github.com/olgunozoktas/api-lab>. Commits authored via `19225739+olgunozoktas@users.noreply.github.com` to guarantee correct GitHub attribution.

backlog-gh-issues: on

## When stuck

Read `~/Herd/zero-native/src/bridge/root.zig` for the dispatch model, `~/Herd/zero-native/src/platform/macos/appkit_host.m` for WKWebView config, and the latest handoff doc under `~/.claude/handoffs/` for session-specific decisions.
