---
title: Integrations gallery — Cloudflare and Stripe now actually work
date: 2026-05-18
---

The Integrations gallery's two providers couldn't load — their full
OpenAPI specs (Cloudflare ~9.9 MB, Stripe ~7.8 MB) are far too large
for the app's network bridge, so every "Enable" ended in an error.

API Lab now ships **curated essentials** instead: a small, hand-picked
set of the most-used endpoints per provider, grouped into tidy
sub-folders. Enabling **Cloudflare** drops in zones, DNS, Workers and
R2 requests; enabling **Stripe** drops in customers, payments,
subscriptions and invoices — each with auth pre-scaffolded and ready
to send.

- Imported integration collections are marked with a small plug icon
  in the sidebar so they're easy to tell apart from your own.
- Disabling an integration now cleanly removes its collection.
