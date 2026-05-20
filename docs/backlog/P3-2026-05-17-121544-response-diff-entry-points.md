# Response diff — discoverability + pre-seeded entry points

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-170900-response-viewers-html-image-pdf-hex-diff.md`
(shipped 2026-05-17 as v0.8.0). The response diff shipped reachable
only from the TopBar **Compare responses** button, and the modal
always starts with both sides unpicked.

CEO + Eng lens (both agree): the modal already takes any source pair —
it just needs entry points that *pre-seed* a side. "Compare this
response with…" from a history entry or a tab is the delightful,
discoverable version; the modal container needs only an optional
`initialLeft` / `initialRight` prop, so the cost is entry points, not
new diff machinery.

## Items

- [x] `ResponseDiffModal` accepts optional `initialLeftId` /
      `initialRightId` props; TopBar keeps opening it unseeded.
- [x] History list context menu: "Compare with…" — opens the diff
      modal with that entry pre-selected as the left source.
- [x] Tab context menu (or response viewer overflow menu): "Compare
      response with…" — pre-selects the active tab's response.
- [ ] QuickSwitcher / palette entry for "Compare responses" so the
      diff is keyboard-reachable. (Deferred — needs a new "commands"
      sub-section in QuickSwitcher's typed Item union; ship when the
      switcher grows other commands and it can earn its keep.)

## Acceptance

Right-clicking a history entry or tab offers "Compare with…", which
opens the diff modal with that source already chosen. The diff is
also reachable from the command palette.

## Tradeoffs

- Only history entries with a retained body (and non-binary tab
  responses) can be a pre-seeded source — the menu item is hidden /
  disabled otherwise, matching the modal's source list.
- Intra-line character-level diff (currently a changed line is one
  whole-line remove + add) is a separate polish — noted here, not
  scoped into this item.

## How to work on this

1. Add the optional initial-source props to `ResponseDiffModal`.
2. Reuse the existing context-menu primitives (`HistoryList` already
   uses `ui/context-menu`).
