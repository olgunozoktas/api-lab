# Backlog

This folder is the **executable view** of the project plan. The strategy doc lives at `~/.claude/plans/refactored-churning-newt.md` (private, not pushed). Each backlog file is one ship cycle.

## Layout

- `inbox/` — captured ideas, not yet planned
- `P1-*` / `P2-*` / `P3-*` — refined items in priority queue (P1 = next ship)
- `done/` — archived after `/backlog ship` completes
- `plans/` — planning sidecars per item (optional)
- `.profile.jsonl` — local-only event stream (gitignored)

## Format

Each P-tier file: priority, context, items checklist, acceptance criteria. Filename is `P<tier>-<UTC-yyyy-mm-dd-HHMMSS>-<slug>.md`. Inbox uses the same timestamp format without the priority prefix.

## Workflow

1. Capture rough ideas: `/inbox <text>` → drops a file into `inbox/`
2. Promote to a planned item: `/backlog refine` → walks the template, moves into the live queue
3. Pick the next item: `/backlog next`
4. Ship it: `/backlog ship <path>`
5. After completion the file moves to `done/` automatically

See the backlog-skill-family docs in `~/.claude/skills/backlog/` for the full conventions.
