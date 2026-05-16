# Binary-aware response examples

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-16-071035-binary-response-body-bridge.md`
(shipped 2026-05-16). The `Example` type (`frontend/src/lib/types.ts`)
stores a captured response as `body: string`. Now that responses can
be binary, "Save as example" on a binary response silently keeps only
the lossy-text `body` — the real bytes (`ResponseSnapshot.bodyBase64`)
are dropped.

This is latent data loss: a saved PNG / PDF / audio example can't be
previewed correctly when reopened, and the forthcoming local mock
server (Phase L.1) could never replay a binary example faithfully.
The bug is invisible today because nobody has saved a binary example
yet — the binary channel only just shipped.

## Items

- [ ] Extend `Example` with `bodyBase64?: string` (+ `bodyTooLarge?`)
  mirroring `ResponseSnapshot`.
- [ ] `exampleFromResponse` (`frontend/src/lib/examples.ts`) carries
  the binary fields through when present.
- [ ] The examples viewer renders a saved binary example through the
  same `ResponseBinaryBody` path as a live response.
- [ ] When the mock server replays an example, it serves the decoded
  bytes for a binary example.
- [ ] Tests — round-trip a binary example through save + reload.

## Acceptance

Saving a binary response (image / PDF / audio) as an example and
reopening it shows the same rich viewer as the live response, with
byte-identical content.

## Tradeoffs

- Base64 in persisted examples inflates IDB storage ~33% for binary
  examples — bounded by the 720 KB channel cap, acceptable.
- Collection import/export JSON grows when examples carry binary
  bodies; only binary examples pay it.

## How to work on this

1. Read `frontend/src/lib/types.ts` (`Example`, `ResponseSnapshot`),
   `frontend/src/lib/examples.ts` (`exampleFromResponse`), and the
   examples viewer in `frontend/src/components/`.
2. The decode/dispatch helpers already exist in `lib/binaryBody.ts`
   and `components/ResponseBinaryBody.tsx` — reuse them, don't clone.
