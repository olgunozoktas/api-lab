/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect } from "react";
import { SHORTCUT_BY_ID, matchesShortcut } from "./shortcuts";

// Hook — bind ⌘+Shift+E globally to open the Environments editor.
// Mirrors `useSettingsShortcut` (⌘+,) in scope: works everywhere,
// including inside text fields, since this keystroke never produces
// a useful character. Shift-prefixed to stay clear of macOS-native
// ⌘+E ("Use Selection for Find") that WebKit honors in editable
// fields. Bound via id="open-env".
export function useEnvEditorShortcut(onTrigger: () => void): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey) return;
      if (!matchesShortcut(SHORTCUT_BY_ID["open-env"].match, e)) return;
      e.preventDefault();
      onTrigger();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger]);
}
