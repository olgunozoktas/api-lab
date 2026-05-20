/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect } from "react";
import { SHORTCUT_BY_ID, matchesShortcut } from "./shortcuts";

// Hook — bind the macOS-standard ⌘+, (Cmd+Comma) shortcut globally
// to open the Settings modal. Mirrors `useGuideShortcut` for the
// `?` key. Unlike the guides hook, this one does NOT skip editable
// elements: ⌘+, is universally claimed by "Preferences" on macOS
// and never produces a useful character in a text field, so users
// expect it to work even while typing. Bound via id="open-settings".
export function useSettingsShortcut(onTrigger: () => void): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.altKey || e.shiftKey) return;
      if (!matchesShortcut(SHORTCUT_BY_ID["open-settings"].match, e)) return;
      e.preventDefault();
      onTrigger();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger]);
}
