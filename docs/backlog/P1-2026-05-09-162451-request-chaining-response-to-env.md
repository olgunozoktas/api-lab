# Request chaining — response → env variable auto-extraction

Priority: P1

## Context

The single biggest workflow gap in the app today: testing a real API
that requires auth + chained calls (login → use token → resource call
→ use resource id → next call) is painful. Users have to manually copy
the `access_token` / `id` from the response viewer, switch to env
modal, paste, save, switch back. Postman/Insomnia/Bruno all let you
right-click any value in the response and "Set as variable" in one
click. Without this, real-world API workflows are 3-4 clicks per step
instead of 1.

Two layers ship together:

1. **UI-side one-click extraction** — right-click any value in the
   JSON response tree (or select a substring in raw view) → "Save as
   variable...". A small dialog asks for the variable name (defaulted
   to the JSON key path, e.g. `access_token`); on confirm, the value
   lands in the active environment.
2. **Script-side auto-chaining** — the existing post-response
   QuickJS sandbox already supports `pm.environment.set()`. Extend
   the docs / Scripts tab to surface common patterns
   (`pm.environment.set("token", pm.response.json().access_token)`)
   as one-click "snippets" in the script editor sidebar.

The script-side path already works today via QuickJS (shipped
2026-05-08); v1 of this slice is mostly UI affordances + the
right-click-to-extract dialog.

## Items

- [ ] Right-click handler on `JsonView` nodes in the response viewer
      (`frontend/src/components/ResponseBody.tsx`) — currently no
      right-click; needs `@uiw/react-json-view`'s `customNodeContext`
      or a wrapper Radix `ContextMenu` on the tree container.
- [ ] "Save as variable..." dialog (reuse the existing dialog
      primitive) — pre-fills variable name from the JSON path,
      auto-selects the active environment, single text input + Save
      button.
- [ ] On Save: `setEnvVar(envId, name, value)` — store action exists
      already, just wire it up.
- [ ] Substring extraction from raw view — `selectionchange` listener
      on the body `<pre>`; if user has a non-empty text selection,
      a floating "Save selection as variable..." button appears.
- [ ] Scripts-side snippets palette: small dropdown or list of
      common patterns (`pm.environment.set("X", pm.response.json().Y)`,
      `pm.test("status is 200", () => pm.expect(pm.response.code).to.equal(200))`)
      that insert into the script editor at cursor position.
- [ ] i18n keys: `chain.saveAs`, `chain.varName`, `chain.savedToast`,
      `chain.snippets.label`, etc.
- [ ] Tests: variable extraction from JSON path string; snippet
      insertion; env mutation isolation (script changes don't leak
      to other tabs' env reads).

## Acceptance

User flow: login request returns `{"access_token": "abc"}`. User
right-clicks the `access_token` value → "Save as variable..." → name
defaults to `access_token` → Save → toast "Saved to env: prod".
Subsequent requests using `{{access_token}}` in their Authorization
header pick up the new value automatically. No env modal switching,
no copy-paste.

Bonus: from the Scripts tab, user clicks the "extract token to env"
snippet → editor inserts
`pm.environment.set("access_token", pm.response.json().access_token);`
ready to be saved on the request.

## Tradeoffs

- **Variable name auto-derivation** — the JSON path
  (`response.data.user.id` → suggested name `id`) is mostly right,
  but ambiguous for arrays (`response[0].name`). v1 picks the
  trailing key; v2 could surface a path picker (`data.user.id` vs
  `id`). Punt v2 to a follow-up.
- **Active environment** — what if no env is active? Default to
  prompting "Create env or use scoped global var". v1 just prompts
  to select an env first.
- **Substring vs structural extraction** — JSON tree clicks give
  type-safe values (string/number/bool); raw text selection gives
  whatever the user highlighted. Both are useful; v1 supports both.
- **`@uiw/react-json-view` customization** — the library exposes
  per-node hooks but they're awkward for context menus. May need
  a wrapper that intercepts `oncontextmenu` on the tree root +
  walks the DOM to find the clicked node. Brittle; alternative:
  fork the tree component or switch to a more flexible JSON viewer.
  Prototype the wrapper first; switch only if it doesn't pan out.

## How to work on this

1. Read `frontend/src/components/ResponseBody.tsx` for the JsonView
   wiring.
2. Read `frontend/src/lib/scriptSandbox.ts` for the `pm.*` API
   surface — that's where the auto-chain script side runs.
3. Read `frontend/src/store/index.ts` for the env mutator shape —
   `setEnvVar`/`updateEnvironment` are the targets.
4. Reuse the existing `useConfirm` / dialog primitive for the
   "Save as variable..." UI.
5. New context menu can REUSE `frontend/src/components/ui/context-menu.tsx`
   from this session's sidebar work.
6. Wire the snippets list inline in `ScriptsPanel.tsx` — keep
   simple, no separate file unless it grows past 100 LOC.
