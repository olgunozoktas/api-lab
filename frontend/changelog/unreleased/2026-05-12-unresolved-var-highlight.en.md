---
title: Unresolved `{{vars}}` highlighted red in URL preview
date: 2026-05-12
---

The resolved-URL preview below the URL bar now flags any `{{var}}`
references that aren't defined in the active environment. They render
in red with a subtle red-tinted background, so a typo in the variable
name or a missing environment key is obvious before you hit Send.

The preview row also shows up whenever there's at least one
unresolved reference — even if no substitutions changed the visible
string — so missing keys never go unnoticed. Hover any red chunk to
see the exact variable name in a tooltip.
