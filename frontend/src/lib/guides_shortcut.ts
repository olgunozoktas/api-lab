/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect } from "react";
import { SHORTCUT_BY_ID, matchesShortcut } from "./shortcuts";

// Hook — bind the `?` key globally to open the guide hub. Skips when
// focus is in an editable element so users can still type literal
// "?" into URL / body / search fields. The combo is defined by the
// SHORTCUTS entry id="open-guides" — the binding-drift test asserts
// this file references that id, so the data module stays the source
// of truth.
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
      // Modifier keys (cmd/ctrl/alt) skip — they belong to other
      // shortcuts. matchesShortcut only enforces what's in the
      // descriptor, so we guard the extras explicitly.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!matchesShortcut(SHORTCUT_BY_ID["open-guides"].match, e)) return;
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
