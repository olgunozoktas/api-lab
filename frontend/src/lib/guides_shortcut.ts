/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect } from "react";

// Hook — bind the `?` key globally to open the guide hub. Skips when
// focus is in an editable element so users can still type literal
// "?" into URL / body / search fields.
export function useGuideShortcut(onTrigger: () => void): void {
  useEffect(() => {
    function isEditable(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function handler(e: KeyboardEvent) {
      // Only react to plain "?" (Shift+/ on US layout). Modifier keys
      // (cmd/ctrl/alt) skip — they belong to other shortcuts.
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      onTrigger();
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [onTrigger]);
}
