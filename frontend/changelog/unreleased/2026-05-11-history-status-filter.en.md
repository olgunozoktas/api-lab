---
title: Filter history by status class
date: 2026-05-11
---

The history sidebar gained five filter pills above the list — **All**,
**2xx**, **3xx**, **4xx**, **5xx**. One click narrows the visible
entries to a single status family, so during a debug session you can
say "only show me the 500s I just hit" without scrolling past every
success. Filters compose with the existing search box: type
`/users`, click **5xx**, see only the requests to `/users` that
returned a 5xx.

The active pill is highlighted; click **All** to clear. Filter state
is per-session — it resets on app launch so you don't open the
sidebar tomorrow with a stale 4xx filter still on.
