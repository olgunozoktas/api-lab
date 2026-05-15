---
title: OpenAPI spec editor — edit a spec with a live operations outline
date: 2026-05-15
---

There's a new **Spec** button next to Import in the sidebar. Pick an
OpenAPI `.yaml` / `.yml` / `.json` file and it opens in a dedicated
**spec editor tab**.

The editor tab shows a CodeMirror editor on the left — with YAML and
JSON syntax modes, bracket matching, code folding, and search — and a
live **operations outline** on the right. As you edit, the outline
re-parses and lists every operation grouped by its tag, so you can
see the shape of the API at a glance. A malformed spec is flagged
instead of silently showing nothing.

Spec tabs behave like any other tab: they sit in the tab strip
(marked `SPEC` instead of an HTTP method), survive tab switches,
and can be closed and reopened with ⌘⇧T.

This is the editor surface for Phase K. Live schema validation,
saving the spec back to disk, and a one-click "convert to
collection" land in the next updates.
