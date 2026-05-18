---
title: Saved requests remember their last response
date: 2026-05-18
---

Re-selecting a saved request now brings back the response you last got
from it — instead of an empty panel. Send request A, switch to request
B, come back to A, and A's last response is right there waiting.

The memory is per-session and bounded (the most recent 30 saved
requests), so it never bloats the app's stored state or carries
across relaunches. Requests you haven't sent yet still open to a clean
empty panel.
