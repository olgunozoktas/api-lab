---
title: ⌘⇧T reopens the last closed tab
date: 2026-05-11
---

Hit `⌘ + Shift + T` to bring back the tab you just closed — the
same browser-standard shortcut. Reopens with the full state intact:
URL, method, headers, body, auth, response (if it had one). Stacks
up to 10 deep, so you can pop multiple reopens in sequence after a
"close to the right" cleanup you regret.

The recently-closed stack is session-only (in-memory, not persisted)
— matches Chrome / Safari behaviour. Live unsaved edits in the
closing tab snapshot into the stack first, so reopen restores them
verbatim instead of falling back to the saved request.

`⌘ T` without Shift still creates a fresh blank tab; the Shift
modifier is the only switch.
