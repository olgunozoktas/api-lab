---
title: Live API docs preview in the OpenAPI editor
date: 2026-05-18
---

The OpenAPI editor gains a **Docs** view. Click **Docs** in the editor
toolbar and the right pane switches from the validation / lint panel
to a live **Redoc**-rendered documentation preview — the same
three-column docs (operations sidebar, details, code samples) you'd
publish, right beside the spec you're editing.

The preview updates as you type (debounced), and its theme follows
API Lab's — dark spec, dark docs. Toggle back to **Panel** any time to
return to validation and linting.

**Export HTML** writes the docs out as a portable, single-file Redoc
page you can open in any browser or hand to a teammate.

Redoc is large (~1 MB), so — like the linter — it loads only when you
first open the Docs view; API Lab's startup is untouched.
