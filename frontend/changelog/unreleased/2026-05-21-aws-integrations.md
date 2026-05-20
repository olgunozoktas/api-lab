---
title: Integrations gallery — AWS S3 + AWS Lambda
date: 2026-05-21
---

Two new entries land in the **Integrations gallery**, both signed
with SigV4 out of the box:

- **AWS S3** — list buckets, list objects (v2), get bucket location,
  head / get / put / delete / copy object. Path-style endpoint
  (`s3.{region}.amazonaws.com`) with `{bucket}` / `{key}`
  placeholders. The Put-object request opens with the Binary body
  picker as the suggested mode so curl streams the file off disk
  via `--data-binary @<path>`.
- **AWS Lambda** — list functions, get function, synchronous +
  async invoke, list aliases, list versions.

Both pre-fill the SigV4 service field (`s3` / `lambda`) so you only
have to type your AWS access + secret keys once after enabling.
Region defaults to `us-east-1`; change it in the Auth panel +
edit the URL host for other regions (a per-request region picker
is a queued follow-up).

A new optional `authHints` field on `IntegrationDef` carries the
service hint through — backwards-compatible for every existing
integration.
