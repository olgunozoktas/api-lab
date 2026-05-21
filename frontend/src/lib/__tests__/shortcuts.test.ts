/**
 * Olgun Özoktaş geliştirdi · API Lab
 * @vitest-environment node
 *
 * Forced node environment so `fileURLToPath(import.meta.url)` returns
 * a real filesystem path. Under jsdom the URL is rebased to
 * `http://localhost/...` and the path resolver strips the working-
 * directory prefix, breaking the readFileSync calls below.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SHORTCUTS, matchesShortcut } from "../shortcuts";
import { locales } from "../i18n";

// Read a guide markdown file straight off disk — the drift check
// compares the canonical shortcut data against the hand-written guide
// prose, so it must see the same bytes the bundle ships.
function guideMarkdown(lang: string): string {
  const url = new URL(`../../guides/keyboard-shortcuts.${lang}.md`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

// Read a frontend source file from disk for the binding-drift check.
// We don't actually IMPORT them at test time (App.tsx pulls in React +
// the full component tree); a text scan is enough to assert each id
// is referenced.
function readSrc(rel: string): string {
  const url = new URL(`../../${rel}`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

describe("SHORTCUTS map", () => {
  it("has no duplicate key combos", () => {
    const combos = SHORTCUTS.map((s) => s.keys.join("+"));
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("has no duplicate ids", () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every labelKey in every locale", () => {
    for (const [code, dict] of Object.entries(locales)) {
      for (const s of SHORTCUTS) {
        expect(dict[s.labelKey], `${code} dict missing ${s.labelKey}`).toBeTruthy();
      }
    }
  });

  // The bug this module kills: a shortcut added to the Settings list
  // but forgotten in the guide. With Settings now rendering from
  // SHORTCUTS, this test closes the loop on the guide side — a new
  // entry here fails the build until the markdown documents it.
  it.each(["en", "tr"])("the %s guide documents every shortcut", (lang) => {
    const md = guideMarkdown(lang);
    for (const s of SHORTCUTS) {
      expect(md.includes(s.guideKeys), `${lang} guide missing "${s.guideKeys}"`).toBe(true);
    }
  });

  // Bindings-drift guard: every shortcut's id must appear in App.tsx
  // (the table-driven dispatcher) OR in one of the three *_shortcut.ts
  // hooks. A new SHORTCUTS entry without a binding fails here; a new
  // binding that bypasses SHORTCUTS can't even type-check (App.tsx
  // keys the action map on `ShortcutId`, and the hooks reach for an
  // entry by id) — so drift is closed on both directions.
  it("every shortcut id is referenced by a binding source file", () => {
    const sources = [
      readSrc("App.tsx"),
      readSrc("lib/guides_shortcut.ts"),
      readSrc("lib/settings_shortcut.ts"),
      readSrc("lib/env_editor_shortcut.ts"),
    ].join("\n");
    for (const s of SHORTCUTS) {
      // The id may appear quoted (kebab-case keys MUST be quoted) or
      // as a bare identifier followed by `:` (prettier strips
      // unnecessary quotes off identifier-safe shorthand keys like
      // `send:`). Both forms are valid object-key syntax — accept
      // either so prettier passes don't break the drift guard.
      const escaped = s.id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(`["']${escaped}["']|(?:^|[\\s,{])${escaped}\\s*:`, "m");
      expect(pattern.test(sources), `no binding source references id="${s.id}"`).toBe(true);
    }
  });
});

describe("matchesShortcut", () => {
  // Mocks just enough of KeyboardEvent for the matcher — JSDOM's
  // KeyboardEvent constructor refuses some fields, so a plain object
  // shape suffices for a pure logic test.
  const ev = (init: Partial<KeyboardEvent>): KeyboardEvent => ({ ...init }) as KeyboardEvent;

  it("matches ⌘+Enter for send", () => {
    const send = SHORTCUTS.find((s) => s.id === "send")!;
    expect(matchesShortcut(send.match, ev({ key: "Enter", metaKey: true }))).toBe(true);
    expect(matchesShortcut(send.match, ev({ key: "Enter" }))).toBe(false);
  });

  it("matches ⌘+S for save case-insensitively", () => {
    const save = SHORTCUTS.find((s) => s.id === "save")!;
    expect(matchesShortcut(save.match, ev({ key: "s", metaKey: true }))).toBe(true);
    expect(matchesShortcut(save.match, ev({ key: "S", metaKey: true, shiftKey: true }))).toBe(true);
  });

  it("matches ⌘+P AND ⌘+K via keyAlt for switcher", () => {
    const sw = SHORTCUTS.find((s) => s.id === "switcher")!;
    expect(matchesShortcut(sw.match, ev({ key: "p", metaKey: true }))).toBe(true);
    expect(matchesShortcut(sw.match, ev({ key: "k", metaKey: true }))).toBe(true);
    expect(matchesShortcut(sw.match, ev({ key: "x", metaKey: true }))).toBe(false);
  });

  it("matches ⌘+1..9 for tab-jump via key-range", () => {
    const jump = SHORTCUTS.find((s) => s.id === "tab-jump")!;
    for (const k of "123456789") {
      expect(matchesShortcut(jump.match, ev({ key: k, metaKey: true }))).toBe(true);
    }
    expect(matchesShortcut(jump.match, ev({ key: "0", metaKey: true }))).toBe(false);
  });

  it("matches ⌥⌘ + arrow for tab-cycle", () => {
    const cycle = SHORTCUTS.find((s) => s.id === "tab-cycle")!;
    expect(
      matchesShortcut(cycle.match, ev({ key: "ArrowRight", metaKey: true, altKey: true }))
    ).toBe(true);
    expect(
      matchesShortcut(cycle.match, ev({ key: "ArrowLeft", metaKey: true, altKey: true }))
    ).toBe(true);
    expect(matchesShortcut(cycle.match, ev({ key: "ArrowRight", metaKey: true }))).toBe(false);
  });
});
