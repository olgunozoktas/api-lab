---
title: Toasts now stack, and errors look like errors
date: 2026-05-18
---

API Lab's toast notifications got a real overhaul. Previously a single
message showed at a time — fire two in quick succession and the first
was lost, and a failure looked exactly like a success.

Now toasts **stack**: up to four are visible at once, each sliding in
and out with a small animation. Every toast carries a **severity**
colour — green for success, red for errors, amber for warnings, blue
for info — so a failed request or a broken JSON body reads as a
problem at a glance. Each toast can be dismissed early with its ×
button, and toasts can carry an action button for future "Undo"-style
affordances.

Around 40 places that raise toasts — copies, saves, imports, mock
server start/stop, network errors — now pass the right severity, so
the colour coding is live across the whole app.
