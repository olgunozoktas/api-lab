---
title: Tab strip now shows last response status code
date: 2026-05-11
---

Each tab in the strip above the composer now carries a small status
pill between the method indicator and the title — `200`, `404`,
`500`, etc — colored by status family (2xx green, 4xx orange, 5xx
red, others muted).

Quick glance across a busy tab strip tells you which requests
succeeded, which need debugging, and which haven't been sent yet.
The pill is empty for fresh tabs that haven't received a response.

Hover for the full `200 OK` / `404 Not Found` etc. label; ARIA
exposes the same string for screen readers.
