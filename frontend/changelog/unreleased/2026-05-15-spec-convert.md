---
title: Convert an OpenAPI spec into a collection from the editor
date: 2026-05-15
---

The OpenAPI spec editor now has a **Convert** button. Click it and
every operation in the spec becomes a saved request in your
sidebar Collections — folders by tag, example bodies, auth stubs,
the lot — exactly as the sidebar Import does, but from whatever
you've got open and edited in the editor.

The button is disabled while the spec has validation errors, so
you fix the spec first and convert a clean one. Warnings (skipped
external refs, unsupported auth) don't block — they're reported in
the toast afterwards just like a normal import.

This completes the OpenAPI editor: open a spec, see its operations
and validation live, edit it, save it, and turn it into runnable
requests — all in one tab.
