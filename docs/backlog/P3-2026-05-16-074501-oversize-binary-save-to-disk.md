# Oversize binary responses — a save-to-disk escape hatch

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-16-071035-binary-response-body-bridge.md`
(shipped 2026-05-16). The binary channel base64-encodes non-text
responses over the bridge, but the zero-native bridge result buffer is
1 MB, so the channel caps raw binary at **720 KB** (`MAX_BINARY_RAW`).
Past that the handler returns `body_too_large: true` with an empty
body and the UI shows a "too large to preview" notice.

The dead-end: with no bytes frontend-side, the user can't preview AND
can't download — a 2 MB PDF or a video response is simply unreachable
from API Lab. For an API tester that's a real gap; oversize binary
responses are common (media endpoints, file downloads).

## Items

- [ ] Decide the mechanism. Two candidates:
  - **Raise the ceiling** — bump zero-native's `max_result_bytes`
    (cross-repo change in `~/Herd/zero-native`). Simple, but every
    bridge response then allocates a bigger stack buffer.
  - **Native save-to-disk** — a new bridge command (or a flag on
    `http.request`) that writes the curl body straight to a
    user-chosen path via a Zig file handler, bypassing the JSON
    result buffer entirely. Scales to any size; needs a file-save
    dialog.
- [ ] Implement the chosen path end-to-end (Zig handler + frontend
  wiring + the "too large" UI gaining a working Download button).
- [ ] Tests for the size boundary and the save path.

## Acceptance

A binary response larger than the preview cap can still be saved to
disk byte-identical from the "too large" state.

## Tradeoffs

- Raising `max_result_bytes` is a blunt instrument — it inflates the
  fixed buffer for every bridge call, not just large binary ones.
- A save-to-disk bridge command needs a native file dialog; the
  `filesystem` permission is declared in `app.zon` but currently
  unused, so this would be its first real consumer.

## How to work on this

1. Read `src/handlers/http.zig` `writeBodyJson` + `MAX_BINARY_RAW`,
   and `~/Herd/zero-native/src/bridge/root.zig` for `max_result_bytes`.
2. The save-to-disk route is the more scalable design and exercises
   the dormant `filesystem` permission — likely the better long-term
   call, but heavier.
