---
title: Quick switcher gains a command slot — Compare responses
date: 2026-05-21
---

The ⌘+P / ⌘+K quick switcher used to surface only user data (open
tabs, collections, history, samples). A fifth item kind — **command**
— now joins the mix for verb-shaped app actions.

First command: **Compare responses**. Type `compare` (or part of it)
and the diff modal entry rises to the top; Enter opens it. The
modal opens in its default unseeded flow, same as clicking the
TopBar's Compare responses button — handy when both your hands are
already on the keyboard.

Commands are tagged with a "CMD" badge in the method column so
they're visually distinct from data items, and they ignore the
⌘+Enter "open in new tab" branch (they're verbs, not items to
load).

Future entries plug into a single `COMMANDS` array in
`QuickSwitcher.tsx` — adding a new palette action is one line.
