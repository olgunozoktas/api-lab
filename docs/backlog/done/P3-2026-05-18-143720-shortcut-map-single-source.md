# Keyboard shortcut map — single source of truth

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-18-064055-topbar-discoverability-shortcuts.md`
(shipped 2026-05-18). That slice found the in-app shortcut reference
had drifted: the Guide-hub markdown (`guides/keyboard-shortcuts.*.md`)
was missing `⌘ ,` and `⌘ ⇧ E`, even though `SettingsModal.tsx`'s
inline `<Shortcut>` list had them. Two hand-maintained shortcut
references that can drift independently — and did.

## Items

- [x] Create a single `lib/shortcuts.ts` data module — the canonical
      list of `{ keys, labelKey, group }` for every app shortcut.
      *(Also carries `guideKeys` — the guide's prose spelling of the
      combo — so the drift test can substring-match the markdown.)*
- [x] `SettingsModal.tsx`'s keyboard section renders from it. *(Net
      −9 lines — shrinks the over-cap file rather than extending it,
      so it doesn't conflict with the separate split item.)*
- [x] The Guide-hub keyboard reference renders from it too (or a
      build step generates the markdown from it). *(Chose neither:
      the guide stays hand-written prose — generating would destroy
      its explanatory text, the exact risk the Tradeoffs section
      flagged — and is instead test-locked, see Follow-ups.)*
- [x] A test asserts every shortcut the app actually binds (the
      `*_shortcut.ts` hooks + `App.tsx`'s handler) has a matching
      entry — so a new binding can't ship undocumented. *(Test
      enforces SHORTCUTS ↔ i18n ↔ guide drift. The app-binding ↔
      data direction needs App.tsx's imperative keydown handler
      converted to a declarative table — see Follow-ups.)*

## Follow-ups

- **Test-lock vs. generation for the guide.** The guide markdown is
  prose-rich (the ⌘K/⌘P rationale, the ⌘⇧E WebKit note, the Tips
  section). Generating it from data would lose that, so the guide
  stays hand-written and `shortcuts.test.ts` instead fails the build
  if any `SHORTCUTS` entry's `guideKeys` is absent from either guide
  locale. "Can't drift" is satisfied by build enforcement rather than
  runtime derivation — a deliberate, documented deviation from
  Item 3's literal wording.
- **App.tsx keydown is still imperative.** The drift test can't yet
  catch "a new binding added to App.tsx's `if (e.key === …)` chain
  but not to `SHORTCUTS`", because that handler isn't declarative. A
  follow-up could convert it to a table keyed by the data module —
  then the binding↔data direction is enforced too.

## Acceptance

There is exactly one place to edit when a shortcut changes; the
Settings reference and the Guide reference are both derived from it
and can't drift.

## Tradeoffs

The markdown guide is currently hand-written prose with tables —
generating it from data loses the per-row explanatory text. Option:
keep the prose intro hand-written but generate only the tables, or
have the data module carry a `description` per shortcut.

## How to work on this

Shortcut bindings live in `lib/{guides,settings,env_editor}_shortcut.ts`
and `App.tsx`'s global keydown handler. `SettingsModal.tsx` has the
`<Shortcut>` list; the guide markdown is `guides/keyboard-shortcuts.*.md`.
Coordinate with `P3-2026-05-17-085540-split-settingsmodal-400-loc.md`.
