# Phase L — Polish, marketing, launch

Created: 2026-05-09 07:35:00
Refined: 2026-05-16 08:30:00
Priority: **P3** (Launch hygiene + project-presentation polish — no feature impact and individually low-urgency, but collectively what turns "a tool I built" into "a tool people adopt".)
GitHub Issue: [#13](https://github.com/olgunozoktas/api-lab/issues/13)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:35:00.

The app is feature-rich; its public presentation is not. This phase
is the grab-bag of project-presentation and launch work for the
public repo (https://github.com/olgunozoktas/api-lab). The launch
items (Show HN etc.) are gated on Phase H distribution — there is no
point driving traffic before there is an installer to download.

## Items

- **README visual polish.** A 30–60 s demo GIF (Charm `vhs` or
  asciinema-to-gif) of a typical flow; replace `docs/screenshot.png`
  with a feature-rich screenshot (collection loaded, real response,
  dark mode); add badges (build status, latest release, license,
  stars, brew downloads).
- **Contributor docs.** `ARCHITECTURE.md` with a Mermaid diagram (Zig
  shell ⇆ bridge ⇆ React frontend); `CONTRIBUTING.md` (clone + build,
  how to add a handler / component / translation);
  `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- **GitHub repo furniture.** `.github/ISSUE_TEMPLATE/{bug,feature,question}.yml`
  and `.github/PULL_REQUEST_TEMPLATE.md`.
- **Top-level `CHANGELOG.md`.** Keep-a-Changelog format, tagged
  releases following it. Note: an in-app changelog already exists
  under `frontend/changelog/` — decide whether the top-level file is
  generated from those entries at release-cut or maintained
  separately, and avoid two diverging sources of truth.
- **Launch.** Submit to Show HN, Lobsters, /r/programming — only once
  Phase H (distribution) has shipped an installer.
- **Optional: documentation site** at `api-lab.olgun.dev` (Astro
  Starlight).

## Acceptance

The repo's front page sells the project (GIF, screenshot, badges),
new contributors have a clear on-ramp (ARCHITECTURE / CONTRIBUTING),
and the launch posts go out only after an installer exists.

## Tradeoffs & risks

- The top-level `CHANGELOG.md` risks diverging from the in-app
  `frontend/changelog/` entries — pick one source of truth.
- Launch timing is a hard dependency on Phase H; jumping early sends
  traffic to a repo with no installer.
- Each sub-item is small; the value is cumulative — easy to leave
  half-done. Ship them as small independent slices.

## How to work on this

These are mostly independent and can ship as separate small commits;
no strict ordering except that launch waits for Phase H. Start with
the README visual polish (highest visible payoff per effort). Cross-
check `ARCHITECTURE.md` against the real bridge model in
`~/Herd/zero-native/src/bridge/root.zig`. For `CHANGELOG.md`, prefer
generating it from `frontend/changelog/released/*` at release-cut
over hand-maintaining a parallel file.
