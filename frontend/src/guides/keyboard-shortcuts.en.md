---
title: Keyboard shortcuts
group: Workspace
order: 10
---

Everything you can do without leaving the keyboard. All shortcuts use
**⌘** on macOS (the only platform API Lab ships natively).

## Sending requests

| Shortcut | Action                                                           |
| -------- | ---------------------------------------------------------------- |
| ⌘ Enter  | Send the current request                                         |
| ⌘ .      | Cancel the in-flight request                                     |
| ⌘ S      | Save the current request to the active folder                    |
| ⌘ N      | New request — resets the active tab to blank                     |
| ⌘ L      | Focus + select-all on the URL bar (browser address-bar standard) |

## Tabs

| Shortcut     | Action                                           |
| ------------ | ------------------------------------------------ |
| ⌘ T          | New tab                                          |
| ⌘ ⇧ T        | Reopen the most recently closed tab              |
| ⌘ W          | Close the active tab                             |
| ⌘ 1..9       | Jump to tab N (or the last tab if N > tab count) |
| ⌥ ⌘ →        | Cycle to the next tab                            |
| ⌥ ⌘ ←        | Cycle to the previous tab                        |
| Middle-click | Close the tab under the cursor                   |
| Double-click | Rename the tab                                   |
| Drag         | Reorder tabs                                     |

The strip scrolls horizontally when many tabs are open — swipe with
the trackpad to move between them. The scrollbar is hidden by design;
the active tab auto-scrolls into view when you switch with ⌘ 1..9 or
the quick switcher.

## Navigation & layout

| Shortcut | Action                                        |
| -------- | --------------------------------------------- |
| ⌘ P      | Quick switcher — fuzzy-find any saved request |
| ⌘ B      | Toggle the sidebar (saved requests + history) |
| ?        | Open this Guide hub                           |

## Composer

| Shortcut         | Action                                                       |
| ---------------- | ------------------------------------------------------------ |
| ⌘ V (in URL bar) | Paste a cURL command — auto-fills method, URL, headers, body |

## Tips that don't have a shortcut yet

- **Right-click** anywhere — most surfaces (tabs, sidebar items, saved
  requests, history entries, response headers) have a context menu
  with the most useful actions.
- **Resize panes** by dragging the dividers between sidebar / composer
  / response viewer. Double-click a divider to reset to defaults.
- **Status filter pills** above the history sidebar narrow the list to
  a single status class (2xx / 3xx / 4xx / 5xx) — handy when chasing
  a 500 you just hit.

Have an idea for a missing shortcut? File it in the project's GitHub
backlog so it lands in a future release.
