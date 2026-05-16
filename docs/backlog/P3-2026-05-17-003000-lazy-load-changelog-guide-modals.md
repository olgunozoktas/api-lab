# Lazy-load the Changelog + Guide modals off the first-paint chunk

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-16-074500-main-bundle-budget-audit.md`
(shipped 2026-05-17). That slice fixed the bundle guardrail to budget
the first-paint payload and lazy-split `ResponseBinaryBody`. The
lazy-split audit (item 3) named the next worthwhile candidate but left
it out of scope: the **Changelog modal** and **Guide hub**.

Both are modals — opened rarely, on demand — yet they ride in the
first-paint entry chunk today. Worse, `lib/changelog.ts` and
`lib/guides.ts` glob-import *every* markdown file under
`frontend/changelog/{released,unreleased}/` and `frontend/src/guides/`
at build time, so all that prose content is parsed into the entry
chunk even though a user may never open either modal. As the
changelog and guide catalogues grow, that weight grows with them —
straight onto first paint.

## Items

- [ ] Lazy-load `<ChangelogModal>` from its mount (TopBar / modal
  host) via `lazy()` + `Suspense`, mirroring the `ResponseBinaryBody`
  and `PdfViewer` pattern.
- [ ] Lazy-load `<GuideHub>` the same way.
- [ ] Ensure the glob-imported markdown (`lib/changelog.ts`,
  `lib/guides.ts`) lands in the lazy chunk(s), not the entry chunk —
  the dynamic-import boundary must sit above those modules so Rolldown
  splits them out. Verify with `scripts/check-bundle-size.sh`.
- [ ] Keep the changelog auto-open-on-first-launch behaviour working —
  the version-gate check (`useChangelogAutoOpen`) is cheap and can
  stay eager; only the modal's render path is deferred.

## Acceptance

The first-paint JS gz drops by the weight of the two modals + their
markdown content, `scripts/check-bundle-size.sh` shows the new
headroom, and both modals still open correctly (including the
changelog's first-launch auto-open).

## Tradeoffs

- A modal opened for the first time pays a chunk fetch — imperceptible
  from the local `zero://app` origin.
- The changelog auto-open must not be regressed: the *gate* stays
  eager, only the modal body is lazy. Get the import boundary right.

## How to work on this

Find where `<ChangelogModal>` and `<GuideHub>` mount, wrap each in
`lazy()` + `Suspense` (pattern: `ResponseBody.tsx`'s lazy
`ResponseBinaryBody`). The subtlety is the glob-import: `lib/changelog.ts`
/ `lib/guides.ts` must be imported only from inside the lazy modal
component (or a module it pulls in), never from an eagerly-loaded
path, or Rolldown keeps the markdown in the entry chunk. Confirm the
split with `dnpm run build` + `bash scripts/check-bundle-size.sh`.
