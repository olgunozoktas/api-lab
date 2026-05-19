# Wire Undo actions into destructive operations via the toast affordance

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-064050-toast-queue-severity.md`
(shipped 2026-05-18). That slice built the toast system including a
per-toast **action affordance** — `ToastEntry.action = { label, onAction }`,
which `ToastItem` renders as a button. But no caller passes an `action`
yet, so the affordance is dead code: the capability exists, nothing
exercises it.

The natural payoff is **Undo**. Destructive operations — deleting a
collection item, closing a tab, clearing history — currently happen
with no safety net (or rely on a separate `reopenLastClosedTab`
shortcut). A toast with an "Undo" button on each destructive action is
the modern, discoverable pattern and now costs only the wiring.

## Items

- [x] Identify the destructive operations worth an Undo toast — at
      minimum collection-item delete; consider tab close, history clear.
      *(Scoped to collection-item delete per the Tradeoffs first-cut
      guidance; tab close / history clear noted as Follow-ups.)*
- [x] For each, capture the pre-delete state, then
      `showToast(t("…"), { severity: "info", action: { label: t("undo"),
      onAction: () => restore() } })`.
- [x] Add the `undo` (+ per-operation) i18n keys to `tr.ts` / `en.ts`.
- [x] Confirm the restore path is correct (order, parentId, expansion
      state for folders). *(`restoreCollectionItems` re-inserts the
      verbatim removed slice — `id`/`parentId`/`order` intact — and
      merges back the removed folders' expansion state; covered by
      `collectionUndo.test.ts`.)*

## Follow-ups

Tab close already has the `reopenLastClosedTab` shortcut; history
clear has no Undo. Both are candidate Undo-toast wirings but were left
out of this first cut per the Tradeoffs guidance ("scope the first cut
to single-item delete and grow from there"). One known gap: an open
tab that pointed at a deleted request gets its collection link nulled
on delete and is *not* re-linked by Undo — the tree item returns but
the tab stays unsaved. Re-linking would need the nulled-tab set
captured too; deferred as minor.

## Acceptance

Deleting a collection item raises a toast with a working "Undo" that
fully restores it; the action affordance built in #30 is exercised by
at least one real flow.

## Tradeoffs

Undo needs a snapshot of the pre-delete state held until the toast
expires — cheap for a single item, but a "delete folder" Undo must
snapshot the whole subtree. Scope the first cut to single-item delete
and grow from there.

## How to work on this

1. The affordance is already built — `ToastEntry.action` +
   `ToastItem`'s button. This item is pure wiring on the caller side.
2. `store/collections.ts` owns item deletion; capture state there or
   in the component that triggers the delete.
3. Toasts with an `action` already get a longer duration
   (`TOAST_ACTION_DURATION`, 6 s) so the user has time to react.
