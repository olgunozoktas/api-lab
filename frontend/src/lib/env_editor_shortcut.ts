/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect } from "react";

// Hook — bind ⌘+Shift+E globally to open the Environments editor.
// Mirrors `useSettingsShortcut` (⌘+,) in scope: works everywhere,
// including inside text fields, since this keystroke never produces
// a useful character. Shift-prefixed to stay clear of macOS-native
// ⌘+E ("Use Selection for Find") that WebKit honors in editable
// fields.
export function useEnvEditorShortcut(onTrigger: () => void): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "e" || !e.metaKey || !e.shiftKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      onTrigger();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger]);
}
