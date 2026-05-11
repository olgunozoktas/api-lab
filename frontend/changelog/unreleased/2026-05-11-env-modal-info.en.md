---
title: Environments modal: explainer + var count + active badge
date: 2026-05-11
---

Opening the Environments editor now greets you with a short hint
explaining what environments are for (`{{name}}` references in URL /
headers / body, substituted at request time) plus a tiny example.
Easier first encounter for anyone meeting the concept inside API Lab
for the first time.

Each environment row now also shows:

- A small **`N vars`** badge — how many key/value pairs are defined.
- An **active** badge on whichever environment is currently selected
  in the TopBar switcher, so the link between the modal and the
  top-bar dropdown is unambiguous.
