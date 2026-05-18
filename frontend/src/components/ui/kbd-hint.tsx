/** Olgun Özoktaş geliştirdi · API Lab */
import type React from "react";

// Tiny faded kbd hint rendered inside an action button — reminds
// the user there's a shortcut for what they're clicking without
// stealing visual weight from the primary label. Marked aria-hidden
// because the shortcut is also announced via the button's title /
// aria-label, and screen readers shouldn't read the glyph twice.
export function KbdHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="ml-1 px-1 py-px rounded text-3xs font-mono bg-black/10 text-current/70 opacity-70"
      aria-hidden
    >
      {children}
    </kbd>
  );
}
