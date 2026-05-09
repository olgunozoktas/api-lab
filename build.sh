#!/usr/bin/env bash
# build.sh — one-shot build for api-lab.
#
# Two-tier project: web frontend (Vite + React + TS) and native Zig shell.
# This script builds both in the right order:
#   1. cd frontend && dnpm run build      → frontend/dist/
#   2. zig build [-Doptimize=ReleaseSafe] → zig-out/bin/api-lab
#
# The frontend build runs in dnpm's hardened container per the project's
# dnpm-only policy (frontend/CLAUDE.md). Never `npm`/`npx`/`node` on the
# host.
#
# Usage:
#   ./build.sh                  # debug build (default)
#   ./build.sh --release        # ReleaseSafe build (smaller, optimized)
#   ./build.sh --run            # build then launch the app
#   ./build.sh --release --run  # combine
#   ./build.sh --frontend-only  # skip the Zig step
#   ./build.sh --zig-only       # skip the frontend build (uses existing dist/)
#   ./build.sh -h | --help

set -eo pipefail

# Resolve the script's own directory so the script works regardless of
# the user's cwd (handy when invoked from a worktree, an editor, or a
# parent shell that's elsewhere).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

OPTIMIZE=""
RUN=0
FRONTEND_ONLY=0
ZIG_ONLY=0
EXTRA_ZIG_ARGS=()

usage() {
  sed -n 's/^# \?//; 2,/^$/p' "$0" | head -16
  exit "${1:-0}"
}

for arg in "$@"; do
  case "$arg" in
    --release)        OPTIMIZE="-Doptimize=ReleaseSafe" ;;
    --run)            RUN=1 ;;
    --frontend-only)  FRONTEND_ONLY=1 ;;
    --zig-only)       ZIG_ONLY=1 ;;
    -h|--help)        usage 0 ;;
    -D*)              EXTRA_ZIG_ARGS+=("$arg") ;;  # passthrough -Dkey=value flags
    *)                echo "Unknown arg: $arg" >&2; usage 1 ;;
  esac
done

if [ "$FRONTEND_ONLY" = "1" ] && [ "$ZIG_ONLY" = "1" ]; then
  echo "::error:: --frontend-only and --zig-only are mutually exclusive" >&2
  exit 1
fi

# Sanity: required tools.
require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "::error:: $1 not on PATH. $2" >&2
    exit 1
  }
}

if [ "$ZIG_ONLY" != "1" ]; then
  require dnpm "Install: see CLAUDE.md (dnpm policy)"
fi
if [ "$FRONTEND_ONLY" != "1" ]; then
  require zig "Install Zig 0.16.0 — see https://ziglang.org/download/"
fi

# 1. Frontend build (unless --zig-only).
if [ "$ZIG_ONLY" != "1" ]; then
  echo "→ frontend: dnpm run build"
  ( cd frontend && dnpm run build )
fi

# 2. Zig build (unless --frontend-only).
if [ "$FRONTEND_ONLY" != "1" ]; then
  if [ ! -d frontend/dist ] || [ ! -f frontend/dist/index.html ]; then
    echo "::error:: frontend/dist/ missing — run without --zig-only first, or pass --frontend-only" >&2
    exit 1
  fi
  echo "→ zig: zig build $OPTIMIZE ${EXTRA_ZIG_ARGS[*]}"
  zig build $OPTIMIZE "${EXTRA_ZIG_ARGS[@]}"
fi

# 3. Optional: launch the app.
if [ "$RUN" = "1" ]; then
  if [ "$FRONTEND_ONLY" = "1" ]; then
    echo "::warning:: --run with --frontend-only is a no-op (no native binary built)" >&2
    exit 0
  fi
  if [ ! -x zig-out/bin/api-lab ]; then
    echo "::error:: zig-out/bin/api-lab missing — Zig build did not produce a binary" >&2
    exit 1
  fi
  echo "→ launch: ./zig-out/bin/api-lab"
  exec ./zig-out/bin/api-lab
fi

echo "✓ Build complete: zig-out/bin/api-lab"
