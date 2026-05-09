#!/usr/bin/env bash
# build.sh — one-shot build for api-lab.
#
# Two-tier project: web frontend (Vite + React + TS) and native Zig shell.
# Builds both in the right order:
#   1. frontend → frontend/dist/  (dnpm | docker compose | host npm fallback)
#   2. zig build [-Doptimize=ReleaseSafe] → zig-out/bin/api-lab
#
# Frontend builder priority (auto-detected):
#   1. dnpm     — preferred; hardened container per frontend/CLAUDE.md
#   2. docker   — uses ./docker-compose.yml (frontend-build service)
#   3. npm      — last resort, runs on host (downgrades dnpm hardening)
#
# Override with --use=<dnpm|docker|npm>.
#
# Default: build + clear WebKit asset cache + launch the app
# (replacing any running instance). Pass --no-run to build only.
#
# Usage:
#   ./build.sh                  # debug build + launch (default)
#   ./build.sh --no-run         # build only, don't launch
#   ./build.sh --release        # ReleaseSafe build + launch
#   ./build.sh --frontend-only  # skip the Zig step (implies --no-run)
#   ./build.sh --zig-only       # skip the frontend build (uses existing dist/)
#   ./build.sh --use=npm        # force host npm even if dnpm is available
#   ./build.sh --keep-cache     # don't wipe the WebKit asset cache
#   ./build.sh --reset-state    # also wipe localStorage (collections, history, env)
#   ./build.sh -h | --help

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

OPTIMIZE=""
RUN=1                # auto-launch by default; --no-run to opt out
FRONTEND_ONLY=0
ZIG_ONLY=0
USE=""
KEEP_CACHE=0         # default: wipe WebKit asset cache pre-launch
RESET_STATE=0        # opt-in: also wipe LocalStorage (destructive)
EXTRA_ZIG_ARGS=()

# WKWebView's data store, keyed by the bundle's display name (with space).
WK_CACHE_DIR="$HOME/Library/Caches/API Lab"
WK_DATA_DIR="$HOME/Library/WebKit/API Lab"

usage() {
  sed -n 's/^# \?//; 2,/^$/p' "$0" | head -22
  exit "${1:-0}"
}

for arg in "$@"; do
  case "$arg" in
    --release)        OPTIMIZE="-Doptimize=ReleaseSafe" ;;
    --run)            RUN=1 ;;          # default already; kept for compatibility
    --no-run)         RUN=0 ;;
    --frontend-only)  FRONTEND_ONLY=1; RUN=0 ;;  # nothing to launch
    --zig-only)       ZIG_ONLY=1 ;;
    --use=*)          USE="${arg#--use=}" ;;
    --keep-cache)     KEEP_CACHE=1 ;;
    --reset-state)    RESET_STATE=1 ;;
    -h|--help)        usage 0 ;;
    -D*)              EXTRA_ZIG_ARGS+=("$arg") ;;  # passthrough -Dkey=value flags
    *)                echo "Unknown arg: $arg" >&2; usage 1 ;;
  esac
done

if [ "$FRONTEND_ONLY" = "1" ] && [ "$ZIG_ONLY" = "1" ]; then
  echo "::error:: --frontend-only and --zig-only are mutually exclusive" >&2
  exit 1
fi

have() { command -v "$1" >/dev/null 2>&1; }

# Pick the docker compose CLI invocation form.
docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif have docker-compose; then
    docker-compose "$@"
  else
    return 1
  fi
}

# Auto-detect the frontend builder if --use= wasn't given.
detect_builder() {
  if [ -n "$USE" ]; then echo "$USE"; return; fi
  if have dnpm; then echo "dnpm"; return; fi
  if have docker && [ -f docker-compose.yml ] && docker_compose config >/dev/null 2>&1; then
    echo "docker"; return
  fi
  if have npm; then echo "npm"; return; fi
  echo "none"
}

build_frontend() {
  local builder
  builder=$(detect_builder)
  case "$builder" in
    dnpm)
      echo "→ frontend: dnpm run build (hardened container)"
      ( cd frontend && dnpm run build )
      ;;
    docker)
      echo "→ frontend: docker compose run --rm frontend-build"
      docker_compose run --rm frontend-build
      ;;
    npm)
      echo "::warning:: dnpm not found — falling back to host npm. This bypasses the hardening described in frontend/CLAUDE.md (no seccomp, no cap-drop, postinstall scripts run on the host). Prefer dnpm for daily local dev." >&2
      ( cd frontend
        if [ ! -d node_modules ]; then
          npm install --no-audit --no-fund
        fi
        npm run build
      )
      ;;
    none)
      echo "::error:: no frontend builder available. Install one of: dnpm (preferred), docker (uses docker-compose.yml), or npm (host fallback)." >&2
      exit 1
      ;;
    *)
      echo "::error:: --use=$USE invalid. Choose dnpm, docker, or npm." >&2
      exit 1
      ;;
  esac
}

# 1. Frontend build (unless --zig-only).
if [ "$ZIG_ONLY" != "1" ]; then
  build_frontend
fi

# 2. Zig build (unless --frontend-only).
if [ "$FRONTEND_ONLY" != "1" ]; then
  have zig || {
    echo "::error:: zig not on PATH — install Zig 0.16.0 from https://ziglang.org/download/" >&2
    exit 1
  }
  if [ ! -d frontend/dist ] || [ ! -f frontend/dist/index.html ]; then
    echo "::error:: frontend/dist/ missing — run without --zig-only first, or pass --frontend-only" >&2
    exit 1
  fi
  echo "→ zig: zig build $OPTIMIZE ${EXTRA_ZIG_ARGS[*]}"
  zig build $OPTIMIZE "${EXTRA_ZIG_ARGS[@]}"
fi

# 3. Launch the app (default; opt out with --no-run).
if [ "$RUN" = "1" ]; then
  if [ ! -x zig-out/bin/api-lab ]; then
    echo "::error:: zig-out/bin/api-lab missing — Zig build did not produce a binary" >&2
    exit 1
  fi

  # 3a. Stop any already-running instance so the cache wipe + relaunch
  # behave like a hot-reload. Match by full path to avoid hitting other
  # processes that happen to have "api-lab" in argv.
  if pgrep -f "$SCRIPT_DIR/zig-out/bin/api-lab" >/dev/null 2>&1; then
    echo "→ stopping previous instance"
    pkill -TERM -f "$SCRIPT_DIR/zig-out/bin/api-lab" 2>/dev/null || true
    sleep 0.4
    pkill -KILL -f "$SCRIPT_DIR/zig-out/bin/api-lab" 2>/dev/null || true
  fi

  # 3b. Wipe WebKit's asset cache so the new bundle is served instead of
  # a stale copy. WKWebView caches the served HTML/JS in
  # ~/Library/Caches/API Lab/WebKit/, which sometimes survives a binary
  # swap and shows old UI even after a fresh build (the bug that
  # surfaced 2026-05-09). LocalStorage / IndexedDB live in
  # ~/Library/WebKit/API Lab/WebsiteData/ and are NOT touched here —
  # those carry the user's collections, history, environments. Pass
  # --keep-cache to skip this step (e.g. to debug a cache-related
  # regression), or --reset-state to wipe everything including state.
  if [ "$KEEP_CACHE" != "1" ] && [ -d "$WK_CACHE_DIR" ]; then
    echo "→ clearing WebKit asset cache ($WK_CACHE_DIR)"
    rm -rf "$WK_CACHE_DIR"
  fi
  if [ "$RESET_STATE" = "1" ]; then
    if [ -d "$WK_DATA_DIR" ]; then
      echo "→ ⚠ wiping WebKit state — LocalStorage (collections, history, env) gone"
      rm -rf "$WK_DATA_DIR"
    fi
  fi

  # 3c. Launch in background so build.sh exits cleanly while the
  # WKWebView window stays open.
  echo "→ launch: ./zig-out/bin/api-lab (background, PID will print)"
  ./zig-out/bin/api-lab >/dev/null 2>&1 &
  echo "✓ Build + launch complete (PID $!) — zig-out/bin/api-lab"
  exit 0
fi

echo "✓ Build complete: zig-out/bin/api-lab (--no-run, app not launched)"
