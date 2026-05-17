---
title: Update check — know when a new release is out
date: 2026-05-17
---

API Lab now checks for updates on launch. It makes a single request
to the GitHub Releases API, and when a newer version than the one
you're running exists, a small **Update** pill appears next to the
version badge in the top bar — click it to open the release page.

It's one best-effort request with no telemetry. Turn it off in
Settings → "Check for updates on launch" if you'd rather skip it.
