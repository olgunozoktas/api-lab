---
title: Loading skeletons instead of blank-then-pop
date: 2026-05-18
---

API Lab used to show a blank response area while a request was in
flight, then pop the result in all at once — which reads as slow even
when it isn't.

Now a slow request shows a **loading skeleton** in the response body —
a set of shimmer placeholder lines — so the app feels responsive while
it waits. A delay threshold means fast responses still appear
instantly, with no skeleton flicker.

The sync banner also gained a calm **"Syncing…"** strip while a
git-sync is in progress, so collection sync is no longer silent until
it finishes.
