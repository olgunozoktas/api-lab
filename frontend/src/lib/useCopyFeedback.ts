/** Olgun Özoktaş geliştirdi · API Lab */
import { useCallback, useEffect, useRef, useState } from "react";

// Hook — tracks a transient "just-copied" UI state. Call `flash()`
// when the clipboard write completes; `copied` flips to true and
// auto-clears after `durationMs`. The previous timer is cleared on
// every new flash so back-to-back copies feel responsive instead of
// stale. Used by buttons that want a Copy→Check icon swap; toasts
// stay the canonical confirmation channel.
export function useCopyFeedback(durationMs = 1200): {
  copied: boolean;
  flash: () => void;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const flash = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, durationMs);
  }, [durationMs]);
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);
  return { copied, flash };
}
