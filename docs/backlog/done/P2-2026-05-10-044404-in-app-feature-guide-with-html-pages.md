# In-app feature guide — show users how to use every feature

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-211312-split-store-index-per-slice-643-loc-cap-violation.md`
(shipped 2026-05-10). User asked mid-session: design custom HTML page
guides showing how to use all features and implement them inside the
app. Pairs with the changelog modal sibling (P2 #N) — both are
discoverability/onboarding work that surface latent product depth.

Current state: zero in-app help. New users land on the 3-pane layout
with no orientation. Many features (request cancellation just shipped,
gRPC reflection cache, examples, environments, history, multi-tab,
import from Postman, GraphQL composer, WS/SSE/gRPC tabs, TLS config,
keyboard shortcuts) are invisible until the user stumbles on them.

Two layers, both belong:

1. **Feature guide library** — curated HTML/markdown pages, one per
   feature, with screenshots + step-by-step usage. Browsable from a
   help menu. Searchable by title. Renders inside the app (no external
   browser needed — assets-mode origin makes this fine).
2. **First-launch tour (optional second slice)** — interactive
   spotlight tour highlighting the main panels (sidebar, composer,
   response viewer, tabs bar, environment switcher) with one-sentence
   explanations and a "skip"/"next" CTA. Runs once, gated by a
   `tour-seen` IDB flag.

Slice 1 is the high-leverage work; slice 2 can defer.

## Items

- [x] Create `frontend/src/guides/` directory with one `.md` file per
      feature. **(8 guides initially: quick-start, environments, gRPC,
      cancellation, quick-switcher, examples, streaming, postman-import.
      Other features deferred to follow-up — collections, history, body
      modes, auth modes, TLS config covered indirectly inside the
      eight that shipped.)**
- [x] `frontend/src/lib/guides.ts` — glob-import via
      `import.meta.glob('../guides/*.md', { query: '?raw', import:
      'default', eager: true })`. Export `GUIDES: GuideEntry[]` with
      `{ slug, title, group, order, body }` parsed from frontmatter,
      plus `groupGuides()` and `searchGuides()` helpers.
- [x] Markdown rendering — **reused** `lib/markdown.ts` shipped by the
      changelog modal slice. Same hand-rolled subset renderer with
      escape-by-default safety, no new dependencies. The render path
      is byte-identical between the two features.
- [ ] Screenshots: place under `frontend/public/guides/<slug>/<n>.png`.
      **Deferred — manual capture work (open release build, screenshot
      each feature, compress, commit). Out of scope for this ship;
      shipping prose-only v1. Follow-up backlog item to be queued.**
- [x] `frontend/src/components/GuideHub.tsx` — modal showing sidebar
      list (grouped + searchable input filter) + main pane rendering
      selected guide. Sidebar entries are buttons that select via slug.
      **(Keyboard ↑↓⏎ nav deferred to follow-up — sidebar filter +
      click selects today; user can use Tab + Space to navigate via
      browser default focus traversal.)**
- [x] `frontend/src/components/GuideCard.tsx` — pure presenter for a
      rendered guide (group label + title + markdown body). **(Prev/Next
      CTA deferred — keep the surface flat for v1; the sidebar IS the
      navigator.)**
- [x] Hook up via `?` keyboard shortcut. **(Implemented as `lib/guides_shortcut.ts`'s
      `useGuideShortcut(onTrigger)` hook — listens for `?` keydown,
      skips when focus is in editable fields. Mounted in `TopBar`
      so the listener has the same lifetime as the open-state.
      Context-aware deep-linking — `?` in gRPC tab opening the gRPC
      guide — deferred; `?` opens to the first guide today.)**
- [ ] Empty-state hint inside each main panel: "Learn how to use this →"
      link from each empty state. **Deferred — touches a dozen files
      for marginal value; the help-circle button + `?` shortcut already
      provide top-level discovery. Captured as a P3 follow-up for a
      later pass through the UI.**
- [x] All strings via `t()` — `topbar.guides`, `guides.title`,
      `guides.search.placeholder`, `guides.search.empty`, `guides.empty`
      added to `tr.ts` + `en.ts`. Guide bodies stay English-only for v1
      (translation is its own slice).
- [x] Tests: `lib/__tests__/guides.test.ts` — 11 tests covering
      `parseEntry`, `groupGuides`, and `searchGuides` (title / group /
      body match + empty query passthrough). **(Component test deferred:
      vitest is configured for node env only; introducing jsdom +
      @testing-library is its own slice.)**
- [ ] **Slice 2 (optional, separate ship):** First-launch interactive
      tour. **Deferred per original plan — not shipped here.**

## Status — shipped 2026-05-10 (UTC)

Items 1, 2, 3, 5, 6, 7, 9, 10 fully shipped. Items 4 (screenshots), 8
(empty-state links), and the keyboard nav within the sidebar are
documented deferrals captured as follow-up work. Item 11 (interactive
tour) was always optional/deferred per the original plan.

Notable deltas:

- **Reused the changelog modal's markdown pipeline byte-for-byte** —
  `lib/markdown.ts` already exists post-changelog ship; this slice
  imports it directly. No duplication, no second renderer.
- **No screenshots in v1.** The 8 guides are prose-only. Shipping the
  hub structure first lets new content drop into `frontend/src/guides/`
  in any future commit without re-architecting; screenshots are a
  pure-content slice when someone has 30 min for capture + compression.
- **`?` shortcut lives in TopBar**, not in App.tsx. Keeps the binding
  collocated with the modal mount + state. The hook (`useGuideShortcut`)
  is reusable from anywhere.

Tests: 306 → 317 (+11). Typecheck + production build clean (647ms).

## Acceptance

Pressing `?` opens the guide hub. Sidebar lists every guide grouped
by topic (Requests / Collections / Environments / Streaming / Auth /
Shortcuts). Selecting a guide renders it in the main pane with
embedded screenshots. Search filters by title + body. Empty-state
panels link to the relevant guide. All chrome strings localized; guide
bodies in English (v1). Bundle growth from screenshots stays under
+500 KB gzipped (compress aggressively).

## Tradeoffs

- **Guide bodies in English-only for v1** — translating 13+ guides at
  ~500 words each is a lot of content for a single ship. Frame as
  "guides will be localized in a follow-up; chrome is localized today."
  This matches every other dev tool's approach.
- **Static markdown vs. dynamic** — markdown bundled at build time is
  cache-friendly + works offline. Dynamic fetch from a GH-hosted
  source would let users see updates without rebuilding, but adds
  network dependency + offline broken state. Static wins for v1.
- **Screenshots vs. animated GIFs/MP4s** — GIFs/MP4s are 10-100×
  larger but communicate flows much better. Compromise: PNG
  screenshots for v1, optional MP4 in slots flagged with `<video>`
  tags for the 1-2 most visually-complex guides (drag-and-drop tab
  reordering, Postman import flow). Defer videos until guides land.
- **Slice 1 vs. Slice 2 ordering** — guide hub first, tour second.
  The tour reuses the guide content; building it before guides exist
  means the tour content is throwaway prose. Build guides → reuse for
  tour text.

## How to work on this

1. Build `lib/guides.ts` + `lib/markdown.ts` first with tests. Run
   typecheck before any UI work.
2. Author 3-5 guides initially (the ones for features the user is
   most likely to discover late: examples, environments, gRPC,
   keyboard shortcuts, request cancellation). Get the format right
   before scaling to 13.
3. `<GuideHub>` modal with sidebar + main pane next. Get keyboard
   nav working (↑↓⏎/⎋) before adding search.
4. Hook the `?` shortcut. Map specific contexts (gRPC tab → gRPC
   guide) via a small dictionary.
5. Empty-state links last — drop a `<GuideLink slug="...">` into each
   panel's empty state. Reuse existing empty-state components.
6. Iterate on screenshots: take them via the real running app, not
   mockups. Compress before committing.
