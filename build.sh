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
# Default: build + launch the app (replacing any running instance).
# Pass --no-run to build only, useful for CI or when iterating on the
# build itself.
#
# Usage:
#   ./build.sh                  # debug build + launch (default)
#   ./build.sh --no-run         # build only, don't launch
#   ./build.sh --release        # ReleaseSafe build + launch
#   ./build.sh --frontend-only  # skip the Zig step (implies --no-run)
#   ./build.sh --zig-only       # skip the frontend build (uses existing dist/)
#   ./build.sh --use=npm        # force host npm even if dnpm is available
#   ./build.sh -h | --help

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

OPTIMIZE=""
RUN=1                # auto-launch by default; --no-run to opt out
FRONTEND_ONLY=0
ZIG_ONLY=0
USE=""
EXTRA_ZIG_ARGS=()

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
  # Replace any already-running instance so successive ./build.sh runs
  # behave like a hot-reload. Match by full path to avoid hitting other
  # processes that happen to have "api-lab" in argv.
  if pgrep -f "$SCRIPT_DIR/zig-out/bin/api-lab" >/dev/null 2>&1; then
    echo "→ stopping previous instance"
    pkill -TERM -f "$SCRIPT_DIR/zig-out/bin/api-lab" 2>/dev/null || true
    # Brief grace period for the WKWebView host to tear down its window.
    sleep 0.4
    pkill -KILL -f "$SCRIPT_DIR/zig-out/bin/api-lab" 2>/dev/null || true
  fi
  echo "→ launch: ./zig-out/bin/api-lab (background, PID will print)"
  ./zig-out/bin/api-lab >/dev/null 2>&1 &
  echo "✓ Build + launch complete (PID $!) — zig-out/bin/api-lab"
  exit 0
fi

echo "✓ Build complete: zig-out/bin/api-lab (--no-run, app not launched)"
