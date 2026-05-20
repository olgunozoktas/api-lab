#!/usr/bin/env bash
# Token-scale guard for the Tailwind v4 frontend.
#
# History: docs/backlog/done/P2-2026-05-18-064049-token-scale-migration.md
# migrated 175 raw `text-[9/10/11/12px]` values across 51 files onto
# the named `@theme` scale (`text-4xs/3xs/2xs` + the default
# `text-xs`). Without a check that enforces the line, the next
# careless edit reintroduces a raw value and the migration's value
# erodes silently. This script is that check.
#
# Behaviour:
#   - Greps `frontend/src/` for arbitrary `text-[Npx]` /
#     `text-[Nrem]` / `text-[N%]` values (anything where the bracket
#     opens with a digit — non-digit values like
#     `text-[var(--color-fg)]` are NOT matched).
#   - A hit is permitted IFF the same line OR the line immediately
#     above carries the marker `token-scale-allow`. That marker is
#     deliberately stable (no spaces, no punctuation) so reviewers
#     can grep for live exceptions in seconds.
#   - Exit 1 with `::error::` lines on any unmarked hit, mirroring
#     the `check-bundle-size.sh` style + the pre-commit hook output
#     shape.
#
# Wired into `scripts/pre-commit` so commits fail loudly when a raw
# value sneaks in. Skip with `git commit --no-verify` if you must —
# CI will catch it on push.
set -eo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/frontend/src"

if [ ! -d "$SRC_DIR" ]; then
  echo "::warning::No $SRC_DIR/ — skipping token-scale guard"
  exit 0
fi

# grep -nE: print line numbers, extended regex. Match `text-[`
# followed by a digit so token-style values like `text-[var(...)]`
# are NOT matched. -r recursive. --include="*.tsx" / "*.ts" to skip
# generated lockfiles, markdown, etc.
HITS_FILE=$(mktemp)
trap 'rm -f "$HITS_FILE"' EXIT

grep -rnE 'text-\[[0-9]' \
  --include="*.ts" --include="*.tsx" \
  "$SRC_DIR" > "$HITS_FILE" || true

if [ ! -s "$HITS_FILE" ]; then
  exit 0
fi

# Walk each hit. Permit when the line OR the line above carries the
# `token-scale-allow` marker. Anything else is reported and counted.
violations=0
while IFS=: read -r file lineno _; do
  [ -z "$file" ] && continue
  hit_line=$(sed -n "${lineno}p" "$file")
  prev_lineno=$((lineno - 1))
  prev_line=""
  if [ "$prev_lineno" -gt 0 ]; then
    prev_line=$(sed -n "${prev_lineno}p" "$file")
  fi

  if printf '%s\n%s\n' "$hit_line" "$prev_line" | grep -qF 'token-scale-allow'; then
    continue
  fi

  # A hit inside a `//` line comment is informational (the script's
  # own description, a code review note, an exception-rationale
  # comment that happens to spell `text-[Npx]` for clarity).
  # Comments compile to nothing; gating them as violations would
  # punish documentation. Strip leading whitespace, check for `//`.
  trimmed="${hit_line#"${hit_line%%[![:space:]]*}"}"
  case "$trimmed" in
    //*) continue ;;
  esac

  echo "::error file=${file},line=${lineno}::raw text-[<num>] outside the token scale — use text-4xs/3xs/2xs/xs, or annotate with a // token-scale-allow comment on the preceding line"
  violations=$((violations + 1))
done < "$HITS_FILE"

if [ "$violations" -gt 0 ]; then
  echo
  echo "$violations token-scale violation(s). Fix by switching to the named scale,"
  echo "or mark a deliberate exception with a // token-scale-allow comment line above."
  exit 1
fi

exit 0
