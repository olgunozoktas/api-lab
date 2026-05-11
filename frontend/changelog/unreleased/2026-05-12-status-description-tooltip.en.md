---
title: Hover the status pill to see what the class means
db_drift_marker_only: ignore
date: 2026-05-12
---

Hovering the response **status pill** now shows a plain-English
description of the status class on top of the existing `200 OK` /
`404 Not Found` label:

- **1xx** — informational, server's still processing
- **2xx** — success, request was received + accepted
- **3xx** — redirect, curl auto-follows per Max-redirects
- **4xx** — client error, fix the request on your side
- **5xx** — server error, check the server logs

Same `cursor-help` affordance the elapsed-ms badge gained earlier.
Helpful for anyone seeing an unfamiliar code (`409`, `422`, `503`)
who doesn't want to leave the app to look it up.
