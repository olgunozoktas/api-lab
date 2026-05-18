---
title: Integration requests arrive with ready-to-edit bodies
date: 2026-05-19
---

Enabling the **Cloudflare** or **Stripe** integration used to drop in
requests with empty bodies — "Create customer", "Create DNS record"
and friends left you to build the payload from the provider's docs.

Now every write endpoint imports with a **body skeleton** already
filled in: the common 3-5 fields, in the right format — JSON for
Cloudflare, form-encoded for Stripe. Just edit the values and send.

Every curated request also carries a **one-line description** now,
shown when you hover its row in the sidebar.
