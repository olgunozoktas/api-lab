---
title: Guides + Changelog modals now have a fixed height
date: 2026-05-10
---

The Guides and Changelog modals used to grow + shrink with the
length of the active entry. Switching from a one-paragraph guide
to a full v0.1.0 changelog felt jarring because the modal would
suddenly become much taller.

Both now use `h-[88vh]` (always 88% of the window height) instead
of `max-h-[88vh]`. Long entries scroll inside the modal; short
entries leave breathing room at the bottom. No layout shift on
selection change.
