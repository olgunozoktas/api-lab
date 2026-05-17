---
title: AWS SigV4 auth, mTLS client certs, and an outbound proxy
date: 2026-05-17
---

Three networking features for real-world API testing.

**AWS Signature v4** — a new auth type. Enter your access key, secret
key, region, and service, and API Lab signs every request the way
AWS expects (S3, API Gateway, any AWS service). Temporary STS
credentials are supported via the session-token field. Signing runs
locally — your secret key never leaves the app.

**mTLS** — another new auth type for mutual-TLS endpoints. Point at
your client certificate and key PEM files and curl presents them on
the handshake.

**Outbound proxy** — a Proxy URL field in Settings routes every
request through an HTTP, HTTPS, or SOCKS5 proxy. Useful behind a
corporate network or for inspecting traffic through Charles /
mitmproxy.

AWS SigV4 and mTLS run through the native request path.
