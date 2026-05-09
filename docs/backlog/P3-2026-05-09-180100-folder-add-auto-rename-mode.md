# Folder add: auto-trigger inline rename after creation

Priority: P3

## Context

The `+ Folder` button (Sidebar.tsx:NewFolderButton) currently:

1. Calls `addFolder(null, "Yeni klasör")` synchronously.
2. Folder appears in the tree with the default name.
3. User must double-click the folder to start renaming.

Step 3 is a small papercut. Postman / VS Code / Finder all auto-enter rename mode immediately after creating a new folder so the user can just type the desired name. We should match that.

## Items

- [ ] Add a `pendingRenameId: string | null` field to the Zustand store (or local state shared between `Sidebar` and `CollectionList` via context)
- [ ] `addFolder` action sets `pendingRenameId` to the new folder's id
- [ ] `CollectionList.tsx:FolderRow` checks if `item.id === pendingRenameId` on mount; if so, immediately enters rename mode + auto-focuses the input
- [ ] After the user commits or cancels the rename, clear `pendingRenameId`
- [ ] Same UX could apply to "+ New request" (saveCurrent → enter rename mode) — out of scope for this slice

## Acceptance

Click `+ Folder` → folder appears in the tree → input is already open + focused → type the name → Enter commits. ESC cancels (folder stays with default "Yeni klasör" name; user can still double-click later to rename).

## Tradeoffs

- Sharing `pendingRenameId` via Zustand keeps the data flow consistent with the rest of the app, but it's a tiny state slice that could just be local React state. Either is fine.
- Auto-focusing an input on mount needs a `useEffect` with empty deps; works under StrictMode's double-mount in dev because focus is idempotent.

## How to work on this

1. Phase Folder shipping completed in commit `f0ebac3`; rename UI already exists in `FolderRow`.
2. Most of the work is wiring `pendingRenameId` through the store + `FolderRow.useEffect`.
