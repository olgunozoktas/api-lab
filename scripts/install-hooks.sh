#!/usr/bin/env bash
# Install repo-tracked git hooks by pointing `core.hooksPath` at `scripts/`.
#
# Why core.hooksPath instead of symlinks under .git/hooks/:
#   - Worktree-safe: in a worktree, `.git` is a *file* pointing into
#     <primary>/.git/worktrees/<name>/, so symlinking under .git/hooks/
#     fails. core.hooksPath is read once per `git` invocation and
#     resolves the same in every worktree.
#   - Tracked: scripts/ is committed, so every clone gets the same
#     hook content as soon as this script runs.
#   - Idempotent: re-running is a no-op.
#
# Run once per fresh clone (or after `git init`).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

HOOKS_PATH="scripts"

if [ ! -f "$HOOKS_PATH/pre-commit" ]; then
  echo "Source hook not found at $HOOKS_PATH/pre-commit" >&2
  exit 1
fi

chmod +x "$HOOKS_PATH/pre-commit"

CURRENT="$(git config --local --get core.hooksPath || true)"
if [ "$CURRENT" = "$HOOKS_PATH" ]; then
  echo "  ✓ core.hooksPath already set to $HOOKS_PATH"
else
  git config --local core.hooksPath "$HOOKS_PATH"
  echo "  ✓ core.hooksPath set to $HOOKS_PATH"
fi

echo
echo "Done. Bypass with --no-verify if needed."
