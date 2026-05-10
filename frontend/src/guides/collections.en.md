---
title: Collections — organize requests into folders
group: Workspace
order: 0
---

The **Collections** tab in the sidebar is the persistent home for
saved requests. Think of it as your Postman workspace: a tree of
folders + requests that survives across reloads.

## Saving a request

1. Build the request in the composer.
2. Press `⌘ S` (or click **Kaydet / Save**).
3. The first save creates a top-level entry; subsequent saves update
   it in place (the `id` sticks, parent + order preserved).

## Folders

- **+ Folder** in the sidebar header creates a root-level folder
  with an auto-name (`Yeni klasör / New folder`). Type immediately
  to rename — `↵` accepts, `Esc` cancels.
- **Right-click → New sub-folder** nests under any folder.
- **Right-click → New request** drops a fresh empty request inside
  the folder and switches your composer to it.
- **Drag** a request or folder onto another folder to move it
  (auto-expands the destination so you see where it landed).
- The drag is cycle-guarded — you can't drop a folder into one of
  its own descendants.

## Inline rename + delete

- **Double-click** any name to enter rename mode.
- **Right-click → Sil / Delete** with a confirmation modal.
- Deleting a folder takes its kids with it (with a confirm prompt
  naming the folder).

## Search

The search bar above the tree filters visible nodes live across name
and URL. Folders containing matches stay expanded; non-matching
nodes disappear. Clear with the `✕`.
