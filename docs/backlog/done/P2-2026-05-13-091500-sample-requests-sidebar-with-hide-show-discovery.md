# Sample Requests Sidebar with Hide / Show Discovery

Created: 2026-05-13 09:15:00 UTC
Priority: P2
GitHub Issue: [#26](https://github.com/olgunozoktas/api-lab/issues/26)

Tier rationale: high-leverage onboarding fix (turns first launch from
blank composer → "click any of 6 protocols to see it work"), but not
foundational and not a bug. P2 fits — P1 is reserved for foundations,
real bugs, and security gaps; this is product-shape work.

## Context

Today, a user landing on a fresh install of API Lab sees an empty
composer with placeholder text like `wss://echo.websocket.org` and
`sse://api.example.com/stream` — but they have to type the URL by hand
to actually test anything. There is no "click this to try WebSocket"
affordance. The first-launch experience is:

1. Open the app.
2. Stare at an empty composer.
3. Either type a URL from memory, paste one in, import a Postman
   collection, or close the app.

Compare Postman / Insomnia: both ship sample collections (HTTP, GraphQL,
sometimes WebSocket) so a brand-new user can hit Send within seconds.
We currently lose that delight.

What exists already:

- `frontend/src/lib/examples.ts` — UNRELATED feature: per-request
  saved-response examples (capture a response and replay it). Different
  domain; don't confuse the two. Renaming this file out of the way may
  be worth it for clarity, but the rename is out of scope for this slice.
- `frontend/src/store/collections.ts` — the collections store + tree
  rendering machinery the new Samples section will sit alongside.
- `frontend/src/components/Sidebar.tsx` — the place where the new
  "Samples" virtual section will render, above existing Collections.
- `frontend/src/lib/i18n/{en,tr}.ts` — already has 6 protocol-specific
  `urlPlaceholder` keys (HTTP, GraphQL, WS, SSE, gRPC, etc.).
- `frontend/src/components/SettingsModal.tsx` — already hosts a
  Shortcuts panel; will gain a Sample Requests panel.
- The `Plus` / `FilePlus` / lucide icon set is already imported in
  Sidebar; no new icon dep needed.

What's missing:

- A canonical, hardcoded **sample manifest** (`frontend/src/lib/samples.ts`).
- A **renderer** that surfaces the manifest as a virtual sidebar section
  above the user's own collections.
- **Hide / show controls** at both per-sample and section levels,
  persisted in IndexedDB via the existing store machinery.
- **Always-reach paths** so a user who hides every sample can still find
  them: command palette (⌘P) entries, Settings panel toggle, empty-state
  CTA when the sidebar is otherwise empty.

The user's framing — "make sure user can remove them from list but
always somehow reach and test" — is the load-bearing constraint:
removability without destroying discoverability. This is a deliberate
UX shape, not a nice-to-have.

Related items already in the backlog:

- `P1-2026-05-09-180400-mock-server-zig-sidecar.md` — the bundled Zig
  mock-server. Once it ships, sample URLs can fall back to localhost
  endpoints we control, eliminating "the sample is broken because the
  public service is down" failure mode. See follow-up #1 below.
- `P3-2026-05-09-173200-command-palette-vim-onboarding-tour.md` — the
  onboarding-tour item. Tour Step 1 ideally anchors on a sample click.
  See follow-up #2 below.

## Items

- [x] **Sample manifest** — define the canonical sample list as a pure
  data module at `frontend/src/lib/samples.ts`. Six minimum entries,
  one per supported protocol surface:
    1. `sample-http-get` — `GET https://httpbin.org/get` (echo headers
       + query string).
    2. `sample-http-post` — `POST https://postman-echo.com/post` with a
       JSON body that echoes back, demonstrating headers + body.
    3. `sample-graphql` — `https://countries.trevorblades.com/` with
       the canonical countries query (stable demo endpoint, no auth).
    4. `sample-ws-echo` — `wss://ws.postman-echo.com/raw` (Postman's
       maintained WebSocket echo; falls back to `wss://echo.websocket.org`
       if Postman's is down).
    5. `sample-sse-test` — `https://sse.dev/test` (well-known SSE test
       endpoint, sends a tick every second).
    6. `sample-grpc-reflection` — `grpcb.in:9000` with reflection
       enabled (lets the user explore the service tree without a `.proto`).
  - Each sample carries: stable `id` (used for hidden-state key),
    `kind` (`http` | `graphql` | `ws` | `sse` | `grpc`), `name` (i18n
    key like `samples.httpGet.name`), `description` (i18n key), `method`
    (HTTP only), `url`, `headers`, `body` (HTTP only), `gqlQuery`
    (GraphQL only). Pure constants — no `Date.now()`, no I/O.
  - Touchpoints: new file `frontend/src/lib/samples.ts`, new types in
    `frontend/src/lib/types.ts` (or co-located in samples.ts), new i18n
    keys in `frontend/src/lib/i18n/{en,tr}.ts` (~14 keys: name +
    description per sample, plus `samples.section.title`,
    `samples.empty.allHidden`).
  - Tests: `frontend/src/lib/__tests__/samples.test.ts` — every entry
    has a unique id; URLs parse (URL constructor for HTTP/GraphQL;
    starts-with prefix check for ws/sse/grpc); every i18n key exists
    in both `tr.ts` and `en.ts`.
  - Ship-it-fully: nothing user-visible yet — this is the data layer
    only. The next item renders it.

- [x] **Sidebar Samples section** — render the manifest as a virtual,
  read-only section above the existing Collections tree.
  - Touchpoints: `frontend/src/components/Sidebar.tsx` (add a `<Samples />`
    component before the existing `<CollectionList />`), new file
    `frontend/src/components/SamplesList.tsx`. The samples are visually
    muted (italic name, slightly-faded icon) to telegraph "not your
    data". Right-click → `Hide this sample` context menu item.
  - Click → calls a new `loadSampleIntoComposer(sampleId)` action that
    sets `current` to a fresh `RequestSnapshot` derived from the sample
    manifest. Does NOT write to `collectionItems` (samples never enter
    user's normal collections).
  - Touchpoints: `frontend/src/store/current.ts` (or wherever the
    `current` slice lives) for the new action; `Sidebar.tsx` for the
    section wiring.
  - Tests: `frontend/src/components/__tests__/SamplesList.test.tsx`
    (when present in the codebase — gated on P3 testing-library item;
    until then, cover via `lib/__tests__/samples.test.ts` data-shape
    asserts only).
  - Ship-it-fully: section appears, click a row → composer is loaded
    with the sample's URL/method/headers/body, ready to Send.

- [x] **Hide / show controls + persistence** — let users hide individual
  samples and the whole section, but keep state reversible.
  - Touchpoints: new store slice `frontend/src/store/samples.ts` with
    `hiddenSampleIds: Set<string>`, `samplesSectionHidden: boolean`,
    actions `hideSample(id)`, `showSample(id)`, `showAllSamples()`,
    `setSamplesSectionHidden(bool)`. Persist via the same IndexedDB
    persistence layer the other slices use (`store/index.ts` /
    `store/persist.ts`).
  - `SamplesList.tsx` filters out `hiddenSampleIds`. When all are
    hidden, the section renders an "All samples hidden — show in
    Settings → Sample Requests" muted footer instead of nothing,
    unless the user explicitly hid the whole section.
  - Tests: `frontend/src/store/__tests__/samples.test.ts` — hide ID,
    list shrinks; show ID, restores; showAll resets the Set;
    persistence round-trip via JSON serialization.
  - Ship-it-fully: right-click a sample row → "Hide" → row disappears.
    Settings → Sample Requests → toggle "Show samples section" off →
    section disappears. Both states survive an app restart.

- [x] **Always-reach paths** — three independent surfaces let users
  rediscover hidden samples.
  - **Command palette entries**: `frontend/src/components/QuickSwitcher.tsx`
    indexes the FULL sample manifest (not the filtered list) so
    `⌘ P` → typing "ws echo" still surfaces `sample-ws-echo` even when
    it's hidden in the sidebar. Selecting from the palette loads into
    the composer AND re-reveals the sample in the sidebar (un-hides it).
  - **Settings panel**: new `SampleRequestsPanel` rendered inside
    `SettingsModal.tsx` (next to Shortcuts), listing every sample with
    a per-id checkbox (Show / Hide) and a "Show all samples" button at
    the bottom. Also exposes the section-level toggle.
  - **Empty-state CTA**: when the user's collections tree is empty AND
    the sidebar has no recent history AND samples are hidden, show a
    muted "← Restore sample requests" link that opens
    Settings → Sample Requests (or calls `showAllSamples()` directly).
  - Touchpoints: `QuickSwitcher.tsx`, `SettingsModal.tsx` (new
    `SampleRequestsPanel`), `Sidebar.tsx` (empty-state branch), i18n
    keys for the new strings.
  - Tests: `lib/__tests__/samples.test.ts` — palette query "ws"
    matches `sample-ws-echo` regardless of hidden flag. Component-level
    coverage via the testing-library item when it lands.
  - Ship-it-fully: a user can hide every sample, close the app, reopen
    it, hit `⌘ P`, type "graphql", and still find the GraphQL sample.
    The act of selecting it un-hides it; the user sees it reappear in
    the sidebar.

## Acceptance

- A user landing on a fresh install sees a **Samples** section in the
  sidebar above their Collections tree, with at least one entry per
  supported protocol (HTTP, GraphQL, WebSocket, SSE, gRPC).
- Clicking any sample loads it into the composer (URL, method, headers,
  body, GraphQL query) such that hitting **Send** issues a real request
  against a working public test endpoint.
- A user can hide an individual sample (right-click → Hide) and the row
  disappears from the sidebar. The state persists across app restarts.
- A user can hide the entire Samples section via Settings → Sample
  Requests and the section disappears. The state persists across app
  restarts.
- A user who has hidden every sample (individually or via section
  toggle) can still **reach** every sample via:
  1. `⌘ P` command palette — typing a sample name finds it.
  2. Settings → Sample Requests panel — every sample is listed with a
     per-id Show toggle and a "Show all" button.
  3. Empty-state CTA in the sidebar when their own collections are
     empty.
- Samples never write to the user's `collectionItems` store. Loading a
  sample into the composer creates a transient `current` state, not a
  saved request.
- Sample URLs are documented as public test services in the i18n
  description so users understand "this is a public host; if it's slow
  or down, that's not API Lab".
- The new strings in `tr.ts` and `en.ts` typecheck (TypeScript fails the
  build if either locale is missing a key).
- 390+ existing Vitest tests still pass after the slice ships.

## Tradeoffs & risks

- **Public test endpoints go down sometimes.** echo.websocket.org has
  had outages; httpbin.org occasionally returns 502. Mitigation: pick
  the most-maintained options (postman-echo.com, sse.dev,
  countries.trevorblades.com), include a tooltip on each sample row
  noting it's a public service, and once the bundled Zig mock-server
  (`P1-2026-05-09-180400-mock-server-zig-sidecar.md`) lands, switch the
  defaults to localhost. Tracked as follow-up #1.
- **Starter content adds visual weight on first launch.** Mitigation:
  visually mute the rows (italic + faded), no first-run popup, no
  banner, no "did you try this?" nag. The section is a quiet, dismissible
  affordance — not a tutorial.
- **Two trees in the sidebar increase rendering complexity.** The
  Samples section and the Collections tree have different shapes
  (samples are flat; collections are a folder tree). Mitigation:
  `SamplesList.tsx` is intentionally not a `CollectionList` variant —
  it's a simpler component that reads from the manifest and the
  `hiddenSampleIds` set. Less code reuse, less coupling.
- **The user's framing implies hide-from-list, not delete-forever.**
  Mitigation: keep this slice strictly about hiding (boolean per-id
  state). Do NOT add a "delete sample" affordance — there's nothing
  to delete because samples are bundle constants. The Settings panel
  uses "Show / Hide" language, not "Restore / Delete".
- **Scope-reduction fallback** if 4 items prove too large: ship items
  1 + 2 (manifest + Sidebar section, default visible, no hide). That
  alone closes the "blank first-launch" gap; the discovery-preservation
  layer can land as a follow-up slice. Not the recommended path but
  available if velocity matters.
- **i18n debt grows.** ~14 new keys per locale. Acceptable; mirrors the
  cost of every other user-visible slice.

## How to work on this

Pick this up by reading `docs/backlog/P2-2026-05-13-091500-sample-requests-sidebar-with-hide-show-discovery.md`
end-to-end, then run `/backlog-ship docs/backlog/P2-2026-05-13-091500-sample-requests-sidebar-with-hide-show-discovery.md`.

Recommended order — ship in four small commits, one per Item:

1. **Item 1 (manifest)** is pure data + types. Create `frontend/src/lib/samples.ts`,
   add the i18n keys to both locales, add the data-shape Vitest. No UI
   touched yet. Run `dnpm run typecheck && dnpm run test` — both must
   stay green. Bump version + changelog entry. Ship.
2. **Item 2 (Sidebar section)** wires the manifest into the UI. Touches
   `Sidebar.tsx`, adds `SamplesList.tsx`, adds the
   `loadSampleIntoComposer` action. Visual check: app shows Samples
   section above Collections on first launch; click a row → composer
   loads. `dnpm run typecheck && dnpm run test && dnpm run build && ./build.sh`
   for the visual check.
3. **Item 3 (hide / show + persistence)** adds the store slice + the
   per-row Hide action + persistence. Test the IndexedDB round-trip
   manually via `./build.sh` → hide a sample → quit → relaunch → it's
   still hidden.
4. **Item 4 (always-reach paths)** wires QuickSwitcher + Settings panel
   + empty-state CTA. This is the most cross-cutting commit; expect to
   touch 3–4 components.

Build commands as a reminder (this is a Zig + React + Tailwind v4 app
on the zero-native shell — see top-level `CLAUDE.md` for the full
dnpm policy; never run host `npm`):

```bash
cd frontend && dnpm run typecheck    # tsc --noEmit
cd frontend && dnpm run test         # vitest, must keep 390+ green
cd frontend && dnpm run format:check # prettier (RO mount)
cd frontend && dnpm run build        # vite production build
./build.sh --no-run                  # full frontend + Zig build
./build.sh                           # build + launch the macOS app
```

Per the project's hard rules:

- Every new component must be reusable (props over store access in
  leaves; `SamplesList` accepts the manifest + hidden set as props,
  with a container wrapper that wires the store).
- Every user-facing string goes through `t()`.
- Every file stays under 400 lines.
- Every user-visible commit drops a `frontend/changelog/unreleased/*.md`
  entry AND bumps `frontend/package.json` version.
- Worktree-per-slice is the convention (`../api-lab-wt/<slug>/`),
  though direct-on-main is acceptable for small commits if dnpm setup
  in a fresh worktree is friction.

After all four items are checked, `/backlog-ship` archives this file
to `docs/backlog/done/`.
