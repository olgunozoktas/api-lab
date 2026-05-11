---
title: HTML response preview in the response body pane
date: 2026-05-11
---

When an API returns `text/html` (or a body that begins with
`<!doctype html` / `<html`), the response **Body** tab now renders
the page inside a fully-sandboxed iframe instead of showing the
raw markup.

The iframe uses `sandbox=""` (no scripts, no forms, no popups, no
top-navigation, no same-origin storage) so even hostile HTML can't
escape into the app — it's purely a visual preview. The source
view is still one click away in the **Raw** sub-tab.

Useful for:

- Probing health-check endpoints that return a status page
- Inspecting OAuth consent screens before automation
- Verifying error pages mid-debug without leaving the app
