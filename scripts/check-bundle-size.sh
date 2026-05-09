#!/usr/bin/env bash
# Bundle-size guardrail for the Vite production build.
#
# Reads `frontend/dist/assets/*.js` + `*.css`, prints a per-file table
# with raw and gzipped sizes, and fails the build if any threshold is
# exceeded. Thresholds chosen with ~30% headroom over the v0.1.0
# baseline (979 KB JS / 43 KB CSS uncompressed; 303 KB / 8 KB gzipped).
# Bump as the app grows, but bump deliberately — Phase F's whole point
# is to make regressions visible before they ship.
#
# Cold-start timing is the natural sibling of this check, but the v1
# binary launches in <200 ms on the dev box (well below any sane
# threshold), and a real cold-start harness needs a runner that can
# launch the app and read its first-paint signal. Filed as follow-up.
set -eo pipefail

# Resolve the repo root so this script works no matter where it's run from.
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_ROOT/frontend/dist/assets"

# ---- Thresholds ----------------------------------------------------------
# Uncompressed (raw) — what the user pays in disk + parse cost
MAX_JS_RAW_KB=1300       # baseline ~979 KB → 30% headroom
MAX_CSS_RAW_KB=80        # baseline ~43 KB → almost 2× headroom
# Gzipped — what the user pays over the wire (most CDNs gzip)
MAX_JS_GZ_KB=400         # baseline ~303 KB → ~30% headroom
MAX_CSS_GZ_KB=15         # baseline ~8 KB → ~2× headroom

if [ ! -d "$DIST_DIR" ]; then
  echo "::error:: $DIST_DIR not found — run \`dnpm run build\` (or \`npm run build\`) first" >&2
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

JS_RAW_TOTAL=0
JS_GZ_TOTAL=0
CSS_RAW_TOTAL=0
CSS_GZ_TOTAL=0

printf "\n%-50s %12s %12s\n" "File" "Raw" "Gzip"
printf "%-50s %12s %12s\n" "----" "---" "----"

for f in "$DIST_DIR"/*.js "$DIST_DIR"/*.css; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  raw=$(size_bytes "$f")
  gz=$(gz_bytes "$f")
  raw_kb=$((raw / 1024))
  gz_kb=$((gz / 1024))
  printf "%-50s %10d KB %10d KB\n" "$name" "$raw_kb" "$gz_kb"
  case "$f" in
    *.js)
      JS_RAW_TOTAL=$((JS_RAW_TOTAL + raw_kb))
      JS_GZ_TOTAL=$((JS_GZ_TOTAL + gz_kb))
      ;;
    *.css)
      CSS_RAW_TOTAL=$((CSS_RAW_TOTAL + raw_kb))
      CSS_GZ_TOTAL=$((CSS_GZ_TOTAL + gz_kb))
      ;;
  esac
done

printf "\n%-50s %10d KB %10d KB\n" "Total JS"  "$JS_RAW_TOTAL"  "$JS_GZ_TOTAL"
printf "%-50s %10d KB %10d KB\n"   "Total CSS" "$CSS_RAW_TOTAL" "$CSS_GZ_TOTAL"
echo

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

check "JS  (raw)"  "$JS_RAW_TOTAL"  "$MAX_JS_RAW_KB"
check "JS  (gz)"   "$JS_GZ_TOTAL"   "$MAX_JS_GZ_KB"
check "CSS (raw)"  "$CSS_RAW_TOTAL" "$MAX_CSS_RAW_KB"
check "CSS (gz)"   "$CSS_GZ_TOTAL"  "$MAX_CSS_GZ_KB"

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "Bundle exceeded one or more size thresholds. If the bump is intentional,"
  echo "edit the MAX_* constants at the top of scripts/check-bundle-size.sh"
  echo "with a one-line rationale in the same commit."
  exit 1
fi

echo
echo "Bundle within thresholds."
