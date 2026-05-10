---
title: Quick switcher — jump between requests fast
group: Workspace
order: 1
---

Press **`⌘ P`** anytime to open the quick switcher. It's a fuzzy-
search palette that ranges across:

- Open tabs (top section)
- Saved collections (middle)
- Recent history (bottom)

Type to filter. Use `↑` / `↓` to move, `↵` to open, `Esc` to close.

## Search syntax

The matcher is a smart substring scorer:

- Plain text matches name + URL + method.
- `GET 401 login` matches a 401 response to a login endpoint.
- Tab names take priority over collection names so you can jump
  back to "the request I'm working on" by typing a fragment of its
  name.

## Multi-tab patterns

- `⌘ T` — new empty tab.
- `⌘ W` — close the active tab.
- `⌘ 1` … `⌘ 9` — jump directly to the Nth tab.
- Right-click a request in the sidebar → **Yeni sekmede aç / Open in
  new tab** to open without losing your current context.

The active environment + collections + history are shared across
tabs; only the request body / response are per-tab.
