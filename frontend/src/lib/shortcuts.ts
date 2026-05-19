/** Olgun Özoktaş geliştirdi · API Lab */
// Canonical keyboard-shortcut map — the single source the Settings
// modal's keyboard reference renders from, and that the in-app guide
// (guides/keyboard-shortcuts.*.md) is drift-checked against by
// shortcuts.test.ts. Add a shortcut here and the Settings list picks
// it up for free; the guide drift test then fails until the markdown
// lists it too — so the Settings and guide references provably can't
// diverge. That divergence is the exact bug this module exists to
// kill: the guide once silently dropped ⌘ , and ⌘ ⇧ E that the
// Settings list still showed.
import type { TKey } from "./i18n";

export type ShortcutGroup = "request" | "tabs" | "navigation";

export type Shortcut = {
  // Key tokens, one <kbd> chip each, in press order — Settings render.
  keys: string[];
  // The same combo as it reads in the guide's prose tables, e.g.
  // "⌘ Enter". A separate field because the guide spells keys out
  // (Enter, 1..9) where Settings uses compact glyphs (↵, 1‒9); the
  // drift test substring-matches this string against the guide
  // markdown, so it must mirror the guide's spelling, not the chips.
  guideKeys: string;
  // i18n key for the action label — defined in every locale's Dict.
  labelKey: TKey;
  group: ShortcutGroup;
};

// Order is the Settings list's render order — kept stable so the
// keyboard section looks unchanged after this became data-driven.
export const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "↵"], guideKeys: "⌘ Enter", labelKey: "settings.shortcuts.send", group: "request" },
  { keys: ["⌘", "S"], guideKeys: "⌘ S", labelKey: "settings.shortcuts.save", group: "request" },
  { keys: ["⌘", "N"], guideKeys: "⌘ N", labelKey: "settings.shortcuts.new", group: "request" },
  { keys: ["⌘", "T"], guideKeys: "⌘ T", labelKey: "settings.shortcuts.tabNew", group: "tabs" },
  { keys: ["⌘", "W"], guideKeys: "⌘ W", labelKey: "settings.shortcuts.tabClose", group: "tabs" },
  {
    keys: ["⌘", "⇧", "T"],
    guideKeys: "⌘ ⇧ T",
    labelKey: "settings.shortcuts.tabReopen",
    group: "tabs",
  },
  {
    keys: ["⌘", "1‒9"],
    guideKeys: "⌘ 1..9",
    labelKey: "settings.shortcuts.tabJump",
    group: "tabs",
  },
  {
    keys: ["⌥", "⌘", "→/←"],
    guideKeys: "⌥ ⌘ →",
    labelKey: "settings.shortcuts.tabCycle",
    group: "tabs",
  },
  {
    keys: ["⌘", "K / P"],
    guideKeys: "⌘ K / ⌘ P",
    labelKey: "settings.shortcuts.switcher",
    group: "navigation",
  },
  {
    keys: ["⌘", "L"],
    guideKeys: "⌘ L",
    labelKey: "settings.shortcuts.focusUrl",
    group: "navigation",
  },
  {
    keys: ["⌘", "B"],
    guideKeys: "⌘ B",
    labelKey: "settings.shortcuts.toggleSidebar",
    group: "navigation",
  },
  { keys: ["⌘", "."], guideKeys: "⌘ .", labelKey: "settings.shortcuts.cancel", group: "request" },
  {
    keys: ["⌘", ","],
    guideKeys: "⌘ ,",
    labelKey: "settings.shortcuts.openSettings",
    group: "navigation",
  },
  {
    keys: ["⌘", "⇧", "E"],
    guideKeys: "⌘ ⇧ E",
    labelKey: "settings.shortcuts.openEnv",
    group: "navigation",
  },
  { keys: ["?"], guideKeys: "?", labelKey: "settings.shortcuts.openGuides", group: "navigation" },
];
