/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect } from "react";

// Hook — bind the macOS-standard ⌘+, (Cmd+Comma) shortcut globally
// to open the Settings modal. Mirrors `useGuideShortcut` for the
// `?` key. Unlike the guides hook, this one does NOT skip editable
// elements: ⌘+, is universally claimed by "Preferences" on macOS
// and never produces a useful character in a text field, so users
// expect it to work even while typing.
export function useSettingsShortcut(onTrigger: () => void): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== "," || !e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      onTrigger();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger]);
}
