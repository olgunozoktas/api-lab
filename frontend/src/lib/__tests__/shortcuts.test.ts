/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SHORTCUTS } from "../shortcuts";
import { locales } from "../i18n";

// Read a guide markdown file straight off disk — the drift check
// compares the canonical shortcut data against the hand-written guide
// prose, so it must see the same bytes the bundle ships.
function guideMarkdown(lang: string): string {
  const url = new URL(`../../guides/keyboard-shortcuts.${lang}.md`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

describe("SHORTCUTS map", () => {
  it("has no duplicate key combos", () => {
    const combos = SHORTCUTS.map((s) => s.keys.join("+"));
    expect(new Set(combos).size).toBe(combos.length);
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
});
