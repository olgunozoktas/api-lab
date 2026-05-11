---
title: SVG response preview in the response body pane
date: 2026-05-11
---

When an API returns `image/svg+xml` (or a body that begins with
`<svg`), the response **Body** tab now renders the SVG as an inline
image instead of showing the raw markup.

Implementation: the SVG body is encoded as a `data:image/svg+xml;utf8,…`
URL and dropped into an `<img>` tag. Browsers explicitly disable
script execution for SVG used in image context (per the SVG-as-image
security model), so even SVGs that contain `<script>` tags can't run
code — the rendering path is safe without an iframe sandbox.

The **Raw** sub-tab still surfaces the source markup. Pairs with the
HTML preview that shipped earlier — both follow the same pattern: an
auto-detected visual preview in **Body**, raw markup in **Raw**, no
new tabs added.
