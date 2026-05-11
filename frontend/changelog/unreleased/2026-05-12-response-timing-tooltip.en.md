---
title: Hover the elapsed-ms badge to see the timing breakdown
date: 2026-05-12
---

The Zig bridge has been collecting curl's timing breakdown all
along — but the only thing the UI showed was a single elapsed-ms
number. The badge now reveals the full breakdown on hover:

- **DNS** — name lookup time
- **TCP / TLS handshake** — connect time
- **TTFB (first byte)** — time-to-first-byte after the request hit
  the wire
- **Total** — round-trip total

The breakdown turns "this request was slow" into "DNS took 700ms",
"TLS took 1.2s", or "the server took 4s before sending the first
byte" — three very different problems. Replayed history entries
without timing data still show the plain elapsed string.
