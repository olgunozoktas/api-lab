# Replace native window.alert / confirm / prompt with React-based dialogs

Priority: P1

## Context

zero-native's WKWebView host (`~/Herd/zero-native/src/platform/macos/appkit_host.m`) does NOT implement any of the JS panel delegate methods:

- `webView:runJavaScriptAlertPanelWithMessage:initiatedByFrame:completionHandler:` — missing
- `webView:runJavaScriptConfirmPanelWithMessage:initiatedByFrame:completionHandler:` — missing
- `webView:runJavaScriptTextInputPanelWithPrompt:defaultText:initiatedByFrame:completionHandler:` — missing

WKWebView's default behavior when these delegates aren't implemented:

- `window.alert(msg)` — silently no-op (no panel ever shows)
- `window.confirm(msg)` — silently returns `false`
- `window.prompt(msg, default)` — silently returns `null`

Surfaced in api-lab 2026-05-09: the `+ Folder` button silently no-op'd because it called `prompt()`. Fixed in commit `ca1d6bd` by removing the prompt and using auto-name + inline rename.

But the same WKWebView limitation breaks several other destructive flows that still use `window.confirm()`:

- `Sidebar.tsx:ClearHistoryButton` — `confirm("Geçmiş silinsin mi?")` always returns false → "Clear" button silently no-op
- `CollectionList.tsx:FolderRow` — `confirm("collections.confirmDeleteFolder", { name })` always false → folder delete silently no-op
- `CollectionList.tsx:RequestRow` — `confirm("kv.confirmDelete")` always false → request delete silently no-op

Users see destructive buttons that "don't work" and have no way to actually delete things via the UI.

## Items

- [x] Build a small `useConfirm()` hook returning a Promise-based confirm shaped like the native `window.confirm()` so swap-in is trivial
- [x] Build a `useAlert()` hook for one-line notifications (used rarely; could fold into existing toast)
- [x] Implement these via the existing `Dialog` shadcn primitive (`frontend/src/components/ui/dialog.tsx`)
- [x] Mount a single `<DialogsProvider>` at the React root (main.tsx, inside ErrorBoundary)
- [x] Replace every `window.confirm(...)` call in the codebase:
  - `Sidebar.tsx:ClearHistoryButton`
  - `CollectionList.tsx:FolderRow` delete
  - `CollectionList.tsx:RequestRow` delete
- [ ] (deferred) `usePromptDialog()` — no current use cases now that folder-add uses inline rename. File P3 follow-up if needed.
- [ ] (deferred) Replace `alert(...)` in ErrorBoundary fallback — that path runs only when navigator.clipboard fails AND React tree may be half-broken; using a hook there is risky. Console + alert is the safe last-ditch.
- [ ] (deferred) Vitest unit tests for the hooks — needs `@testing-library/react` setup (covered by P3 #094100).

## Acceptance

- "Clear history" button shows a real confirm modal with localized text; clicking Yes actually clears the history. No is a no-op.
- Folder X button shows a real confirm modal with the folder name; clicking Yes deletes the folder + all descendants.
- Request X button shows a real confirm modal; Yes deletes the request.
- ESC closes any of these modals as Cancel; ENTER on a focused button activates it.
- ARIA: each modal has `role="alertdialog"` for confirms, `role="dialog"` for prompts. Focus is trapped while open.

## Tradeoffs

- Adds another `<DialogProvider>` to the tree — small bundle cost (~2 KB).
- Promise-shaped API mismatches React's idiomatic state-driven pattern slightly. Acceptable: the swap-in cost from `confirm()` is one-line per call site, vs. refactoring every consumer to manage modal-open state.
- Could alternatively patch zero-native to implement the panel delegates upstream. That fixes it for every project, but: (a) JS-side modals look better than the native macOS sheet, (b) cross-platform parity is easier with HTML modals (Linux WebKitGTK has its own quirks), (c) JS-side ships immediately without an upstream contribution cycle.

## How to work on this

1. Read `frontend/src/components/ui/dialog.tsx` for the existing shadcn primitive.
2. Look at how the existing `Toast` component is mounted at `App.tsx` to mirror the pattern.
3. Confirm callsites:
   ```bash
   grep -rn "confirm(\|alert(\|prompt(" frontend/src --include="*.ts" --include="*.tsx"
   ```
4. After this lands, sweep CLAUDE.md to add a note: "WKWebView ignores native JS panels. Use the `useConfirm` / `useAlert` / `usePromptDialog` hooks from `lib/dialogs.ts` — never `window.confirm` / `alert` / `prompt`."

## Status

**Shipped 2026-05-09** in worktree `feat/native-dialogs-replace`
(merge `80bfd47`). All three confirm() callsites swapped:
ClearHistoryButton, FolderRow delete, RequestRow delete. Dialog
renders with `role="alertdialog"`, ENTER confirms, ESC cancels,
overlay-click cancels.

The deferred items above (prompt hook, ErrorBoundary alert swap,
unit tests) are intentionally not blockers — see "Items" above for
rationale per item. When `@testing-library/react` lands via
`P3-2026-05-09-094100-ui-component-tests.md`, the missing tests
get added there.
