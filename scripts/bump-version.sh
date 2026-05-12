#!/usr/bin/env bash
# Olgun Özoktaş geliştirdi · API Lab
#
# bump-version.sh — increment frontend/package.json `version` field
# without using `npm version` (host-npm forbidden by frontend/CLAUDE.md).
# Pure shell + sed; no Node, no dnpm container round-trip.
#
# Usage:
#   bash scripts/bump-version.sh           # patch (default)
#   bash scripts/bump-version.sh patch
#   bash scripts/bump-version.sh minor
#   bash scripts/bump-version.sh major
#
# Leaves the change unstaged so you can review + add it alongside
# the slice's other changes.

set -euo pipefail

BUMP="${1:-patch}"
case "$BUMP" in
  patch|minor|major) ;;
  *)
    echo "Unknown bump kind: $BUMP" >&2
    echo "Use: patch | minor | major (default: patch)" >&2
    exit 1
    ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && { echo "Not in a git repo" >&2; exit 1; }
PKG="$REPO_ROOT/frontend/package.json"
[ -f "$PKG" ] || { echo "Missing $PKG" >&2; exit 1; }

CUR=$(grep -m1 '"version"' "$PKG" | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
[ -z "$CUR" ] && { echo "Could not parse current version from $PKG" >&2; exit 1; }

IFS='.' read -r MAJ MIN PAT <<<"$CUR"
case "$BUMP" in
  patch) PAT=$((PAT + 1)) ;;
  minor) MIN=$((MIN + 1)); PAT=0 ;;
  major) MAJ=$((MAJ + 1)); MIN=0; PAT=0 ;;
esac
NEXT="$MAJ.$MIN.$PAT"

# In-place replace just the first "version": "..." line. BSD sed (macOS)
# needs an explicit '' after -i; gnu sed doesn't. Use the portable form.
TMP=$(mktemp)
awk -v cur="\"version\": \"$CUR\"" -v nxt="\"version\": \"$NEXT\"" '
  !done && index($0, cur) { sub(cur, nxt); done=1 }
  { print }
' "$PKG" > "$TMP"
mv "$TMP" "$PKG"

echo "Bumped frontend/package.json: $CUR → $NEXT"
echo
echo "Next steps:"
echo "  - Drop a markdown entry under frontend/changelog/unreleased/"
echo "  - git add -p frontend/package.json frontend/changelog/unreleased/..."
echo "  - git commit -m 'feat(...): ...'"
