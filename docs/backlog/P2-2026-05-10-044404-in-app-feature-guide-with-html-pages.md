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

- [ ] Create `frontend/src/guides/` directory with one `.md` file per
      feature. Initial set (one paragraph + 1-3 screenshots each):
      collections, environments, history, examples, request
      cancellation, gRPC tab + reflection, WebSocket tab, SSE tab,
      TLS config, body modes (json/form-data/x-www-form/raw),
      auth modes (basic/bearer/api-key), keyboard shortcuts,
      Postman import.
- [ ] `frontend/src/lib/guides.ts` — glob-import via
      `import.meta.glob('../guides/*.md', { query: '?raw', import:
      'default', eager: true })`. Export `GUIDES: GuideEntry[]` with
      `{ slug, title, body, group }` parsed from frontmatter.
- [ ] Markdown rendering — reuse the same `marked` + `DOMPurify` chain
      from the changelog modal. Single shared `renderGuideMarkdown()`
      helper in `lib/markdown.ts` so the two features don't duplicate
      sanitization logic.
- [ ] Screenshots: place under `frontend/public/guides/<slug>/<n>.png`.
      Markdown references them as `![alt](/guides/<slug>/1.png)`.
      Screenshots taken via the app's existing build flow + macOS
      screenshot tool (`Cmd+Shift+4` over windows). Compress with
      `pngquant` or similar before committing.
- [ ] `frontend/src/components/GuideHub.tsx` — modal/route showing
      sidebar list of guides (grouped + searchable) + main pane
      rendering selected guide. Sidebar entries link via slug;
      keyboard nav (↑↓ to move, ⏎ to open).
- [ ] `frontend/src/components/GuideCard.tsx` — pure presenter for a
      rendered guide (title + body HTML + "next/prev guide" CTA).
- [ ] Hook up via `?` keyboard shortcut and a Help menu entry. Open
      directly to a specific guide if the user pressed `?` while a
      relevant feature was visible (e.g. press `?` in gRPC tab → opens
      gRPC guide). Mapping in `lib/guides_context.ts`.
- [ ] Empty-state hint inside each main panel: when a panel is in its
      empty state (no requests in collections, no env vars, no
      history, etc.), surface a "Learn how to use this →" link to the
      relevant guide.
- [ ] All strings via `t()` — `frontend/src/lib/i18n/tr.ts` + `en.ts`.
      Guide bodies themselves stay in English-only `.md` files for
      v1 (translation = 13× content; defer until v2). Frame the modal
      chrome (titles, search bar, nav buttons) in t().
- [ ] Tests: `lib/__tests__/guides.test.ts` (parse frontmatter, sort
      entries), `components/__tests__/GuideHub.test.tsx` (search
      filters + keyboard nav).
- [ ] **Slice 2 (optional, separate ship):** First-launch interactive
      tour. Reuses guides for content, but renders inline as
      spotlight overlays on real UI. Could be a P3 follow-up.

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
