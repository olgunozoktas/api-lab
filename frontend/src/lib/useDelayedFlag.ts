/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useRef, useState } from "react";

// Delay-show threshold. Returns `true` only once `active` has stayed
// true continuously for `delayMs`, and drops to `false` the instant
// `active` clears. Use it to gate loading skeletons so a fast
// (sub-threshold) operation never flickers a placeholder on screen.
export function useDelayedFlag(active: boolean, delayMs = 140): boolean {
  const [elapsed, setElapsed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return;
    }
    timer.current = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer.current);
  }, [active, delayMs]);

  return active && elapsed;
}
