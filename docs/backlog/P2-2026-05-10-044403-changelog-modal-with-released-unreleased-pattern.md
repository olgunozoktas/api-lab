# Changelog modal — released/unreleased pattern, first-launch + on-demand

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-211312-split-store-index-per-slice-643-loc-cap-violation.md`
(shipped 2026-05-10). User asked mid-session: when the app opens, if there's
a changelog the user hasn't seen, show it; afterward, the user should be
able to access the changelog from a help/menu surface anytime. Pattern is
the one shipped in `~/Herd/rust-terminal`:

- `changelog/` directory at repo root with `released/` + `unreleased/`
  subdirs. Markdown files, one per release (`v0.4.0.md`) or one per
  slice in `unreleased/`.
- Build-time glob-import via Vite's `import.meta.glob` into
  `frontend/src/lib/changelog.ts` exporting `CHANGELOG_ENTRIES` +
  `APP_VERSION`.
- `ChangelogModal.tsx` reads entries newest-first as a timeline, one
  card per release/slice.
- `markSeen()` persists last-seen version (IDB or localStorage). On
  launch, if `APP_VERSION > lastSeenVersion`, modal opens automatically.
- Help menu / settings panel exposes a "Changelog" link that opens the
  same modal anytime. Manual open does not affect `lastSeenVersion`.

This project currently has no `CHANGELOG.md` convention — the canonical
permanent record lives in `Status` sections of archived backlog files
under `docs/backlog/done/`. The new `changelog/` directory will be the
source of truth for user-visible changes; backlog files stay the source
for engineering-internal record.

`APP_VERSION` source: there's no `VERSION` file in this project today
(verified: `ls VERSION` is missing). Either add a `VERSION` file
(rust-terminal pattern) or read the version from `app.zon`'s
`version: "0.x.y"` field at build time and inject via Vite's `define`.

## Items

- [ ] Create `changelog/` at repo root with `released/` + `unreleased/`
      subdirs and a `README.md` documenting the convention. Add to
      `.gitignore` exceptions (the dir IS tracked, unlike
      `docs/sessions/`).
- [ ] Add a project `VERSION` file (or extract from `app.zon`) and a
      `frontend/vite.config.ts` `define` that injects `__APP_VERSION__`
      at build time.
- [ ] Build `frontend/src/lib/changelog.ts` — glob `changelog/released/*.md`
      and `changelog/unreleased/*.md` via `import.meta.glob('...', {
      query: '?raw', import: 'default', eager: true })`. Export
      `CHANGELOG_ENTRIES` (sorted newest-first by version + frontmatter
      date) and `APP_VERSION`.
- [ ] Build `frontend/src/lib/changelog_seen.ts` — IDB-backed
      `getLastSeen() / markSeen(version)`. Reuses existing `idbStorage`
      adapter pattern. Defaults to `"0.0.0"` for first-time users so
      everything is "new" on first launch.
- [ ] `frontend/src/components/ChangelogModal.tsx` — vertical timeline,
      one `<ChangelogEntryCard>` per entry. Markdown rendering via
      `marked` (already not in deps; add via `dnpm install marked`) or
      `markdown-it`. Sanitize via `DOMPurify` before injecting. Cache
      rendered HTML keyed by `entry.sourcePath`.
- [ ] `frontend/src/components/ChangelogEntryCard.tsx` — presenter
      (pure props), accepts `entry`, `expanded` toggle, and renders
      title + date + body. Follows project's "every component is a
      candidate library export" hard rule.
- [ ] Wire auto-open on launch: in `App.tsx` (or a dedicated
      `<ChangelogGate>`), `useEffect(() => { ... })` reads
      `getLastSeen()`, compares with `APP_VERSION`, opens modal +
      calls `markSeen(APP_VERSION)` after dismissal.
- [ ] Add a "Changelog" menu entry — extend the existing settings/help
      surface (probably a header dropdown). On-demand open does NOT
      call `markSeen` (manual review is non-destructive).
- [ ] All strings via `t()` — extend `frontend/src/lib/i18n/tr.ts` and
      `en.ts` with the new keys.
- [ ] Tests: `lib/__tests__/changelog.test.ts` (entry sort + version
      compare), `lib/__tests__/changelog_seen.test.ts` (IDB roundtrip),
      `components/__tests__/ChangelogEntryCard.test.tsx` (renders
      markdown body, sanitization).
- [ ] Update `CLAUDE.md` with a new hard rule: every user-visible
      change MUST drop a markdown file under `changelog/unreleased/`
      in the same commit as the change. Move from `unreleased/` to
      `released/v<version>.md` at release-cut time.

## Acceptance

`./build.sh --release` produces a binary that, on first launch with no
prior `lastSeen`, opens the changelog modal automatically with all
released + unreleased entries. Dismissing the modal stores the current
`APP_VERSION` so subsequent launches don't reopen it. The Help/Settings
menu has a "Changelog" entry that opens the same modal anytime; manual
opens don't touch `lastSeen`. New entries land by adding a markdown
file to `changelog/unreleased/` — no other code changes required for
the entry to appear after rebuild.

## Tradeoffs

- **Markdown rendering library** — `marked` is small (~30KB gzipped)
  and battle-tested; `markdown-it` is more extensible but heavier
  (~80KB). Either works; pick `marked` for bundle weight unless we
  need plugin support. Either way, sanitize with `DOMPurify` to
  prevent XSS (markdown can embed raw HTML).
- **APP_VERSION source** — adding a `VERSION` file adds a manual bump
  step. Reading from `app.zon` keeps a single source of truth but
  requires the Zig build to expose it to the frontend (write to
  `frontend/.version` during build, read via Vite plugin). Pick
  rust-terminal's pattern (`VERSION` file at root, manual bump) for
  simplicity — bumps are infrequent and the explicit step matches
  `./build.sh --release` cadence.
- **Migration from existing convention** — backlog `Status` sections
  stay as engineering-internal record. `changelog/unreleased/` slices
  are user-visible bullets distilled from those Status sections (not a
  literal copy). One ship can produce 0 or 1 entry; small refactors
  with no UX impact get no entry.
- **Build-time vs. runtime fetch** — glob-import bundles all entries
  into the JS chunk, growing the bundle linearly with entry count.
  rust-terminal accepted this (and so should we — entries are small).
  Alternative: serve from `zero://app/changelog/` via the assets
  handler, fetch at runtime. Defer until the bundle proves bloated.

## How to work on this

1. Bootstrap the directory layout + VERSION file first, in a single
   commit. Add the CLAUDE.md rule alongside.
2. Build `lib/changelog.ts` + `changelog_seen.ts` with tests before
   any UI. Test the version-compare logic (`isNewer("0.2.0", "0.1.9")`)
   exhaustively — semver-ish but project-defined.
3. Build the modal as a presenter + container split, like the project's
   other modals. Mount `<ChangelogGate>` at the App.tsx top-level so
   the auto-open logic doesn't pollute leaf components.
4. Backfill: write `changelog/released/v0.1.0.md` (or whatever the
   current version is) with a one-paragraph summary of what's shipped
   today. From here forward every ship adds an `unreleased/<slug>.md`.
5. Verify by running `./build.sh --release`, killing the binary,
   wiping `~/Library/Caches/API Lab/`, relaunching. Modal should
   auto-open on first launch.
