/** Olgun Özoktaş geliştirdi · API Lab */
// Canonical keyboard-shortcut map — the single source the Settings
// modal's keyboard reference renders from, the in-app guide
// (guides/keyboard-shortcuts.*.md) is drift-checked against by
// shortcuts.test.ts, AND App.tsx + the *_shortcut.ts hooks dispatch
// off. Add a shortcut here and:
//   - Settings list picks it up for free
//   - the guide drift test fails until the markdown lists it
//   - the binding drift test fails until App.tsx or a hook references
//     its `id`
// so the data module is provably the single source of truth on every
// axis — display, documentation, AND key bindings.
import type { TKey } from "./i18n";

export type ShortcutGroup = "request" | "tabs" | "navigation";

// Declarative descriptor for "did this KeyboardEvent fire this combo?"
// — handles the simple `cmd + letter` shape that covers most entries
// AND the bespoke "key is in a range" / "second key alt" / "alt + arrow"
// shapes the App.tsx handler needs. Encoded as a tagged shape so the
// matcher stays exhaustive and the type system catches new variants.
export type ShortcutMatch =
  | {
      // Single key + optional modifiers. `key` is matched case-
      // insensitively against `e.key` (so "S" entries fire for both
      // shift-S and lowercase s — letter shortcuts on macOS arrive
      // either way depending on caps-lock and shift state).
      kind: "key";
      key: string;
      // Optional second key that triggers the same action — used for
      // ⌘P ≡ ⌘K (quick switcher), where two muscle-memory conventions
      // collide.
      keyAlt?: string;
      meta?: boolean;
      shift?: boolean;
      alt?: boolean;
      ctrl?: boolean;
      // When true the matcher accepts the modifier regardless of value —
      // used for ⌘+Shift+T (reopen) which falls through to ⌘+T (new
      // tab) when the reopen stack is empty, so the App handler binds
      // both via the same case.
      shiftAny?: boolean;
    }
  | {
      // Numeric key in a range — used for ⌘1..9 tab-jump.
      kind: "key-range";
      from: string;
      to: string;
      meta?: boolean;
    }
  | {
      // Arrow keys with a modifier — used for ⌥⌘→/← tab-cycle.
      kind: "arrow";
      meta?: boolean;
      alt?: boolean;
    };

export type Shortcut = {
  // Stable kebab-case id. The drift test asserts every id is bound by
  // App.tsx or one of the *_shortcut.ts hooks; the entry's existence
  // is the source of truth.
  id: string;
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
  // Declarative match descriptor. Required — the binding-drift test
  // greps for every id, so omitting `match` here would silently let
  // a shortcut ship with no actual binding. (Tab-jump / tab-cycle
  // use the bespoke `key-range` / `arrow` shapes; everything else
  // is plain `kind: "key"`.)
  match: ShortcutMatch;
};

// Order is the Settings list's render order — kept stable so the
// keyboard section looks unchanged after this became data-driven.
export const SHORTCUTS: readonly Shortcut[] = [
  {
    id: "send",
    keys: ["⌘", "↵"],
    guideKeys: "⌘ Enter",
    labelKey: "settings.shortcuts.send",
    group: "request",
    match: { kind: "key", key: "Enter", meta: true },
  },
  {
    id: "save",
    keys: ["⌘", "S"],
    guideKeys: "⌘ S",
    labelKey: "settings.shortcuts.save",
    group: "request",
    match: { kind: "key", key: "s", meta: true },
  },
  {
    id: "new",
    keys: ["⌘", "N"],
    guideKeys: "⌘ N",
    labelKey: "settings.shortcuts.new",
    group: "request",
    match: { kind: "key", key: "n", meta: true },
  },
  {
    id: "tab-new",
    keys: ["⌘", "T"],
    guideKeys: "⌘ T",
    labelKey: "settings.shortcuts.tabNew",
    group: "tabs",
    // shiftAny: true — the App handler reopens last closed on ⌘⇧T
    // and falls back to new-tab if the reopen stack is empty, so a
    // single bound case handles both modifier states.
    match: { kind: "key", key: "t", meta: true, shiftAny: true },
  },
  {
    id: "tab-close",
    keys: ["⌘", "W"],
    guideKeys: "⌘ W",
    labelKey: "settings.shortcuts.tabClose",
    group: "tabs",
    match: { kind: "key", key: "w", meta: true },
  },
  {
    id: "tab-reopen",
    keys: ["⌘", "⇧", "T"],
    guideKeys: "⌘ ⇧ T",
    labelKey: "settings.shortcuts.tabReopen",
    group: "tabs",
    // Same combo as tab-new + shift; surfaced as its own entry for
    // the Settings list. The App handler routes via the `tab-new`
    // case (shiftAny) so this entry's `match` is informational —
    // shaped strictly so it never matches first.
    match: { kind: "key", key: "T", meta: true, shift: true },
  },
  {
    id: "tab-jump",
    keys: ["⌘", "1‒9"],
    guideKeys: "⌘ 1..9",
    labelKey: "settings.shortcuts.tabJump",
    group: "tabs",
    match: { kind: "key-range", from: "1", to: "9", meta: true },
  },
  {
    id: "tab-cycle",
    keys: ["⌥", "⌘", "→/←"],
    guideKeys: "⌥ ⌘ →",
    labelKey: "settings.shortcuts.tabCycle",
    group: "tabs",
    match: { kind: "arrow", meta: true, alt: true },
  },
  {
    id: "switcher",
    keys: ["⌘", "K / P"],
    guideKeys: "⌘ K / ⌘ P",
    labelKey: "settings.shortcuts.switcher",
    group: "navigation",
    match: { kind: "key", key: "k", keyAlt: "p", meta: true },
  },
  {
    id: "focus-url",
    keys: ["⌘", "L"],
    guideKeys: "⌘ L",
    labelKey: "settings.shortcuts.focusUrl",
    group: "navigation",
    match: { kind: "key", key: "l", meta: true },
  },
  {
    id: "toggle-sidebar",
    keys: ["⌘", "B"],
    guideKeys: "⌘ B",
    labelKey: "settings.shortcuts.toggleSidebar",
    group: "navigation",
    match: { kind: "key", key: "b", meta: true },
  },
  {
    id: "cancel",
    keys: ["⌘", "."],
    guideKeys: "⌘ .",
    labelKey: "settings.shortcuts.cancel",
    group: "request",
    match: { kind: "key", key: ".", meta: true },
  },
  {
    id: "open-settings",
    keys: ["⌘", ","],
    guideKeys: "⌘ ,",
    labelKey: "settings.shortcuts.openSettings",
    group: "navigation",
    match: { kind: "key", key: ",", meta: true },
  },
  {
    id: "open-env",
    keys: ["⌘", "⇧", "E"],
    guideKeys: "⌘ ⇧ E",
    labelKey: "settings.shortcuts.openEnv",
    group: "navigation",
    match: { kind: "key", key: "e", meta: true, shift: true },
  },
  {
    id: "open-guides",
    keys: ["?"],
    guideKeys: "?",
    labelKey: "settings.shortcuts.openGuides",
    group: "navigation",
    match: { kind: "key", key: "?" },
  },
];

export type ShortcutId = (typeof SHORTCUTS)[number]["id"];

// O(1) lookup for the hooks + handler — built once at module load so
// callers don't pay the linear-scan cost on every keystroke.
export const SHORTCUT_BY_ID: Readonly<Record<string, Shortcut>> = Object.fromEntries(
  SHORTCUTS.map((s) => [s.id, s])
);

// Predicate-style matcher: does this KeyboardEvent fire this combo?
// Lives here (not inside the consumers) so the matching logic is the
// single shared place reviewers look at when reasoning about why a
// keypress did or didn't trigger an action.
export function matchesShortcut(match: ShortcutMatch, e: KeyboardEvent): boolean {
  // Modifier state common to all variants. `meta || ctrl` reflects the
  // App handler's `cmd = e.metaKey || e.ctrlKey` rule — macOS users
  // hit ⌘, every other platform falls back to Ctrl.
  const metaOrCtrl = e.metaKey || e.ctrlKey;
  if (match.kind === "key") {
    if (match.meta && !metaOrCtrl) return false;
    if (match.meta === false && metaOrCtrl) return false;
    if (match.alt !== undefined && !!e.altKey !== match.alt) return false;
    if (match.ctrl !== undefined && !!e.ctrlKey !== match.ctrl) return false;
    if (!match.shiftAny && match.shift !== undefined && !!e.shiftKey !== match.shift) return false;
    const k = e.key.toLowerCase();
    const want = match.key.toLowerCase();
    const wantAlt = match.keyAlt?.toLowerCase();
    return k === want || (wantAlt !== undefined && k === wantAlt);
  }
  if (match.kind === "key-range") {
    if (match.meta && !metaOrCtrl) return false;
    return e.key >= match.from && e.key <= match.to;
  }
  // kind === "arrow"
  if (match.meta && !metaOrCtrl) return false;
  if (match.alt && !e.altKey) return false;
  return e.key === "ArrowRight" || e.key === "ArrowLeft";
}
