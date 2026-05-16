#!/usr/bin/env bash
# Bundle-size guardrail for the Vite production build.
#
# Budgets the FIRST-PAINT payload — the JavaScript + CSS the browser
# downloads before the app renders. That set is exactly what
# `dist/index.html` references: the entry `<script>` plus every
# `<link rel="modulepreload">` (shared chunks Vite hoists out of the
# entry, e.g. the React runtime) and the `<link rel="stylesheet">`.
#
# Async chunks — loaded later via dynamic `import()` (the PDF viewer,
# the OpenAPI editor, the binary-response viewer, …) — are NOT in
# `index.html`. They are reported but do NOT count against the
# first-paint budget: a chunk fetched on demand is not first-paint
# cost. That is the whole point of code-splitting.
#
# History: this script used to sum *every* `dist/assets/*.js` file.
# That metric punished code-splitting — landing a correct lazy chunk
# (e.g. the 122 KB-gz PDF viewer) blew the "total JS" budget even
# though no first-paint byte changed. The first-paint metric below
# fixes that. A generous per-async-chunk ceiling still catches a
# single lazy chunk ballooning unnoticed.
#
# Bump the thresholds as the app grows — but bump deliberately, with a
# one-line rationale in the same commit. Making regressions visible
# before they ship is the entire point.
set -eo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_ROOT="$REPO_ROOT/frontend/dist"
DIST_DIR="$DIST_ROOT/assets"
INDEX_HTML="$DIST_ROOT/index.html"

# ---- Thresholds ----------------------------------------------------------
# First-paint JS — entry chunk + modulepreloaded shared chunks.
MAX_FIRSTPAINT_RAW_KB=1650   # current ≈ 1499 KB — ~10% headroom
MAX_FIRSTPAINT_GZ_KB=510     # current ≈ 469 KB gz — ~8% headroom
# First-paint CSS.
MAX_CSS_RAW_KB=80            # current ≈ 64 KB
MAX_CSS_GZ_KB=15             # current ≈ 11 KB gz
# Safety net: no single async chunk should balloon unnoticed. Wide
# berth (the PDF viewer, the largest async chunk, is ≈ 122 KB gz); it
# catches an accidental eager-import-gone-async-chunk, not intentional
# splits.
MAX_ASYNC_CHUNK_GZ_KB=600
# 2026-05-17: switched from total-JS to first-paint budgeting (backlog
# P3-2026-05-16-074500). The old MAX_JS_GZ_KB=480 total-sum check went
# red when the binary-response PDF viewer shipped as a 122 KB-gz async
# chunk — a false positive, since async chunks are not first-paint cost.

if [ ! -d "$DIST_DIR" ] || [ ! -f "$INDEX_HTML" ]; then
  echo "::error:: $DIST_ROOT not built — run \`dnpm run build\` (or \`npm run build\`) first" >&2
  exit 1
fi

# Portable byte-count for a single file.
size_bytes() {
  if stat --version >/dev/null 2>&1; then
    stat -c '%s' "$1"     # GNU coreutils (Linux)
  else
    stat -f '%z' "$1"     # BSD (macOS)
  fi
}

gz_bytes() {
  gzip -c -9 "$1" | wc -c | tr -d ' '
}

# ---- First-paint set: every asset referenced by index.html --------------
# Vite lists the entry script + modulepreloaded shared chunks + the
# stylesheet in index.html. Anything not here is an async chunk.
FIRSTPAINT_JS=$(grep -oE 'assets/[A-Za-z0-9._-]+\.js' "$INDEX_HTML" | sort -u)
FIRSTPAINT_CSS=$(grep -oE 'assets/[A-Za-z0-9._-]+\.css' "$INDEX_HTML" | sort -u)
if [ -z "$FIRSTPAINT_JS" ]; then
  echo "::error:: no first-paint JS found in $INDEX_HTML" >&2
  exit 1
fi

# ---- Report --------------------------------------------------------------
printf "\n%-46s %12s %12s %8s\n" "File" "Raw" "Gzip" "Role"
printf "%-46s %12s %12s %8s\n" "----" "---" "----" "----"

JS_RAW_TOTAL=0
JS_GZ_TOTAL=0
for rel in $FIRSTPAINT_JS; do
  f="$DIST_ROOT/$rel"
  [ -f "$f" ] || { echo "::error:: index.html references missing $rel" >&2; exit 1; }
  raw_kb=$(( $(size_bytes "$f") / 1024 ))
  gz_kb=$(( $(gz_bytes "$f") / 1024 ))
  printf "%-46s %10d KB %10d KB %8s\n" "$(basename "$f")" "$raw_kb" "$gz_kb" "paint"
  JS_RAW_TOTAL=$((JS_RAW_TOTAL + raw_kb))
  JS_GZ_TOTAL=$((JS_GZ_TOTAL + gz_kb))
done

CSS_RAW_TOTAL=0
CSS_GZ_TOTAL=0
for rel in $FIRSTPAINT_CSS; do
  f="$DIST_ROOT/$rel"
  [ -f "$f" ] || continue
  raw_kb=$(( $(size_bytes "$f") / 1024 ))
  gz_kb=$(( $(gz_bytes "$f") / 1024 ))
  printf "%-46s %10d KB %10d KB %8s\n" "$(basename "$f")" "$raw_kb" "$gz_kb" "css"
  CSS_RAW_TOTAL=$((CSS_RAW_TOTAL + raw_kb))
  CSS_GZ_TOTAL=$((CSS_GZ_TOTAL + gz_kb))
done

# Async chunks — every .js NOT in the first-paint set. Reported +
# ceiling-checked, not budgeted.
LARGEST_ASYNC_KB=0
LARGEST_ASYNC_NAME=""
for f in "$DIST_DIR"/*.js; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  case "$FIRSTPAINT_JS" in
    *"assets/$base"*) continue ;;   # first-paint, already counted
  esac
  raw_kb=$(( $(size_bytes "$f") / 1024 ))
  gz_kb=$(( $(gz_bytes "$f") / 1024 ))
  printf "%-46s %10d KB %10d KB %8s\n" "$base" "$raw_kb" "$gz_kb" "async"
  if [ "$gz_kb" -gt "$LARGEST_ASYNC_KB" ]; then
    LARGEST_ASYNC_KB=$gz_kb
    LARGEST_ASYNC_NAME=$base
  fi
done

printf "\n%-46s %10d KB %10d KB %8s\n" "First-paint JS total" "$JS_RAW_TOTAL" "$JS_GZ_TOTAL" "paint"
echo

# ---- Checks --------------------------------------------------------------
FAIL=0
check() {
  local label="$1"; local actual="$2"; local max="$3"
  if [ "$actual" -gt "$max" ]; then
    echo "::error:: ${label}: ${actual} KB > ${max} KB"
    FAIL=1
  else
    echo "  ✓ ${label}: ${actual} KB ≤ ${max} KB"
  fi
}

check "First-paint JS (raw)" "$JS_RAW_TOTAL"  "$MAX_FIRSTPAINT_RAW_KB"
check "First-paint JS (gz)"  "$JS_GZ_TOTAL"   "$MAX_FIRSTPAINT_GZ_KB"
check "CSS (raw)"            "$CSS_RAW_TOTAL" "$MAX_CSS_RAW_KB"
check "CSS (gz)"             "$CSS_GZ_TOTAL"  "$MAX_CSS_GZ_KB"
if [ "$LARGEST_ASYNC_KB" -gt "$MAX_ASYNC_CHUNK_GZ_KB" ]; then
  echo "::error:: largest async chunk ${LARGEST_ASYNC_NAME}: ${LARGEST_ASYNC_KB} KB gz > ${MAX_ASYNC_CHUNK_GZ_KB} KB"
  FAIL=1
else
  echo "  ✓ largest async chunk: ${LARGEST_ASYNC_KB} KB gz ≤ ${MAX_ASYNC_CHUNK_GZ_KB} KB"
fi

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "Bundle exceeded one or more size thresholds. If the bump is intentional,"
  echo "edit the MAX_* constants at the top of scripts/check-bundle-size.sh"
  echo "with a one-line rationale in the same commit."
  exit 1
fi

echo
echo "Bundle within first-paint thresholds."
