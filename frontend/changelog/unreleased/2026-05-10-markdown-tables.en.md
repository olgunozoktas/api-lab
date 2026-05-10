---
title: Markdown tables now render in Guides + Changelog
date: 2026-05-10
---

GFM-style tables (`| col | col |\n|---|---|\n| a | b |`) used in
the Body modes / Auth / Copy as code guides were rendering as
single-line raw text — the in-app markdown subset renderer had
no table support, so the pipe-rows were getting glomed into one
big paragraph.

Fixed: the renderer now detects a header row immediately followed
by a `|---|---|` separator and parses subsequent pipe-rows as
table data. Cells run through the same inline transformer as
paragraphs, so `**bold**` / `` `code` `` / `[links](url)` work
inside table cells.

Tailwind styling added to both the GuideCard and ChangelogEntryCard
prose blocks: bordered table, headerstrong with elev-bg, even row
spacing, last-row no border.

Bare `| solo line |` without a separator still renders as a
paragraph (so non-table pipe content doesn't accidentally become
a one-cell table). Cell-alignment markers (`:---:`, `---:`,
`:---`) are accepted in the separator but not yet honored at
render time.
