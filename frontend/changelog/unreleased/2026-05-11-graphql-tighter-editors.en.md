---
title: GraphQL panel: tighter Query / Variables editors
date: 2026-05-11
---

The GraphQL panel used to reserve 180px for the Query editor and
120px for the Variables editor — fine for a long query, but with a
one-line `query { users { id name } }` the result was a huge empty
gap between the two boxes.

The min-heights are now 120px and 72px respectively, and the spacing
between Query and Variables tightened by one tick. Both editors still
grow as content grows; nothing about scrolling or editing changes.
